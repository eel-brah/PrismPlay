import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer } from "socket.io";
import type { Namespace } from "socket.io";
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
};

type PongNS = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

export function init_pong(io: SocketIOServer, fastify: FastifyInstance) {
  const pong = io.of("/pong") as PongNS;

  const waitingQueue: ReturnType<PongNS["sockets"]["get"]>[] = []; // we'll push sockets directly (see below)
  const matches = new Map<
    string,
    {
      id: string;
      left: any;
      right: any;
      state: ServerGameState;
      inputs: MatchInputs;
      loop: NodeJS.Timer;
    }
  >();

  let matchCounter = 1;
  const nextMatchId = () => `match_${matchCounter++}`;

  pong.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "[pong] connected");

    socket.on("match.join", (profile) => {
      socket.data.profile = profile;

      // avoid duplicates
      if ([...waitingQueue].includes(socket as any)) return;

      waitingQueue.push(socket as any);
      socket.emit("match.waiting");
      tryMatchmake();
    });

    socket.on("input.update", (payload) => {
      const matchId = socket.data.matchId;
      const side = socket.data.side;
      if (!matchId || !side) return;

      const match = matches.get(matchId);
      if (!match) return;

      match.inputs[side].up = !!payload.up;
      match.inputs[side].down = !!payload.down;
    });

    socket.on("match.leave", () => {
      removeFromQueue(socket as any);
      leaveMatch(socket as any, "normal");
    });

    socket.on("disconnect", () => {
      removeFromQueue(socket as any);
      leaveMatch(socket as any, "disconnect");
    });
  });

  function removeFromQueue(socket: any) {
    const idx = waitingQueue.indexOf(socket);
    if (idx >= 0) waitingQueue.splice(idx, 1);
  }

  function tryMatchmake() {
    while (waitingQueue.length >= 2) {
      const a = waitingQueue.shift()!;
      const b = waitingQueue.shift()!;
      createMatch(a, b);
    }
  }

  function createMatch(leftSocket: any, rightSocket: any) {
    const id = nextMatchId();
    const state = createInitialState();
    state.phase = "countdown";

    const inputs: MatchInputs = {
      left: { up: false, down: false },
      right: { up: false, down: false },
    };

    const match = {
      id,
      left: leftSocket,
      right: rightSocket,
      state,
      inputs,
      loop: setInterval(() => tickMatch(match), 1000 / 60),
    };

    matches.set(id, match);

    leftSocket.data.matchId = id;
    leftSocket.data.side = "left";
    rightSocket.data.matchId = id;
    rightSocket.data.side = "right";

    leftSocket.emit("match.found", {
      matchId: id,
      side: "left",
      opponent: rightSocket.data.profile,
    });

    rightSocket.emit("match.found", {
      matchId: id,
      side: "right",
      opponent: leftSocket.data.profile,
    });
  }

  function tickMatch(match: any) {
    const dt = 1 / 60;
    stepServerGame(match.state, match.inputs, dt);

    const snapshot: GameSnapshot = toSnapshot(match.state);
    match.left.emit("game.state", snapshot);
    match.right.emit("game.state", snapshot);

    if (match.state.phase === "gameover" && match.state.winner) {
      match.left.emit("game.over", {
        matchId: match.id,
        winnerSide: match.state.winner,
        leftScore: match.state.left.score,
        rightScore: match.state.right.score,
      });
      match.right.emit("game.over", {
        matchId: match.id,
        winnerSide: match.state.winner,
        leftScore: match.state.left.score,
        rightScore: match.state.right.score,
      });

      cleanupMatch(match);
    }
  }

  function cleanupMatch(match: any) {
    clearInterval(match.loop);
    matches.delete(match.id);

    for (const s of [match.left, match.right]) {
      if (s.data.matchId === match.id) {
        s.data.matchId = undefined;
        s.data.side = undefined;
      }
    }
  }

  function leaveMatch(socket: any, reason: "disconnect" | "normal") {
    const matchId = socket.data.matchId;
    if (!matchId) return;

    const match = matches.get(matchId);
    if (!match) return;

    const isLeft = socket.id === match.left.id;
    const other = isLeft ? match.right : match.left;
    const winnerSide: Side = isLeft ? "right" : "left";

    if (reason === "disconnect") {
      other.emit("opponent.disconnected");
      other.emit("game.over", {
        matchId,
        winnerSide,
        leftScore: match.state.left.score,
        rightScore: match.state.right.score,
      });
    }

    cleanupMatch(match);
  }
}
