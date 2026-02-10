import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { Namespace } from "socket.io";
import prisma from "../../utils/prisma.js";

// Reuse the physics engine from the main Pong module to ensure identical gameplay feel
import {
  createInitialState,
  stepServerGame,
  toSnapshot,
  type MatchInputs,
  type ServerGameState,
} from "./pongServer.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerProfile,
  Side,
  GameSnapshot,
} from "../../../shared/pong/gameTypes.js";

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

type SocketData = {
  profile?: PlayerProfile;
  matchId?: string;
  side?: Side;
  userId?: number;
};

type PongSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type PongNS = Namespace<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

interface Match {
  id: string;
  left: PongSocket | null;
  right: PongSocket | null;
  leftProfile: PlayerProfile;
  rightProfile: PlayerProfile;
  state: ServerGameState;
  inputs: MatchInputs;
  loop: NodeJS.Timeout | null;
  // Reconnection state tracking
  leftDisconnectedAt: number | null;
  rightDisconnectedAt: number | null;
  reconnectTimeout: NodeJS.Timeout | null;
  isPaused: boolean;
  startTime: number;
  isEnding: boolean;
}

const RECONNECT_TIMEOUT_MS = 15000;
const finishedGames = new Set<string>();

// ============================================================================
// 2. MAIN MODULE INITIALIZATION
// ============================================================================

export function init_pong_private(io: SocketIOServer, fastify: FastifyInstance) {
  // Use a separate namespace to isolate Private Invites from the Public Queue
  const pong = io.of("/pong-private") as PongNS;

  // Lobbies: Players waiting for their friend to arrive (Key: inviteId)
  const privateLobbies = new Map<string, PongSocket>(); 
  
  // Matches: Active games currently in progress (Key: inviteId/matchId)
  const matches = new Map<string, Match>();

  // --------------------------------------------------------------------------
  // Middleware: Authentication
  // --------------------------------------------------------------------------
  pong.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = fastify.jwt.verify(token) as { id: number };
      socket.data.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  // --------------------------------------------------------------------------
  // Connection Handler
  // --------------------------------------------------------------------------
  pong.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "[pong-private] connected");

    // 1. MATCH JOIN HANDLER
    // Triggered when a user accepts an invite or follows a game link
    socket.on("match.join", async (payload?: { inviteId?: string }) => {
      const userId = socket.data.userId;
      const inviteId = payload?.inviteId;

      if (!userId || !inviteId) {
        socket.emit("match.error", { message: "Invalid join request" });
        return;
      }
      if (finishedGames.has(inviteId)) {
         socket.emit("match.error", { message: "Game has already finished." });
         return;
      }

      // Fetch user profile from DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, avatarUrl: true },
      });
      if (!user) return;

      const profile: PlayerProfile = {
        id: user.id,
        nickname: user.username,
        avatarUrl: user.avatarUrl ?? undefined,
      };
      socket.data.profile = profile;

      // CASE A: Match already exists (Reconnection attempt)
      if (matches.has(inviteId)) {
         await handleReconnect(socket, matches.get(inviteId)!, profile.id);
         return;
      }

      // CASE B: Opponent is already waiting in the lobby
      if (privateLobbies.has(inviteId)) {
        const opponentSocket = privateLobbies.get(inviteId)!;

        // Prevent double joining or self-play
        if (opponentSocket.id === socket.id) return;
        
        // If opponent socket died while waiting, clean it up
        if (!opponentSocket.connected) {
            privateLobbies.delete(inviteId); 
            privateLobbies.set(inviteId, socket); 
            socket.emit("match.waiting");
            return;
        }

        // Start the game!
        privateLobbies.delete(inviteId);
        createMatch(opponentSocket, socket, inviteId);
      } else {
        // CASE C: First player to arrive. Wait in lobby.
        privateLobbies.set(inviteId, socket);
        socket.emit("match.waiting");
      }
    });

    // 2. INPUT HANDLER
    // Receives key presses (Up/Down) from clients
    socket.on("input.update", (payload) => {
      const matchId = socket.data.matchId;
      const side = socket.data.side;
      if (!matchId || !side) return;
      const match = matches.get(matchId);
      if (match && !match.isPaused) {
        match.inputs[side].up = !!payload.up;
        match.inputs[side].down = !!payload.down;
      }
    });

    // 3. SURRENDER HANDLER
    // Triggered when a player explicitly clicks "Leave" or "Surrender"
    socket.on("match.surrender", () => {
      const matchId = socket.data.matchId;
      if (!matchId) return;

      const match = matches.get(matchId);
      if (!match) return;

      const side = socket.data.side;
      // Determine winner (Opposite of who surrendered)
      const winnerSide = side === "left" ? "right" : "left";

      endMatch(match, winnerSide, "surrender", { surrenderingSide: side });
    });

    // 4. LEAVE HANDLER
    // Triggered when navigating away from the page
    socket.on("match.leave", () => {
      // If waiting in lobby, just remove them
      for (const [id, s] of privateLobbies.entries()) {
          if (s.id === socket.id) {
              privateLobbies.delete(id);
              return; 
          }
      }

      // If in active match, treat as surrender
      const matchId = socket.data.matchId;
      if (matchId && matches.has(matchId)) {
        const match = matches.get(matchId)!;
        const side = socket.data.side;
        const winnerSide = side === "left" ? "right" : "left";
        endMatch(match, winnerSide, "surrender", { surrenderingSide: side });
      }
    });

    // 5. DISCONNECT HANDLER
    // Triggered on tab close or internet loss
    socket.on("disconnect", (reason) => {
        // Remove from waiting lobby if present
        for (const [id, s] of privateLobbies.entries()) {
            if (s.id === socket.id) {
                privateLobbies.delete(id);
                break;
            }
        }
        handleDisconnect(socket, reason);
    });
  });

  // ==========================================================================
  // 3. GAME LOGIC & HELPER FUNCTIONS
  // ==========================================================================

  // Initializes a new match, sets up physics loop, and notifies players
  async function createMatch(leftSocket: PongSocket, rightSocket: PongSocket, id: string) {
    const state = createInitialState();
    state.phase = "countdown";

    const inputs: MatchInputs = {
      left: { up: false, down: false },
      right: { up: false, down: false },
    };

    const match: Match = {
      id,
      left: leftSocket,
      right: rightSocket,
      leftProfile: leftSocket.data.profile!,
      rightProfile: rightSocket.data.profile!,
      state,
      inputs,
      loop: null,
      leftDisconnectedAt: null,
      rightDisconnectedAt: null,
      reconnectTimeout: null,
      isPaused: false,
      startTime: Date.now(),
      isEnding: false,
    };

    // Start the physics loop (60 FPS)
    match.loop = setInterval(() => tickMatch(match), 1000 / 60);
    matches.set(id, match);

    // Attach match data to sockets
    leftSocket.data.matchId = id; leftSocket.data.side = "left";
    rightSocket.data.matchId = id; rightSocket.data.side = "right";

    // Fetch historical stats for the HUD
    const [leftStats, rightStats] = await Promise.all([
      getPlayerStats(leftSocket.data.profile!.id),
      getPlayerStats(rightSocket.data.profile!.id),
    ]);

    // Send "Match Found" signal with full profile data
    leftSocket.emit("match.found", {
      matchId: id,
      side: "left",
      opponent: rightSocket.data.profile!,
      player: leftSocket.data.profile!,
      playerStats: leftStats,
      opponentStats: rightStats,
    });

    rightSocket.emit("match.found", {
      matchId: id,
      side: "right",
      opponent: leftSocket.data.profile!,
      player: rightSocket.data.profile!,
      playerStats: rightStats,
      opponentStats: leftStats,
    });

    fastify.log.info({ matchId: id }, "[pong-private] match created");
  }

  // Physics Loop: Updates game state and sends snapshots to clients
  function tickMatch(match: Match) {
    if (match.isPaused || match.isEnding) return;
    
    // Step the physics engine
    stepServerGame(match.state, match.inputs, 1 / 60);

    const snapshot = toSnapshot(match.state);
    match.left?.emit("game.state", snapshot);
    match.right?.emit("game.state", snapshot);

    // Check if score limit reached
    if (match.state.phase === "gameover" && match.state.winner) {
      endMatch(match, match.state.winner, "score");
    }
  }

  // Handles player reconnection logic
  async function handleReconnect(socket: PongSocket, match: Match, playerId: number) {
      const side = match.leftProfile.id === playerId ? "left" : "right";
      
      // Reattach socket
      if(side === "left") { match.left = socket; match.leftDisconnectedAt = null; }
      else { match.right = socket; match.rightDisconnectedAt = null; }
      
      socket.data.matchId = match.id;
      socket.data.side = side;

      // Resume game if both players are present
      if(!match.leftDisconnectedAt && !match.rightDisconnectedAt) match.isPaused = false;

      socket.emit("match.reconnected", {
          matchId: match.id,
          side,
          snapshot: toSnapshot(match.state),
          player: side === "left" ? match.leftProfile : match.rightProfile,
          opponent: side === "left" ? match.rightProfile : match.leftProfile,
          playerStats: { wins: 0, losses: 0, winrate: 0 }, // Simplified for reconnect
          opponentStats: { wins: 0, losses: 0, winrate: 0 }
      });
  }

  // Database Query: Counts wins and total games to calculate winrate
  async function getPlayerStats(playerId: number) {
    const [wins, losses] = await Promise.all([
      prisma.pongMatch.count({ where: { winnerId: playerId } }),
      prisma.pongMatch.count({
        where: {
          OR: [{ leftPlayerId: playerId }, { rightPlayerId: playerId }],
          NOT: { winnerId: playerId },
        },
      }),
    ]);

    const totalGames = wins + losses;
    const winrate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    return { wins, losses, winrate };
  }

  // Database Write: Saves the match result to Postgres
  async function saveMatchResult(match: Match, winnerSide: Side, reason: string) {
    const leftPlayerId = match.leftProfile.id;
    const rightPlayerId = match.rightProfile.id;
    const winnerId = winnerSide === "left" ? leftPlayerId : rightPlayerId;
    const duration = Math.floor((Date.now() - match.startTime) / 1000);

    try {
      await prisma.pongMatch.create({
        data: {
          leftPlayerId,
          rightPlayerId,
          winnerId,
          leftScore: match.state.left.score,
          rightScore: match.state.right.score,
          reason: String(reason),
          duration,
        },
      });
      fastify.log.info({ matchId: match.id }, "[pong-private] Match result saved to DB");
    } catch (err) {
      fastify.log.error({ err, matchId: match.id }, "[pong-private] Failed to save result");
    }
  }

  // Handles involuntary disconnection (timeout logic)
  function handleDisconnect(socket: PongSocket, reason: string) {
      const matchId = socket.data.matchId;
      if (!matchId) return;
      const match = matches.get(matchId);
      if (!match || match.isEnding) return;

      const side = socket.data.side!;
      const isLeft = side === "left";
      
      // Pause Game
      match.isPaused = true;
      if(isLeft) { match.left = null; match.leftDisconnectedAt = Date.now(); }
      else { match.right = null; match.rightDisconnectedAt = Date.now(); }

      const opponent = isLeft ? match.right : match.left;
      opponent?.emit("opponent.connectionLost", { timeout: RECONNECT_TIMEOUT_MS });

      // Start Reconnect Timer
      if(match.reconnectTimeout) clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = setTimeout(() => {
          const winnerSide = isLeft ? "right" : "left";
          endMatch(match, winnerSide, "disconnect");
      }, RECONNECT_TIMEOUT_MS);
  }

  // Finalizes the match, notifies clients, and cleans up memory
  function endMatch(match: Match, winnerSide: Side, reason: any, options?: { surrenderingSide?: Side }) {
      if (match.isEnding) return;
      match.isEnding = true;
      if(match.loop) clearInterval(match.loop);
      
      const payload = {
          matchId: match.id,
          winnerSide,
          leftScore: match.state.left.score,
          rightScore: match.state.right.score,
          reason
      };

      // Notify clients based on how the game ended
      if (reason === "surrender" && options?.surrenderingSide) {
          const surrenderingSocket = options.surrenderingSide === "left" ? match.left : match.right;
          const winnerSocket = options.surrenderingSide === "left" ? match.right : match.left;
          surrenderingSocket?.emit("match.surrendered", { matchId: match.id });
          winnerSocket?.emit("opponent.surrendered");
          winnerSocket?.emit("game.over", payload);
      } else {
          match.left?.emit("game.over", payload);
          match.right?.emit("game.over", payload);
      }
      
      // Save to database
      finishedGames.add(match.id);
      setTimeout(() => finishedGames.delete(match.id), 5 * 60 * 1000);
      void saveMatchResult(match, winnerSide, reason);
      
      // Remove from memory
      matches.delete(match.id);
  }
}
