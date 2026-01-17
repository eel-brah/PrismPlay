import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { Namespace } from "socket.io";
import prisma from "src/backend/utils/prisma";

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
  userId: number;
};

type PongSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

type PongNS = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
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
  loop: NodeJS.Timeout;
  // Reconnection state
  disconnectedSide: Side | null;
  reconnectTimeout: NodeJS.Timeout | null;
  isPaused: boolean;
  startTime: number;
}

const RECONNECT_TIMEOUT_MS = 15000;

export function init_pong(io: SocketIOServer, fastify: FastifyInstance) {
  const pong = io.of("/pong") as PongNS;

  //jwt authentication middleware
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

  // Map odlayerId (odlayer.id from profile) -> matchId for reconnection
  const playerMatchMap = new Map<number, string>();

  let matchCounter = 1;
  const nextMatchId = () => `match_${matchCounter++}`;

  pong.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "[pong] connected");

    socket.on("match.join", (profile) => {
      const profileId = profile.id;
      if (profileId !== socket.data.userId) {
        fastify.log.warn(
          { id: socket.id, profileId, userId: socket.data.userId },
          "[pong] Profile ID mismatch - possible impersonation attempt",
        );
        socket.emit("error", {
          message: "Profile ID does not match authenticated user",
        });
        return;
      }

      socket.data.profile = profile;
      fastify.log.info(
        { id: socket.id, odlayerId: profile.id, nickname: profile.nickname },
        "[pong] odlayer joined matchmaking",
      );

      // Check if odlayer can reconnect to existing match
      const existingMatchId = playerMatchMap.get(profile.id);
      if (existingMatchId) {
        const match = matches.get(existingMatchId);
        if (match && match.disconnectedSide) {
          handleReconnect(socket, match, profile.id);
          return;
        }
      }

      // Avoid duplicates in queue
      if (waitingQueue.some((s) => s.data.profile?.id === profile.id)) return;

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

    // Surrender - odlayer intentionally leaves
    socket.on("match.surrender", () => {
      fastify.log.info({ id: socket.id }, "[pong] odlayer surrendered");
      removeFromQueue(socket);
      handleSurrender(socket);
    });

    // Leave queue or match (intentional)
    socket.on("match.leave", () => {
      fastify.log.info({ id: socket.id }, "[pong] odlayer left");
      removeFromQueue(socket);
      handleLeave(socket);
    });

    // Disconnect - could be connection loss
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
      createMatch(a, b);
    }
  }

  function createMatch(leftSocket: PongSocket, rightSocket: PongSocket) {
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
      loop: setInterval(() => tickMatch(match), 1000 / 60),
      disconnectedSide: null,
      reconnectTimeout: null,
      isPaused: false,
      startTime: Date.now(),
    };

    matches.set(id, match);

    // Track odlayers for reconnection
    playerMatchMap.set(leftSocket.data.profile!.id, id);
    playerMatchMap.set(rightSocket.data.profile!.id, id);

    leftSocket.data.matchId = id;
    leftSocket.data.side = "left";
    rightSocket.data.matchId = id;
    rightSocket.data.side = "right";

    leftSocket.emit("match.found", {
      matchId: id,
      side: "left",
      opponent: rightSocket.data.profile!,
    });

    rightSocket.emit("match.found", {
      matchId: id,
      side: "right",
      opponent: leftSocket.data.profile!,
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

  function handleReconnect(socket: PongSocket, match: Match, playerId: number) {
    const side = match.leftProfile.id === playerId ? "left" : "right";
    const opponentProfile =
      side === "left" ? match.rightProfile : match.leftProfile;

    fastify.log.info(
      { matchId: match.id, odlayerId: playerId, side },
      "[pong] odlayer reconnected",
    );

    // Clear reconnect timeout
    if (match.reconnectTimeout) {
      clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = null;
    }

    // Restore socket reference
    if (side === "left") {
      match.left = socket;
    } else {
      match.right = socket;
    }

    socket.data.matchId = match.id;
    socket.data.side = side;
    match.disconnectedSide = null;
    match.isPaused = false;

    // Notify both odlayers
    const opponent = side === "left" ? match.right : match.left;

    socket.emit("match.reconnected", {
      matchId: match.id,
      side,
      snapshot: toSnapshot(match.state),
      opponent: opponentProfile,
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
    if (!match) return;

    const side = socket.data.side!;
    const isLeft = side === "left";
    const opponent = isLeft ? match.right : match.left;

    // Check if this is likely a connection loss (not intentional)
    const isConnectionLoss = [
      "transport close",
      "transport error",
      "ping timeout",
    ].includes(reason);

    if (isConnectionLoss && match.state.phase !== "gameover") {
      // Pause match and wait for reconnection
      match.isPaused = true;
      match.disconnectedSide = side;

      if (isLeft) {
        match.left = null;
      } else {
        match.right = null;
      }

      // Notify opponent
      if (opponent) {
        opponent.emit("opponent.connectionLost", {
          timeout: RECONNECT_TIMEOUT_MS,
        });
      }

      // Set timeout for reconnection
      if (match.reconnectTimeout) {
        clearTimeout(match.reconnectTimeout);
        match.reconnectTimeout = null;
      }
      match.reconnectTimeout = setTimeout(() => {
        fastify.log.info(
          { matchId: match.id, side },
          "[pong] reconnect timeout expired",
        );
        endMatchDueToDisconnect(match, side);
      }, RECONNECT_TIMEOUT_MS);

      fastify.log.info(
        { matchId, side, reason },
        "[pong] waiting for reconnection",
      );
    } else {
      // Immediate disconnect (odlayer closed tab, etc.)
      endMatchDueToDisconnect(match, side);
    }
  }

  async function handleSurrender(socket: PongSocket) {
    const matchId = socket.data.matchId;
    if (!matchId) return;

    const match = matches.get(matchId);
    if (!match) return;

    const side = socket.data.side!;
    const isLeft = side === "left";
    const opponent = isLeft ? match.right : match.left;
    const winnerSide: Side = isLeft ? "right" : "left";

    // Notify surrendering odlayer
    socket.emit("match.surrendered", { matchId });

    // Notify opponent they won by surrender
    if (opponent) {
      opponent.emit("opponent.surrendered");
      opponent.emit("game.over", {
        matchId,
        winnerSide,
        leftScore: match.state.left.score,
        rightScore: match.state.right.score,
        reason: "surrender",
      });
    }
    await saveMatchResult(match, winnerSide, "surrender");
    cleanupMatch(match);
  }

  async function handleLeave(socket: PongSocket) {
    const matchId = socket.data.matchId;
    if (!matchId) return;

    const match = matches.get(matchId);
    if (!match) return;

    // If game hasn't started, just cleanup without penalty
    if (match.state.phase === "countdown") {
      const isLeft = socket.data.side === "left";
      const opponent = isLeft ? match.right : match.left;

      if (opponent) {
        opponent.emit("opponent.left");
        opponent.emit("match.cancelled");
      }

      cleanupMatch(match);
      return;
    }

    // During game, treat as surrender
    handleSurrender(socket);
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

  async function endMatchDueToDisconnect(match: Match, disconnectedSide: Side) {
    const winnerSide: Side = disconnectedSide === "left" ? "right" : "left";
    const winner = winnerSide === "left" ? match.left : match.right;

    if (winner) {
      winner.emit("opponent.disconnected");
      winner.emit("game.over", {
        matchId: match.id,
        winnerSide,
        leftScore: match.state.left.score,
        rightScore: match.state.right.score,
        reason: "disconnect",
      });
    }
    await saveMatchResult(match, winnerSide, "disconnect");
    cleanupMatch(match);
  }

  async function tickMatch(match: Match) {
    // Don't update if paused (waiting for reconnect)
    if (match.isPaused) return;

    const dt = 1 / 60;
    stepServerGame(match.state, match.inputs, dt);

    const snapshot: GameSnapshot = toSnapshot(match.state);
    match.left?.emit("game.state", snapshot);
    match.right?.emit("game.state", snapshot);

    if (match.state.phase === "gameover" && match.state.winner) {
      const gameOverPayload = {
        matchId: match.id,
        winnerSide: match.state.winner,
        leftScore: match.state.left.score,
        rightScore: match.state.right.score,
        reason: "score" as const,
      };

      match.left?.emit("game.over", gameOverPayload);
      match.right?.emit("game.over", gameOverPayload);
      await saveMatchResult(match, match.state.winner, "score");
      cleanupMatch(match);
    }
  }

  function cleanupMatch(match: Match) {
    clearInterval(match.loop);
    if (match.reconnectTimeout) {
      clearTimeout(match.reconnectTimeout);
      match.reconnectTimeout = null;
    }

    matches.delete(match.id);
    playerMatchMap.delete(match.leftProfile.id);
    playerMatchMap.delete(match.rightProfile.id);

    // Clear socket data
    for (const s of [match.left, match.right]) {
      if (s && s.data.matchId === match.id) {
        s.data.matchId = undefined;
        s.data.side = undefined;
      }
    }

    fastify.log.info({ matchId: match.id }, "[pong] match cleaned up");
  }
}