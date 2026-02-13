import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer } from "socket.io";
import prisma from "../../utils/prisma.js";

import {
  createInitialState,
  stepServerGame,
  toSnapshot,
  type MatchInputs,
} from "./pongServer.js";

import type {
  PlayerProfile,
  Side,
} from "../../../shared/pong/gameTypes.js";


import {
  type Match,
  type PongSocket,
  type PongNS,
  getPlayerStats,
  saveMatchResult,
  RECONNECT_TIMEOUT_MS
} from "./pong.js";

const finishedGames = new Set<string>();

export function init_pong_private(io: SocketIOServer, fastify: FastifyInstance) {
  const pong = io.of("/pong-private") as PongNS;
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

      if (matches.has(inviteId)) {
         await handleReconnect(socket, matches.get(inviteId)!, profile.id);
         return;
      }

      if (privateLobbies.has(inviteId)) {
        const opponentSocket = privateLobbies.get(inviteId)!;
        if (opponentSocket.id === socket.id) return;
        
        if (!opponentSocket.connected) {
            privateLobbies.delete(inviteId); 
            privateLobbies.set(inviteId, socket); 
            socket.emit("match.waiting");
            return;
        }
        privateLobbies.delete(inviteId);
        createMatch(opponentSocket, socket, inviteId);
      } else {
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

    socket.on("match.surrender", () => {
      const matchId = socket.data.matchId;
      if (!matchId || !matches.has(matchId)) return;
      const match = matches.get(matchId)!;
      const side = socket.data.side;
      const winnerSide = side === "left" ? "right" : "left";
      endMatch(match, winnerSide, "surrender", { surrenderingSide: side });
    });

    socket.on("match.leave", () => {
      for (const [id, s] of privateLobbies.entries()) {
          if (s.id === socket.id) {
              privateLobbies.delete(id);
              return; 
          }
      }
      const matchId = socket.data.matchId;
      if (matchId && matches.has(matchId)) {
        const match = matches.get(matchId)!;
        const side = socket.data.side;
        const winnerSide = side === "left" ? "right" : "left";
        endMatch(match, winnerSide, "surrender", { surrenderingSide: side });
      }
    });

    socket.on("disconnect", (reason) => {
        for (const [id, s] of privateLobbies.entries()) {
            if (s.id === socket.id) {
                privateLobbies.delete(id);
                break;
            }
        }
        handleDisconnect(socket, reason);
    });
  });

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

    // 👇 IMPORTED HELPER
    const [leftStats, rightStats] = await Promise.all([
      getPlayerStats(leftSocket.data.profile!.id),
      getPlayerStats(rightSocket.data.profile!.id),
    ]);

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

  function tickMatch(match: Match) {
    if (match.isPaused || match.isEnding) return;
    
    stepServerGame(match.state, match.inputs, 1 / 60);

    const snapshot = toSnapshot(match.state);
    match.left?.emit("game.state", snapshot);
    match.right?.emit("game.state", snapshot);

    if (match.state.phase === "gameover" && match.state.winner) {
      endMatch(match, match.state.winner, "score");
    }
  }

  async function handleReconnect(socket: PongSocket, match: Match, playerId: number) {
      const side = match.leftProfile.id === playerId ? "left" : "right";
      
      if(side === "left") { match.left = socket; match.leftDisconnectedAt = null; }
      else { match.right = socket; match.rightDisconnectedAt = null; }
      
      socket.data.matchId = match.id;
      socket.data.side = side;

      if(!match.leftDisconnectedAt && !match.rightDisconnectedAt) match.isPaused = false;

      // 👇 IMPORTED HELPER (Used for reconnect stats too)
      const [playerStats, opponentStats] = await Promise.all([
        getPlayerStats(side === "left" ? match.leftProfile.id : match.rightProfile.id),
        getPlayerStats(side === "left" ? match.rightProfile.id : match.leftProfile.id),
      ]);

      socket.emit("match.reconnected", {
          matchId: match.id,
          side,
          snapshot: toSnapshot(match.state),
          player: side === "left" ? match.leftProfile : match.rightProfile,
          opponent: side === "left" ? match.rightProfile : match.leftProfile,
          playerStats,
          opponentStats
      });
  }

  function handleDisconnect(socket: PongSocket, reason: string) {
      const matchId = socket.data.matchId;
      if (!matchId) return;
      const match = matches.get(matchId);
      if (!match || match.isEnding) return;

      const side = socket.data.side!;
      const isLeft = side === "left";
      
      match.isPaused = true;
      if(isLeft) { match.left = null; match.leftDisconnectedAt = Date.now(); }
      else { match.right = null; match.rightDisconnectedAt = Date.now(); }

      const opponent = isLeft ? match.right : match.left;
      opponent?.emit("opponent.connectionLost", { timeout: RECONNECT_TIMEOUT_MS });

      if(match.reconnectTimeout) clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = setTimeout(() => {
          const winnerSide = isLeft ? "right" : "left";
          endMatch(match, winnerSide, "disconnect");
      }, RECONNECT_TIMEOUT_MS);
  }

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
      
      finishedGames.add(match.id);
      setTimeout(() => finishedGames.delete(match.id), 5 * 60 * 1000);
      
      // 👇 IMPORTED HELPER
      void saveMatchResult(fastify, match, winnerSide, reason);
      
      matches.delete(match.id);
  }
}