import { Player } from "./player";

export interface Orb {
  id: string;
  x: number;
  y: number;
  mass: number;
  color: string;
}

export interface Eject {
  id: string;
  x: number;
  y: number;
  color: string;
  mass: number;
  vx: number;
  vy: number;
  ownerId: string;
  age: number;
}

export interface BlobData {
  id: string;
  x: number;
  y: number;
  mass: number;
  vx: number;
  vy: number;
  mergeCooldown: number;
  splitOrder: number;
}

export interface PlayerData {
  id: string;
  name: string;
  color: string;
  blobs: BlobData[];
  lastProcessedSeq: number;
  totalMass: number;
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
  dt: number;
}

export interface PlayerState {
  player: Player;
  startTime: number;
  endTime: number;
  maxMass: number;
  kills: number;
  input: InputState | null;
  splitRequested: boolean;
  ejectRequested: boolean;
}

export type LeaderboardEntry = {
  id: string;
  name: string;
  totalMass: number;
  rank: number;
  isMe: boolean;
};

export interface Virus {
  id: string;
  x: number;
  y: number;
  mass: number;
  vx: number;
  vy: number;
  fedCount: number;
}

export type RoomInfo = {
  room: string;
  visibility: "public" | "private";
  status: "waiting" | "started";
  maxPlayers: number;
  durationMin: number;
  startedAt: number;
  hostId: string;
  youAreHost: boolean;
  key?: string;
  players: LobbyPlayer[];
  spectatorCount: number;
};

export type RoomSummary = {
  room: string;
  visibility: "public" | "private";
  status: "waiting" | "started";
  playerCount: number;
  maxPlayers: number;
  durationMin: number;
  timeLeftSec: number | null;
  allowSpectators: boolean;
  spectatorCount: number;
};

export type LobbyPlayer = { id: string; name: string };

