import { nanoid } from "nanoid";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MERGE_BASE_TIME,
  MERGE_FACTOR,
  ORB_MIN_MASS,
  ORB_RADIUS,
  VIRUS_BASE_MASS,
  VIRUS_RADIUS,
  VIRUS_SAFE_RADIUS,
} from "./config";
import { Player } from "./player";
import { Camera, Eject, Orb, Virus } from "./types";

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

export function randomId(): string {
  return nanoid();
}

export function randomOrb(): Orb {
  return {
    id: randomId(),
    x: ORB_RADIUS + Math.random() * (MAP_WIDTH - ORB_RADIUS * 2),
    y: ORB_RADIUS + Math.random() * (MAP_HEIGHT - ORB_RADIUS * 2),
    mass: ORB_MIN_MASS,
    color: randomColor(),
  };
}

export function randomViruses(): Virus {
  return {
    id: randomId(),
    x: VIRUS_SAFE_RADIUS + Math.random() * (MAP_WIDTH - VIRUS_SAFE_RADIUS * 2),
    y: VIRUS_SAFE_RADIUS + Math.random() * (MAP_HEIGHT - VIRUS_SAFE_RADIUS * 2),
    mass: VIRUS_BASE_MASS,
    vx: 0,
    vy: 0,
    fedCount: 0,
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
    const r = radiusFromMass(orb.mass);

    if (!isInView(orb.x, orb.y, r, camera)) continue;

    const sx = orb.x - camera.x;
    const sy = orb.y - camera.y;

    ctx.beginPath();
    ctx.fillStyle = orb.color;
    ctx.arc(sx, sy, r + 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawEjects(
  ctx: CanvasRenderingContext2D,
  ejects: Eject[],
  camera: Camera,
) {
  for (const e of ejects) {
    const r = radiusFromMass(e.mass);
    if (!isInView(e.x, e.y, r, camera)) continue;

    const x = e.x - camera.x;
    const y = e.y - camera.y;

    ctx.beginPath();
    ctx.fillStyle = e.color;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawViruses(
  ctx: CanvasRenderingContext2D,
  viruses: Virus[],
  camera: Camera,
) {
  for (const virus of viruses) {
    const r = radiusFromMass(virus.mass);

    if (!isInView(virus.x, virus.y, r, camera)) continue;

    const screenX = virus.x - camera.x;
    const screenY = virus.y - camera.y;

    const spikes = 18;
    const spikeDepth = r * 0.25;

    ctx.beginPath();

    for (let i = 0; i <= spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      const isSpike = i % 2 === 0;

      const radius = isSpike ? r + spikeDepth : r;
      const x = screenX + Math.cos(angle) * radius;
      const y = screenY + Math.sin(angle) * radius;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();

    ctx.fillStyle = "#2ecc71";
    ctx.fill();

    ctx.strokeStyle = "#27ae60";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
export function isInView(
  x: number,
  y: number,
  radius: number,
  camera: Camera,
): boolean {
  const sx = x - camera.x;
  const sy = y - camera.y;

  const padding = 50;

  if (
    sx + radius < -padding ||
    sx - radius > camera.width + padding ||
    sy + radius < -padding ||
    sy - radius > camera.height + padding
  ) {
    return false;
  }
  return true;
}

export function radiusFromMass(mass: number): number {
  return Math.sqrt(mass / Math.PI);
}

export function computeMergeCooldown(mass: number): number {
  return MERGE_BASE_TIME + mass * MERGE_FACTOR;
}

export function randomPlayer(): Player {
  return new Player(randomId(), " ", randomColor());
}

export function getOrCreateGuestId(): string {
  let id = localStorage.getItem("guestId");
  if (!id) {
    id = nanoid();
    localStorage.setItem("guestId", id);
  }
  return id;
}
