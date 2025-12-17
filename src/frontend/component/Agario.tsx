import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { MAP_HEIGHT, MAP_WIDTH } from "@/../shared/agario/config";
import { Player } from "@/../shared/agario/player";
import {
  Camera,
  Eject,
  InputState,
  LeaderboardEntry,
  Mouse,
  Orb,
  PlayerData,
} from "@/../shared/agario/types";
import { drawEjects, drawOrbs } from "@/../shared/agario/utils";
import { drawGrid } from "@/game/agario/utils";
import { Leaderboard } from "./LeaderBoard";

const Agario = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const playerRef = useRef<Player | null>(null);
  const orbsRef = useRef<Orb[]>([]);
  const ejectsRef = useRef<Eject[]>([]);
  const cameraRef = useRef<Camera | null>(null);
  const mouseRef = useRef<Mouse>({ x: 0, y: 0 });
  const enemiesRef = useRef<Record<string, Player>>({});
  const inputSeqRef = useRef(0);
  const isDeadRef = useRef(false);

  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const pendingInputsRef = useRef<InputState[]>([]);
  const lastProcessedSeqRef = useRef<number>(0);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);


  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();

    function initCam() {
      if (!canvas || !playerRef.current) return;
      cameraRef.current = {
        x: playerRef.current.x - canvas.width / 2,
        y: playerRef.current.y - canvas.height / 2,
        width: canvas.width,
        height: canvas.height,
      };

      mouseRef.current = {
        x: canvas.width / 2,
        y: canvas.height / 2,
      };
    }

    socket.on("connect", () => {
      console.log("Connected to server with socket id:", socket.id);
    });

    socket.on("joined", (data: PlayerData) => {
      playerRef.current = Player.deserialize(data);
      console.log(
        "Joined game as",
        playerRef.current.id,
        " named: ",
        playerRef.current.name,
      );

      isDeadRef.current = false;
      setGameOver(false);
      setHasJoined(true);

      enemiesRef.current = {};
      orbsRef.current = [];
      ejectsRef.current = [];
      pendingInputsRef.current = [];
      lastProcessedSeqRef.current = data.lastProcessedSeq;

      initCam();
    });

    //TODO: prediction + reconciliation: remove?? 
    socket.on(
      "heartbeat",
      (data: { players: Record<string, PlayerData>; orbs: Orb[]; ejects: Eject[] }) => {
        const myId = socket.id;
        if (!myId) return;

        const myData = data.players[myId];
        if (myData) {
          if (!playerRef.current) {
            playerRef.current = Player.deserialize(myData);
          } else {
            playerRef.current.updateFromData(myData);
          }

          lastProcessedSeqRef.current = myData.lastProcessedSeq;

          const remainingInputs = pendingInputsRef.current.filter(
            (input) => input.seq > myData.lastProcessedSeq
          );
          pendingInputsRef.current = remainingInputs;

          const player = playerRef.current;
          const orbs = orbsRef.current;
          const ejects = ejectsRef.current;
          if (player) {
            for (const input of remainingInputs) {
              const mouse: Mouse = { x: input.mouseX, y: input.mouseY };
              //TODO: player.update(input.dt, mouse, orbs, [], false);
              const [eatenOrbs, eatenEjects] = player.update(input.dt, mouse, orbs, ejects, false);
              if (eatenOrbs.length > 0) {
                const eatenSet = new Set(eatenOrbs);
                orbsRef.current = orbsRef.current.filter(
                  (o) => !eatenSet.has(o.id),
                );
              }
              if (eatenEjects.length > 0) {
                const eatenSet = new Set(eatenEjects);
                ejectsRef.current = ejectsRef.current.filter(
                  (e) => !eatenSet.has(e.id),
                );
              }
            }
          }
        }

        for (const [id, pData] of Object.entries(data.players)) {
          if (id === myId) continue;

          if (enemiesRef.current[id]) {
            enemiesRef.current[id].updateFromData(pData);
          } else {
            enemiesRef.current[id] = Player.deserialize(pData);
          }
        }

        const enemiesIds = new Set(Object.keys(data.players));
        for (const id of Object.keys(enemiesRef.current)) {
          if (!enemiesIds.has(id)) {
            delete enemiesRef.current[id];
          }
        }

        orbsRef.current = data.orbs;
        ejectsRef.current = data.ejects;

        const playersArray = Object.entries(data.players).map(([id, p]) => ({
          id,
          name: p.name,
          totalMass: p.totalMass,
        }));

        playersArray.sort((a, b) => b.totalMass - a.totalMass);

        const ranked = playersArray.map((p, index) => ({
          ...p,
          rank: index + 1,
          isMe: p.id === myId,
        }));

        const top10 = ranked.slice(0, 10);
        const me = ranked.find(p => p.id === myId);

        let finalBoard = top10;
        if (me && me.rank > 10) {
          finalBoard = [...top10, me];
        }
        setLeaderboard(finalBoard);
      },
    );

    socket.on("youLost", () => {
      isDeadRef.current = true;
      setGameOver(true);
    });

    function handleResize() {
      resizeCanvas();
      const cam = cameraRef.current;
      if (!cam || !canvas || !playerRef.current) return;

      cam.width = canvas.width;
      cam.height = canvas.height;
      cam.x = playerRef.current.x - cam.width / 2;
      cam.y = playerRef.current.y - cam.height / 2;
    }

    function handleMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const sock = socketRef.current;
        if (!sock || isDeadRef.current) return;
        sock.emit("split");
      } else if (e.code === "KeyW" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        const sock = socketRef.current;
        if (!sock || isDeadRef.current) return;
        sock.emit("eject");
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    function update(dt: number) {
      const player = playerRef.current;
      const camera = cameraRef.current;
      const orbs = orbsRef.current;
      const ejects = ejectsRef.current;

      if (!canvas || !player || !camera) return;

      const worldMouse: Mouse = {
        x: mouseRef.current.x + camera.x,
        y: mouseRef.current.y + camera.y,
      };

      // local prediction 
      const [eatenOrbs, eatenEjects] = player.update(dt, worldMouse, orbs, ejects, isDeadRef.current);
      if (eatenOrbs.length > 0) {
        const eatenSet = new Set(eatenOrbs);
        orbsRef.current = orbsRef.current.filter(
          (o) => !eatenSet.has(o.id),
        );
      }
      if (eatenEjects.length > 0) {
        const eatenSet = new Set(eatenEjects);
        ejectsRef.current = ejectsRef.current.filter(
          (e) => !eatenSet.has(e.id),
        );
      }

      camera.x = player.x - camera.width / 2;
      camera.y = player.y - camera.height / 2;

      if (isDeadRef.current) return;

      inputSeqRef.current += 1;
      const input: InputState = {
        mouseX: worldMouse.x,
        mouseY: worldMouse.y,
        seq: inputSeqRef.current,
        dt,
      };
      pendingInputsRef.current.push(input);
      socket.emit("input", input);
    }

    function draw() {
      if (!canvas || !ctx) return;
      const camera = cameraRef.current;
      const player = playerRef.current;
      if (!camera || !player) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, camera);

      ctx.strokeStyle = "#000";
      ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

      drawOrbs(ctx, orbsRef.current, camera);
      drawEjects(ctx, ejectsRef.current, camera);
      player.draw(ctx, camera);

      for (const enemy of Object.values(enemiesRef.current)) {
        enemy.draw(ctx, camera);
      }
    }

    function gameLoop(now: number) {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      update(dt);
      draw();

      animationIdRef.current = requestAnimationFrame(gameLoop);
    }

    animationIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
      socket.disconnect();
    };
  }, []);

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function handleJoin() {
    const socket = socketRef.current;
    if (!socket) return;

    let pName = playerName;
    if (playerName.length > 6) pName = playerName.slice(0, 6);
    setPlayerName(pName.trim());
    const name = pName || "Pl" + Math.floor(Math.random() * 1000);

    socket.emit("join", { name });
  }

  function handleRespawn() {
    const socket = socketRef.current;
    if (!socket) return;

    const name =
      playerName || "Pl" + Math.floor(Math.random() * 1000);

    isDeadRef.current = false;
    setGameOver(false);

    socket.emit("join", { name });
  }

  return (
    <div className="fixed inset-0">
      {!hasJoined && (
        <div className="absolute inset-0 flex flex-col justify-center items-center gap-4">
          <h1 className="text-4xl mb-4 font-bold text-gray-800">Agario</h1>

          <input
            className="
            px-4 py-2
            rounded-md
            border-2 border-gray-400
            text-black text-xl
            bg-white
            focus:outline-none
            focus:border-gray-600
            placeholder-gray-500
          "
            placeholder="Name (max 6)"
            maxLength={6}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <button
            onClick={handleJoin}
            className="
            mt-2 px-6 py-3
            bg-gray-300 text-black
            rounded-md text-xl
            hover:bg-gray-400
            transition
          "
          >
            Join
          </button>
        </div>
      )}

      {hasJoined && gameOver && (
        <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-white text-4xl">
          <div>You Died</div>
          <button
            onClick={handleRespawn}
            className="mt-4 px-6 py-3 bg-white text-black rounded-md text-xl hover:bg-gray-200"
          >
            Respawn
          </button>
        </div>
      )}

      {hasJoined && (
        <Leaderboard leaderboard={leaderboard} />
      )}
      <canvas
        ref={canvasRef}
        id="agario"
        className="w-full h-full block"
      />
    </div>
  );
};

export default Agario;
