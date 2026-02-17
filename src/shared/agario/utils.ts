import { nanoid } from "nanoid";

export function randomId(): string {
  return nanoid();
}

export function randomColor(): string {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function radiusFromMass(mass: number): number {
  return Math.sqrt(mass / Math.PI);
}

const ROOM_RE = /^[A-Za-z0-9_-]{3,20}$/;
export function isValidRoomName(room: string) {
  return ROOM_RE.test(room);
}

