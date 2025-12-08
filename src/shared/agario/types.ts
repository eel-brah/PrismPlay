import { Player } from "./player";

export interface Orb {
  id: string;
  x: number;
  y: number;
  mass: number;
  color: string;
}

export interface BlobData {
  id: string;
  x: number;
  y: number;
  mass: number;
  vx: number;
  vy: number;
  mergeCooldown: number;
}

export interface PlayerData {
  id: string;
  name: string;
  color: string;
  blobs: BlobData[];
}

export interface Mouse {
  x: number;
  y: number;
}

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InputState {
  mouseX: number;
  mouseY: number;
  seq: number;
}

export interface PlayerState {
  player: Player;
  input: InputState | null;
  splitRequested: boolean;
}

