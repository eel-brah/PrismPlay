import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { MAP_HEIGHT, MAP_WIDTH } from "@/../shared/agario/config";
import { Player } from "@/../shared/agario/player";
import { Camera, InputState, Mouse, Orb, PlayerData } from "@/../shared/agario/types";
import { drawOrbs, randomOrb } from "@/../shared/agario/utils";

function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
  const gridSize = 50;

  const startX = -(camera.x % gridSize);
  const startY = -(camera.y % gridSize);

  const width = camera.width;
  const height = camera.height;

  ctx.strokeStyle = "#b8c1c5";
  ctx.lineWidth = 1;

  for (let x = startX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = startY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(0 + width, y);
    ctx.stroke();
  }
}

const Agario = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationIdRef = useRef<number | null>(null);
  const orbsRef = useRef<Orb[]>([]);
  const playerRef = useRef<Player | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const mouseRef = useRef<Mouse>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number | null>(null);
  const enemiesRef = useRef<Record<string, Player>>({});
  const inputSeqRef = useRef(0);
  const isDeadRef = useRef(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const socket = io("https://localhost:9443", {});

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();

    function initCameraForPlayer() {
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

    //TODO: prediction reconciliation
    socket.on(
      "heartbeat",
      (data: { players: Record<string, PlayerData>; orbs: Orb[] }) => {
        const myId = playerRef.current?.id ?? socket.id;

        const myServerData = data.players[myId!];
        if (myServerData) {
          if (!playerRef.current) {
            playerRef.current = Player.deserialize(myServerData);
          } else {
            playerRef.current.x = myServerData.x;
            playerRef.current.y = myServerData.y;
            playerRef.current.radius = myServerData.radius;
          }
        }

        const serverIds = new Set(Object.keys(data.players));

        for (const [id, pData] of Object.entries(data.players)) {
          if (id === myId) continue;

          if (enemiesRef.current[id]) {
            enemiesRef.current[id].x = pData.x;
            enemiesRef.current[id].y = pData.y;
            enemiesRef.current[id].radius = pData.radius;
          } else {
            enemiesRef.current[id] = Player.deserialize(pData);
          }
        }

        for (const id of Object.keys(enemiesRef.current)) {
          if (!serverIds.has(id)) {
            delete enemiesRef.current[id];
          }
        }

        orbsRef.current = data.orbs;
      },
    );

    socket.on("connect", () => {
      console.log("Connected to server with socket id:", socket.id);
      socket.emit("join", {
        name: "Player-" + Math.floor(Math.random() * 1000),
      });
    });

    socket.on("joined", (data: PlayerData) => {
      playerRef.current = Player.deserialize(data);
      console.log("Joined game as", playerRef.current.id, " named: ", playerRef.current.name);
      initCameraForPlayer();
    });

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

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    function update(dt: number) {
      if (isDeadRef.current) return;
      const player = playerRef.current;
      const camera = cameraRef.current;
      const orbs = orbsRef.current;

      if (!canvas || !player || !camera) return;

      const worldMouse: Mouse = {
        x: mouseRef.current.x + camera.x,
        y: mouseRef.current.y + camera.y,
      };

      // local prediction (optional)
      const eatenOrbs = player.update(dt, worldMouse, orbs);
      if (eatenOrbs.length > 0) {
        const eatenSet = new Set(eatenOrbs);
        orbsRef.current = orbsRef.current.filter((o) => !eatenSet.has(o.id));
      }

      camera.x = player.x - camera.width / 2;
      camera.y = player.y - camera.height / 2;

      inputSeqRef.current += 1;
      socket.emit("input", {
        mouseX: worldMouse.x,
        mouseY: worldMouse.y,
        seq: inputSeqRef.current,
      } as InputState);
    }

    function draw() {
      if (isDeadRef.current) return;
      if (!canvas || !ctx) return;
      const camera = cameraRef.current;
      const player = playerRef.current;
      if (!camera || !player) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, camera);

      ctx.strokeStyle = "#000";
      ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

      drawOrbs(ctx, orbsRef.current, camera);
      player.draw(ctx, camera);

      // TODO: dont draw the enemies if out of cam
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
    if (ctx)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return (
    <div className="fixed inset-0">
      {gameOver && (
        <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-white text-4xl">
          <div>You Died</div>
          <button
            // onClick={handleRespawn}
            className="mt-4 px-6 py-3 bg-white text-black rounded-md text-xl"
          >
            Respawn
          </button>
        </div>
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
