import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { Namespace } from "socket.io";
import prisma from "../../utils/prisma";

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

type PongSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  object,
  SocketData
>;

type PongNS = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  object,
  SocketData
>;

interface Match {
  id: string;
  left: PongSocket | null;
  right: PongSocket | null;
  leftProfile: PlayerProfile;
  rightProfile: PlayerProfile;
  state: ServerGameState;
  inputs: MatchInputs;
  loop: NodeJS.Timeout | null;
  // Reconnection state
  leftDisconnectedAt: number | null;
  rightDisconnectedAt: number | null;
  reconnectTimeout: NodeJS.Timeout | null;
  isPaused: boolean;
  startTime: number;
  isEnding: boolean;
  // hasStarted: boolean;
}

const RECONNECT_TIMEOUT_MS = 15000;

export function init_pong(io: SocketIOServer, fastify: FastifyInstance) {
  const pong = io.of("/pong") as PongNS;

  pong.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      fastify.log.warn({ id: socket.id }, "[pong] No token provided");
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = fastify.jwt.verify(token) as { id: number };
      socket.data.userId = decoded.id;
      fastify.log.info(
        { id: socket.id, userId: decoded.id },
        "[pong] User authenticated",
      );
      return next();
    } catch (err) {
      fastify.log.warn({ id: socket.id, error: err }, "[pong] Invalid token");
      return next(new Error("Invalid or expired token"));
    }
  });

  const waitingQueue: PongSocket[] = [];
  const matches = new Map<string, Match>();
  const playerMatchMap = new Map<number, string>();

  let matchCounter = 1;
  const nextMatchId = () => `match_${matchCounter++}`;

  pong.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "[pong] connected");

    socket.on("match.join", async () => {
      const userId = socket.data.userId;

      if (!userId) {
        socket.emit("match.error", { message: "Not authenticated" });
        return;
      }

      // Load canonical profile from DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, avatarUrl: true },
      });

      if (!user) {
        socket.emit("match.error", { message: "User not found" });
        return;
      }

      const profile: PlayerProfile = {
        id: user.id,
        nickname: user.username,
        // email: user.email,
        avatarUrl: user.avatarUrl ?? undefined,
      };

      socket.data.profile = profile;
      fastify.log.info(
        { id: socket.id, PlayerId: profile.id, nickname: profile.nickname },
        "[pong] Player joined matchmaking",
      );

      // Check if Player can reconnect to existing match
      const existingMatchId = playerMatchMap.get(profile.id);
      if (existingMatchId) {
        const match = matches.get(existingMatchId);
        if (
          match &&
          (match.leftDisconnectedAt !== null ||
            match.rightDisconnectedAt !== null)
        ) {
          const side = match.leftProfile.id === profile.id ? "left" : "right";
          const isDisconnected =
            side === "left"
              ? match.leftDisconnectedAt !== null
              : match.rightDisconnectedAt !== null;

          // if (isDisconnected) {
          //   handleReconnect(socket, match, profile.id);
          //   return;
          // }
          if (isDisconnected) {
            await handleReconnect(socket, match, profile.id);
            return;
          }
        }
      }

      const existingInQueue = waitingQueue.findIndex(
        (s) => s.data.profile?.id === profile.id,
      );
      if (existingInQueue >= 0) {
        // Kick the older socket
        const oldSocket = waitingQueue[existingInQueue];
        waitingQueue.splice(existingInQueue, 1);
        oldSocket.emit("match.error", {
          message: "Connected from another tab",
        });
        oldSocket.disconnect();
      }

      waitingQueue.push(socket);
      socket.emit("match.waiting");
      tryMatchmake();
    });

    socket.on("input.update", (payload) => {
      const matchId = socket.data.matchId;
      const side = socket.data.side;
      if (!matchId || !side) return;

      const match = matches.get(matchId);
      if (!match || match.isPaused) return;

      match.inputs[side].up = !!payload.up;
      match.inputs[side].down = !!payload.down;
    });

    socket.on("match.surrender", () => {
      fastify.log.info({ id: socket.id }, "[pong] Player surrendered");
      removeFromQueue(socket);
      const matchId = socket.data.matchId;
      if (!matchId) return;
      const match = matches.get(matchId);
      if (!match) return;

      const side = socket.data.side!;
      const winnerSide: Side = side === "left" ? "right" : "left";

      endMatch(match, winnerSide, "surrender", { surrenderingSide: side });
    });

    socket.on("match.leave", () => {
      fastify.log.info({ id: socket.id }, "[pong] Player left");
      removeFromQueue(socket);
      handleLeave(socket);
    });

    socket.on("disconnect", (reason) => {
      fastify.log.info({ id: socket.id, reason }, "[pong] disconnected");
      removeFromQueue(socket);
      handleDisconnect(socket, reason);
    });
  });

  function removeFromQueue(socket: PongSocket) {
    const idx = waitingQueue.findIndex(
      (s) =>
        s.id === socket.id || s.data.profile?.id === socket.data.profile?.id,
    );
    if (idx >= 0) waitingQueue.splice(idx, 1);
  }

  function tryMatchmake() {
    while (waitingQueue.length >= 2) {
      const a = waitingQueue.shift()!;
      const b = waitingQueue.shift()!;

      // Verify both sockets are still valid
      if (!a.connected || !b.connected || !a.data.profile || !b.data.profile) {
        if (a.connected && a.data.profile) waitingQueue.unshift(a);
        if (b.connected && b.data.profile) waitingQueue.unshift(b);
        continue;
      }

      createMatch(a, b);
    }
  }

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

  async function createMatch(leftSocket: PongSocket, rightSocket: PongSocket) {
    const id = nextMatchId();
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
      // hasStarted: false,
    };

    match.loop = setInterval(() => tickMatch(match), 1000 / 60);

    matches.set(id, match);

    playerMatchMap.set(leftSocket.data.profile!.id, id);
    playerMatchMap.set(rightSocket.data.profile!.id, id);

    leftSocket.data.matchId = id;
    leftSocket.data.side = "left";
    rightSocket.data.matchId = id;
    rightSocket.data.side = "right";

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

    fastify.log.info(
      {
        matchId: id,
        left: leftSocket.data.profile?.nickname,
        right: rightSocket.data.profile?.nickname,
      },
      "[pong] match created",
    );
  }

  async function handleReconnect(
    socket: PongSocket,
    match: Match,
    playerId: number,
  ) {
    const side: Side = match.leftProfile.id === playerId ? "left" : "right";

    const playerProfile =
      side === "left" ? match.leftProfile : match.rightProfile;
    const opponentProfile =
      side === "left" ? match.rightProfile : match.leftProfile;

    fastify.log.info(
      { matchId: match.id, PlayerId: playerId, side },
      "[pong] Player reconnected",
    );

    // Clear reconnect timeout
    if (match.reconnectTimeout) {
      clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = null;
    }

    // Restore socket reference and clear disconnect timestamp
    if (side === "left") {
      match.left = socket;
      match.leftDisconnectedAt = null;
    } else {
      match.right = socket;
      match.rightDisconnectedAt = null;
    }

    socket.data.matchId = match.id;
    socket.data.side = side;

    const bothConnected =
      match.leftDisconnectedAt === null && match.rightDisconnectedAt === null;
    if (bothConnected) {
      match.isPaused = false;
    }

    const opponent = side === "left" ? match.right : match.left;

    const [playerStats, opponentStats] = await Promise.all([
      getPlayerStats(playerProfile.id),
      getPlayerStats(opponentProfile.id),
    ]);

    socket.emit("match.reconnected", {
      matchId: match.id,
      side,
      snapshot: toSnapshot(match.state),
      player: playerProfile,
      opponent: opponentProfile,
      playerStats,
      opponentStats,
    });

    if (opponent) {
      opponent.emit("opponent.reconnected");
    }
  }

  function handleDisconnect(socket: PongSocket, reason: string) {
    const matchId = socket.data.matchId;
    const playerId = socket.data.profile?.id;
    if (!matchId || !playerId) return;

    const match = matches.get(matchId);
    if (!match || match.isEnding) return;

    const side = socket.data.side!;
    const isLeft = side === "left";
    const opponent = isLeft ? match.right : match.left;

    const isConnectionLoss = [
      "transport close",
      "transport error",
      "ping timeout",
    ].includes(reason);

    if (isConnectionLoss && match.state.phase !== "gameover") {
      match.isPaused = true;

      const now = Date.now();
      if (isLeft) {
        match.left = null;
        match.leftDisconnectedAt = now;
      } else {
        match.right = null;
        match.rightDisconnectedAt = now;
      }

      if (opponent) {
        opponent.emit("opponent.connectionLost", {
          timeout: RECONNECT_TIMEOUT_MS,
        });
      }

      // Set/reset timeout for reconnection
      if (match.reconnectTimeout) {
        clearTimeout(match.reconnectTimeout);
      }

      match.reconnectTimeout = setTimeout(() => {
        fastify.log.info(
          { matchId: match.id },
          "[pong] reconnect timeout expired",
        );
        handleReconnectTimeout(match);
      }, RECONNECT_TIMEOUT_MS);

      fastify.log.info(
        { matchId, side, reason },
        "[pong] waiting for reconnection",
      );
    } else {
      // Immediate disconnect
      const winnerSide: Side = isLeft ? "right" : "left";
      endMatch(match, winnerSide, "disconnect");
    }
  }

  function handleReconnectTimeout(match: Match) {
    if (match.isEnding) return;

    const leftDisconnected = match.leftDisconnectedAt !== null;
    const rightDisconnected = match.rightDisconnectedAt !== null;

    if (leftDisconnected && rightDisconnected) {
      const leftTime = match.leftDisconnectedAt!;
      const rightTime = match.rightDisconnectedAt!;

      if (Math.abs(leftTime - rightTime) < 1000) {
        fastify.log.info(
          { matchId: match.id },
          "[pong] Both players disconnected - cancelling match",
        );
        cancelMatch(match);
      } else if (leftTime < rightTime) {
        endMatch(match, "right", "disconnect");
      } else {
        endMatch(match, "left", "disconnect");
      }
    } else if (leftDisconnected) {
      endMatch(match, "right", "disconnect");
    } else if (rightDisconnected) {
      endMatch(match, "left", "disconnect");
    }
  }

  function cancelMatch(match: Match) {
    if (match.isEnding) return;
    match.isEnding = true;

    if (match.loop) {
      clearInterval(match.loop);
      match.loop = null;
    }

    match.left?.emit("match.cancelled");
    match.right?.emit("match.cancelled");

    cleanupMatch(match);
  }

  function handleLeave(socket: PongSocket) {
    const matchId = socket.data.matchId;
    if (!matchId) return;

    const match = matches.get(matchId);
    if (!match || match.isEnding) return;

    // const isPreStartCountdown =
    //   match.state.phase === "countdown" && !match.hasStarted;

    // if (isPreStartCountdown) {
    //   const isLeft = socket.data.side === "left";
    //   const opponent = isLeft ? match.right : match.left;

    //   opponent?.emit("opponent.left");
    //   opponent?.emit("match.cancelled");

    //   cancelMatch(match);
    //   return;
    // }

    const side = socket.data.side!;
    const winnerSide: Side = side === "left" ? "right" : "left";
    endMatch(match, winnerSide, "surrender", { surrenderingSide: side });
  }

  function endMatch(
    match: Match,
    winnerSide: Side,
    reason: "score" | "surrender" | "disconnect",
    options?: { surrenderingSide?: Side },
  ) {
    if (match.isEnding) return;
    
    match.isEnding = true;
    match.isPaused = true;

    if (match.loop) {
      clearInterval(match.loop);
      match.loop = null;
    }

    // Clear any pending reconnect timeout
    if (match.reconnectTimeout) {
      clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = null;
    }

    // Finalize asynchronously
    void finalizeMatch(match, winnerSide, reason, options);
  }

  async function finalizeMatch(
    match: Match,
    winnerSide: Side,
    reason: "score" | "surrender" | "disconnect",
    options?: { surrenderingSide?: Side },
  ) {
    const gameOverPayload = {
      matchId: match.id,
      winnerSide,
      leftScore: match.state.left.score,
      rightScore: match.state.right.score,
      reason,
    };

    // Emit based on reason
    if (reason === "surrender" && options?.surrenderingSide) {
      const surrenderingSide = options.surrenderingSide;
      const surrenderingSocket =
        surrenderingSide === "left" ? match.left : match.right;
      const winnerSocket =
        surrenderingSide === "left" ? match.right : match.left;

      surrenderingSocket?.emit("match.surrendered", { matchId: match.id });
      winnerSocket?.emit("opponent.surrendered");
      winnerSocket?.emit("game.over", gameOverPayload);
    } else if (reason === "disconnect") {
      const winner = winnerSide === "left" ? match.left : match.right;
      winner?.emit("opponent.disconnected");
      winner?.emit("game.over", gameOverPayload);
    } else {
      // Score-based ending
      match.left?.emit("game.over", gameOverPayload);
      match.right?.emit("game.over", gameOverPayload);
    }

    // Save to DB
    await saveMatchResult(match, winnerSide, reason);

    // Final cleanup
    cleanupMatch(match);
  }

  async function saveMatchResult(
    match: Match,
    winnerSide: Side,
    reason: "score" | "surrender" | "disconnect",
  ) {
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
          reason,
          duration,
        },
      });
      fastify.log.info(
        { matchId: match.id, winnerId, reason },
        "[pong] Match result saved",
      );
    } catch (err) {
      fastify.log.error(
        { err, matchId: match.id },
        "[pong] Failed to save match result",
      );
    }
  }

  function tickMatch(match: Match) {
    // Guard: don't tick if paused or ending
    if (match.isPaused || match.isEnding) return;
    // const prevPhase = match.state.phase;
    const dt = 1 / 60;
    stepServerGame(match.state, match.inputs, dt);

    // // ✅ First time we transition countdown -> playing, mark match as started
    // if (
    //   !match.hasStarted &&
    //   prevPhase === "countdown" &&
    //   match.state.phase === "playing"
    // ) {
    //   match.hasStarted = true;
    // }
    const snapshot: GameSnapshot = toSnapshot(match.state);
    match.left?.emit("game.state", snapshot);
    match.right?.emit("game.state", snapshot);

    // Check for game over - use unified endMatch
    if (match.state.phase === "gameover" && match.state.winner) {
      endMatch(match, match.state.winner, "score");
    }
  }

  function cleanupMatch(match: Match) {
    // Loop should already be cleared, but just in case
    if (match.loop) {
      clearInterval(match.loop);
      match.loop = null;
    }

    if (match.reconnectTimeout) {
      clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = null;
    }

    matches.delete(match.id);
    playerMatchMap.delete(match.leftProfile.id);
    playerMatchMap.delete(match.rightProfile.id);

    for (const s of [match.left, match.right]) {
      if (s && s.data.matchId === match.id) {
        s.data.matchId = undefined;
        s.data.side = undefined;
      }
    }

    fastify.log.info({ matchId: match.id }, "[pong] match cleaned up");
  }
}
