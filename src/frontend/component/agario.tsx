import React, { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { MAP_HEIGHT, MAP_WIDTH } from "@/../shared/agario/config";
import { Player } from "@/../shared/agario/player";
import { Camera, Mouse, Orb, PlayerData } from "@/../shared/agario/types";
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

  useEffect(() => {
    const socket = io("https://localhost:9443", {});
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    socket.on("heartbeat", (data: Record<string, PlayerData>) => {
      for (const [k, v] of Object.entries(data)) {
        if (k != playerRef.current?.id) {
          if (Object.hasOwn(enemiesRef.current, k)) {
            enemiesRef.current[k].x = v.x;
            enemiesRef.current[k].y = v.y;
            enemiesRef.current[k].radius = v.radius;
          }
          else
            enemiesRef.current[k] = Player.deserialize(v);
        }
      }
    });

    socket.on("connect", () => {
      console.log("Connected to server with socket id:", socket.id);
      socket.emit("join", {
        name: "Player-" + Math.floor(Math.random() * 1000),
      });
    });

    //TODO: wait for the player
    if (!playerRef.current) {
      playerRef.current = new Player("2", "2", MAP_WIDTH / 2, MAP_HEIGHT / 2, "#ef4444");
    }
    socket.on("joined", (data: PlayerData) => {
      playerRef.current = Player.deserialize(data);
      console.log("Joined game as", playerRef.current.id, " named: ", playerRef.current.name);
    });

    socket.on("youLost", (data: string) => {
      console.log(data);
      playerRef.current!.radius = 0;
    });

    resizeCanvas();

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
      const player = playerRef.current;
      const camera = cameraRef.current;
      const orbs = orbsRef.current;

      if (!canvas || !player || !camera) return;

      while (orbs.length < 200) {
        orbs.push(randomOrb());
      }

      const worldMouse: Mouse = {
        x: mouseRef.current.x + camera.x,
        y: mouseRef.current.y + camera.y,
      };

      const devouredEnemies = player.update(dt, worldMouse, orbs, enemiesRef.current);
      socket.emit("losers", devouredEnemies);

      camera.x = player.x - camera.width / 2;
      camera.y = player.y - camera.height / 2;

      socket.emit("update", player.serialize());
    }

    function draw() {
      if (!canvas || !ctx) return;
      const camera = cameraRef.current;
      const player = playerRef.current;
      if (!camera || !player) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ctx.fillStyle = "#ffffff";
      // ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, camera);

      ctx.strokeStyle = "#000";
      ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

      drawOrbs(ctx, orbsRef.current, camera);
      player.draw(ctx, camera);
      // TODO: dont draw the enemies if out of cam
      for (const [k, v] of Object.entries(enemiesRef.current)) {
        v.draw(ctx, camera);
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
      <canvas
        ref={canvasRef}
        id="agario"
        className="w-full h-full block"
      />
    </div>
  );
};

export default Agario;
