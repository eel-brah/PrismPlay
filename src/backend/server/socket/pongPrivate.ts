import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { Namespace } from "socket.io";
import prisma from "src/backend/utils/prisma";

// We reuse the SAME physics engine as your friend so the game feels identical
import {
  createInitialState,
  stepServerGame,
  toSnapshot,
  type MatchInputs,
  type ServerGameState,
} from "./pongServer";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerProfile,
  Side,
  GameSnapshot,
} from "../../../shared/pong/gameTypes";

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
  leftDisconnectedAt: number | null;
  rightDisconnectedAt: number | null;
  reconnectTimeout: NodeJS.Timeout | null;
  isPaused: boolean;
  startTime: number;
  isEnding: boolean;
}

const RECONNECT_TIMEOUT_MS = 15000;

export function init_pong_private(io: SocketIOServer, fastify: FastifyInstance) {
  // 1. DIFFERENT NAMESPACE to avoid conflicts
  const pong = io.of("/pong-private") as PongNS;

  // 2. LOBBY MAP instead of Queue Array
  // Key: inviteId (UUID), Value: The socket of the first player waiting
  const privateLobbies = new Map<string, PongSocket>(); 
  
  const matches = new Map<string, Match>();

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

  pong.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "[pong-private] connected");

    // 3. LISTEN FOR JOIN WITH INVITE ID
    socket.on("match.join", async (payload?: { inviteId?: string }) => {
      const userId = socket.data.userId;
      const inviteId = payload?.inviteId;

      if (!userId || !inviteId) {
        socket.emit("match.error", { message: "Invalid join request" });
        return;
      }

      // Load Profile
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

      // A. Check Reconnection (Existing Match)
      // (Simplified logic: if match exists with this ID, reconnect)
      if (matches.has(inviteId)) {
         await handleReconnect(socket, matches.get(inviteId)!, profile.id);
         return;
      }

      // B. Check Lobbies (Is my opponent waiting?)
      if (privateLobbies.has(inviteId)) {
        const opponentSocket = privateLobbies.get(inviteId)!;

        // Prevent self-play or double join
        if (opponentSocket.id === socket.id) return;
        if (!opponentSocket.connected) {
            privateLobbies.delete(inviteId); // Clean stale lobby
            privateLobbies.set(inviteId, socket); // I become the waiter
            socket.emit("match.waiting");
            return;
        }

        // START GAME
        privateLobbies.delete(inviteId);
        createMatch(opponentSocket, socket, inviteId);
      } else {
        // C. I am the first one here. Wait.
        privateLobbies.set(inviteId, socket);
        socket.emit("match.waiting");
      }
    });

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

  // --- GAME LOGIC (Copied from pong.ts but simplified for private) ---

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

    match.loop = setInterval(() => tickMatch(match), 1000 / 60);
    matches.set(id, match);

    leftSocket.data.matchId = id; leftSocket.data.side = "left";
    rightSocket.data.matchId = id; rightSocket.data.side = "right";

    // Mock stats for now (or import getPlayerStats if you want)
    const stats = { wins: 0, losses: 0, winrate: 0 };

    leftSocket.emit("match.found", {
      matchId: id,
      side: "left",
      opponent: rightSocket.data.profile!,
      player: leftSocket.data.profile!,
      playerStats: stats,
      opponentStats: stats,
    });

    rightSocket.emit("match.found", {
      matchId: id,
      side: "right",
      opponent: leftSocket.data.profile!,
      player: rightSocket.data.profile!,
      playerStats: stats,
      opponentStats: stats,
    });

    fastify.log.info({ matchId: id }, "[pong-private] match created");
  }

  function tickMatch(match: Match) {
    if (match.isPaused || match.isEnding) return;
    
    // Reuse Physics from friend's code
    stepServerGame(match.state, match.inputs, 1 / 60);

    const snapshot = toSnapshot(match.state);
    match.left?.emit("game.state", snapshot);
    match.right?.emit("game.state", snapshot);

    if (match.state.phase === "gameover" && match.state.winner) {
      endMatch(match, match.state.winner, "score");
    }
  }

  async function handleReconnect(socket: PongSocket, match: Match, playerId: number) {
      // (Copy reconnection logic from pong.ts if needed, simplified here)
      const side = match.leftProfile.id === playerId ? "left" : "right";
      if(side === "left") { match.left = socket; match.leftDisconnectedAt = null; }
      else { match.right = socket; match.rightDisconnectedAt = null; }
      
      socket.data.matchId = match.id;
      socket.data.side = side;
      if(!match.leftDisconnectedAt && !match.rightDisconnectedAt) match.isPaused = false;

      socket.emit("match.reconnected", {
          matchId: match.id,
          side,
          snapshot: toSnapshot(match.state),
          player: side === "left" ? match.leftProfile : match.rightProfile,
          opponent: side === "left" ? match.rightProfile : match.leftProfile,
          playerStats: { wins: 0, losses: 0, winrate: 0 },
          opponentStats: { wins: 0, losses: 0, winrate: 0 }
      });
  }

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

      // Auto-end after timeout (simplified)
      if(match.reconnectTimeout) clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = setTimeout(() => {
          const winnerSide = isLeft ? "right" : "left";
          endMatch(match, winnerSide, "disconnect");
      }, RECONNECT_TIMEOUT_MS);
  }

  function endMatch(match: Match, winnerSide: Side, reason: any) {
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
      match.left?.emit("game.over", payload);
      match.right?.emit("game.over", payload);
      
      void saveMatchResult(match, winnerSide, reason);
      // Save result to DB here if needed
      matches.delete(match.id);
  }
}