import { MAP_HEIGHT, MAP_WIDTH, ORB_RADIUS } from "./config";
import { Camera, Orb } from "./types";

export function darkenHex(hex: string, amount = 0.3): string {
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


export function randomOrb(): Orb {
  return {
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


export function drawOrbs(ctx: CanvasRenderingContext2D, orbs: Orb[], camera: Camera) {
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

