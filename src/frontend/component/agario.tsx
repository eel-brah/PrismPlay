import { useEffect, useRef } from "react";

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;

const RADIUS = 20;
const MAX_SPEED = 400;
const MIN_SPEED = 50;

class Player {
  private _x: number;
  private _y: number;
  private _radius: number;
  private color: string;

  constructor(x: number, y: number, color: string) {
    this._x = x;
    this._y = y;
    this._radius = RADIUS;
    this.color = color;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get radius(): number {
    return this._radius;
  }

  update(dt: number, mouse: Mouse, orbs: Orb[]) {
    const dx = mouse.x - this._x;
    const dy = mouse.y - this._y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      //TODO: improve
      const baseSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));
      const sizeFactor = this.radius / RADIUS;
      const speed = baseSpeed / sizeFactor;

      // const baseSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));
      // const speed = baseSpeed / Math.log(this.radius );

      console.log(this.radius, "   ", speed);
      this._x += dirX * speed * dt;
      this._y += dirY * speed * dt;
    }

    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      const odx = orb.x - this._x;
      const ody = orb.y - this._y;
      const odistance = Math.hypot(odx, ody);

      if (odistance < this._radius + orb.radius) {
        orbs.splice(i, 1);
        // TODO: Update the max
        if (this._radius < 200)
          this._radius += 0.3;
      }
    }

    this._x = Math.max(this._radius, Math.min(MAP_WIDTH - this._radius, this._x));
    this._y = Math.max(this._radius, Math.min(MAP_HEIGHT - this._radius, this._y));
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    ctx.beginPath();
    ctx.arc(this._x - camera.x, this._y - camera.y, this._radius, 0, Math.PI * 2);

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.strokeStyle = darkenHex(this.color);
    ctx.lineWidth = 7 + this._radius * 0.05;
    ctx.stroke();
  }
}

function darkenHex(hex: string, amount = 0.3): string {
  hex = hex.replace("#", "");

  const num = parseInt(hex, 16);

  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.floor(r * (1 - amount));
  g = Math.floor(g * (1 - amount));
  b = Math.floor(b * (1 - amount));

  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface Mouse {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

const Agario = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationIdRef = useRef<number | null>(null);
  const orbsRef = useRef<Orb[]>([]);
  const playerRef = useRef<Player | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const mouseRef = useRef<Mouse>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number | null>(null);
  console.log(lastTimeRef.current)

  // Helpers 
  function randomOrb(): Orb {
    return {
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
      radius: 8,
      color: randomColor(),
    };
  }

  function randomColor(): string {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawGrid(
    ctx: CanvasRenderingContext2D,
    camera: Camera
  ) {
    const gridSize = 50;

    const startX = - (camera.x % gridSize);
    const startY = - (camera.y % gridSize);

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

  function drawOrbs(
    ctx: CanvasRenderingContext2D,
    orbs: Orb[],
    camera: Camera
  ) {
    for (const orb of orbs) {
      const sx = orb.x - camera.x;
      const sy = orb.y - camera.y;

      if (
        sx + orb.radius < 0 ||
        sx - orb.radius > camera.width ||
        sy + orb.radius < 0 ||
        sy - orb.radius > camera.height
      ) {
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = orb.color;
      ctx.arc(sx, sy, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();

    if (!playerRef.current) {
      playerRef.current = new Player(MAP_WIDTH / 2, MAP_HEIGHT / 2, "#ef4444");
    }

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

      player.update(dt, worldMouse, orbs);

      camera.x = player.x - camera.width / 2;
      camera.y = player.y - camera.height / 2;
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
        className="w-full h-full block"
      />
    </div>
  );
};

export default Agario;
