import { MAP_HEIGHT, MAP_WIDTH } from "./config.js";
import { Player } from "./player.js";
import { Camera, Mouse, Orb } from "./types.js";
import { drawGrid, drawOrbs, randomOrb } from "./utils.js";

declare const io: (
  url?: string,
  opts?: any,
) => import("socket.io-client").Socket | any;

function initAgario(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  let animationId: number | null = null;
  let orbs: Orb[] = [];
  let player: Player | null = null;
  let camera: Camera | null = null;
  let mouse: Mouse = { x: 0, y: 0 };
  let lastTime: number | null = null;

  function resizeCanvas() {
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

  function handleResize() {
    resizeCanvas();
    if (camera && player) {
      camera.width = canvas.width;
      camera.height = canvas.height;
      camera.x = player.x - camera.width / 2;
      camera.y = player.y - camera.height / 2;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  resizeCanvas();

  player = new Player("1", "1", MAP_WIDTH / 2, MAP_HEIGHT / 2, "#ef4444");

  camera = {
    x: player.x - canvas.width / 2,
    y: player.y - canvas.height / 2,
    width: canvas.width,
    height: canvas.height,
  };

  mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2,
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("mousemove", handleMouseMove);

  function update(dt: number) {
    if (!player || !camera) return;

    while (orbs.length < 200) {
      orbs.push(randomOrb());
    }

    const worldMouse: Mouse = {
      x: mouse.x + camera.x,
      y: mouse.y + camera.y,
    };

    player.update(dt, worldMouse, orbs);

    camera.x = player.x - camera.width / 2;
    camera.y = player.y - camera.height / 2;
  }

  function draw() {
    if (!camera || !player || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ctx.fillStyle = "#ffffff";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, camera);

    ctx.strokeStyle = "#000";
    ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

    drawOrbs(ctx, orbs, camera);
    player.draw(ctx, camera);
  }

  function gameLoop(now: number) {
    if (lastTime == null) {
      lastTime = now;
    }
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    update(dt);
    draw();

    animationId = requestAnimationFrame(gameLoop);
  }

  animationId = requestAnimationFrame(gameLoop);

  return () => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("mousemove", handleMouseMove);
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}

window.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  socket.on("connect", () => {
    console.log("Connected to server with socket id:", socket.id);

    socket.emit("join", { name: "Player-" + Math.floor(Math.random() * 1000) });
  });

  socket.on("joined", (payload: { id: string }) => {
    console.log("Joined game as", payload.id);
  });

  socket.on("state", (state: any) => {
    // TODO: update your local player/orb state from server
    // e.g. applyStateFromServer(state);
  });

  const canvas = document.getElementById("agario");
  if (canvas instanceof HTMLCanvasElement) {
    const destroy = initAgario(canvas);

    window.addEventListener("beforeunload", () => {
      destroy();
    });
  }
});
