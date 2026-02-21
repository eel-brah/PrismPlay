import { GUEST_ID } from "../../../shared/agario/config";
import { Player } from "../../../shared/agario/player";
import { Eject, Orb, Virus } from "../../../shared/agario/types";
import {
  radiusFromMass,
  randomColor,
  randomId,
} from "../../../shared/agario/utils";
import { Camera } from "./type";

export function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
  const gridSize = 50;

  const startX = -(camera.x % gridSize);
  const startY = -(camera.y % gridSize);

  const width = camera.width;
  const height = camera.height;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";// visible but not too bright
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

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  camera: Camera,
) {
  for (const blob of player.blobs) {
    const r = radiusFromMass(blob.mass);
    if (!isInView(blob.x, blob.y, r, camera)) continue;

    const screenX = blob.x - camera.x;
    const screenY = blob.y - camera.y;

    ctx.beginPath();
    ctx.arc(screenX, screenY, r, 0, Math.PI * 2);

    ctx.fillStyle = player.color;
    ctx.fill();

    ctx.strokeStyle = darkenHex(player.color);
    ctx.lineWidth = 7 + r * 0.05;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = `bold ${r * 0.5}px Market, "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.name, screenX, screenY);
  }
}

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

export function randomPlayer(): Player {
  return new Player(randomId(), " ", randomColor());
}

export function getOrCreateGuestId(): string {
  let id = localStorage.getItem(GUEST_ID);
  if (!id) {
    ((id = randomId()), localStorage.setItem(GUEST_ID, id));
  }
  return id;
}

function toMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function formatRoomDuration(room: {
  startedAt: Date | string;
  endedAt?: Date | string | null;
  maxDurationMin?: number | null;
}): string {
  const startMs = toMs(room.startedAt);
  const endMs = toMs(room.endedAt);

  const totalSeconds =
    endMs != null && startMs != null
      ? Math.floor((endMs - startMs) / 1000)
      : (room.maxDurationMin ?? 0) * 60;

  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDurationMs(ms?: number | null): string {
  if (!ms || ms <= 0) return "-";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
