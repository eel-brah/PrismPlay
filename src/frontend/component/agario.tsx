import { useEffect, useRef } from "react";

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;

const RADIUS = 20;
const SPEED = 200;
const MAX_SPEED = 400;
const MIN_SPEED = 50;

class Player {
  private _x: number;
  private _y: number;
  private radius: number;
  private speed: number;
  private color: string;

  constructor(x: number, y: number, color: string) {
    this._x = x;
    this._y = y;
    this.radius = RADIUS;
    this.speed = SPEED;
    this.color = color;
  }
  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }

  update(dt: number, mouse: Mouse, orbs: Orb[]) {
    const dx = mouse.x - this._x;
    const dy = mouse.y - this._y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      const speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));

      this._x += dirX * speed * dt;
      this._y += dirY * speed * dt;
    }

    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];

      const odx = orb.x - this._x;
      const ody = orb.y - this._y;
      const odistance = Math.hypot(odx, ody);

      if (odistance < this.radius + orb.radius) {
        orbs.splice(i, 1);
        this.radius += 0.3;
      }
    }

    this._x = Math.max(this.radius, Math.min(MAP_WIDTH - this.radius, this._x));
    this._y = Math.max(this.radius, Math.min(MAP_HEIGHT - this.radius, this._y));
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    ctx.beginPath();
    ctx.arc(this._x - camera.x, this._y - camera.y, this.radius, 0, Math.PI * 2);

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.strokeStyle = darkenHex(this.color);
    ctx.lineWidth = 7 + this.radius * 0.05;
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
  const rafRef = useRef<number | null>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  let animationId: number | null = null;
  let lastTime: number = 0;
  let orbCount: number = 0;
  let orbs: Orb[] = [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let mouse: Mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    function handleMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    window.addEventListener("mousemove", handleMouseMove);

    let player = new Player(MAP_WIDTH / 2, MAP_HEIGHT / 2, "#ef4444");

    const camera: Camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };

    function update(dt: number) {
      if (!canvas) return;

      while (orbs.length < 200) {
        orbs.push(randomOrb());
      }
      const worldMouse = {
        x: mouse.x + camera.x,
        y: mouse.y + camera.y
      };
      player.update(dt, worldMouse, orbs);

      camera.x = player.x - canvas.width / 2;
      camera.y = player.y - canvas.height / 2;
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#000";
      ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

      drawOrbs(ctx, orbs, camera);
      player.draw(ctx, camera);
    }

    let lastTime = 0;
    function gameLoop(now: number) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      update(dt);
      draw();
      if (backgroundRef.current) {
        backgroundRef.current.style.backgroundPosition = `${-camera.x}px ${-camera.y}px`;
      }
      animationId = requestAnimationFrame(gameLoop);
    }
    animationId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  // Helpers
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
  };
  function randomOrb(): Orb {
    return {
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
      radius: 8,
      color: randomColor()
    };
  }
  function randomColor(): string {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawOrbs(ctx: CanvasRenderingContext2D, orbs: Orb[], camera: Camera) {
    for (const orb of orbs) {
      const sx = orb.x - camera.x;
      const sy = orb.y - camera.y;

      if (
        sx + orb.radius < 0 ||
        sx - orb.radius > camera.width ||
        sy + orb.radius < 0 ||
        sy - orb.radius > camera.height
      ) continue;

      ctx.beginPath();
      ctx.fillStyle = orb.color;
      ctx.arc(sx, sy, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return (
    <div
      ref={backgroundRef}
      className="
    fixed top-0 left-0 w-full h-full
    bg-white
    [background-image:linear-gradient(#b8c1c5_1px,transparent_1px),linear-gradient(90deg,#b8c1c5_1px,transparent_1px)]
    [background-size:50px_50px]
  "
      style={{ backgroundPosition: '0px 0px' }} // initial
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
};

export default Agario;
