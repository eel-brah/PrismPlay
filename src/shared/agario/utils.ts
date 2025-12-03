import { MAP_HEIGHT, MAP_WIDTH, ORB_RADIUS } from "./config";
import { Camera, Orb } from "./types";

export function darkenHex(color: string, amount = 0.3): string {
  let r: number, g: number, b: number;

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);

    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  } else {
    [r, g, b] = color.match(/\d+/g)!.map(Number);
  }

  r = Math.floor(r * (1 - amount));
  g = Math.floor(g * (1 - amount));
  b = Math.floor(b * (1 - amount));

  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

function randomId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

export function randomOrb(): Orb {
  return {
    id: randomId(),
    x: Math.random() * MAP_WIDTH,
    y: Math.random() * MAP_HEIGHT,
    radius: ORB_RADIUS,
    color: randomColor(),
  };
}

export function randomColor(): string {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function drawOrbs(
  ctx: CanvasRenderingContext2D,
  orbs: Orb[],
  camera: Camera,
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
