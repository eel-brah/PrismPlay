import { Player } from "./player";

export interface Orb {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
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

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}
export interface InputState {
  mouseX: number;
  mouseY: number;
  seq: number;
}

export type PlayerState = {
  player: Player;
  input: InputState | null;
};

