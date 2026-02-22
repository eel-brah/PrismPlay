import { InputState } from "../../backend/modules/agario/agario_schema.js";
import { Player } from "./player.js";

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
  decayMultiplier: number;
}

export interface Mouse {
  x: number;
  y: number;
}

export interface Virus {
  id: string;
  x: number;
  y: number;
  mass: number;
  vx: number;
  vy: number;
  fedCount: number;
}

export interface RoomSummary {
  room: string;
  visibility: "public" | "private";
  status: "waiting" | "started";
  playerCount: number;
  maxPlayers: number;
  durationMin: number;
  timeLeftSec: number | null;
  allowSpectators: boolean;
  spectatorCount: number;
}

export interface FinalLeaderboardEntry {
  id: string | number;
  name: string;
  rank: number;
  kills: number;
  maxMass: number;
}

export interface FinalStatus {
  id: string;
  name: string;
  kills: number;
  maxMass: number;
}

export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "started";

export interface RoomMeta {
  roomId?: number;
  room: string;
  visibility: RoomVisibility;
  key?: string;
  maxPlayers: number;
  durationMin: number;

  status: RoomStatus;
  createdAt: number;
  startedAt?: number;
  endAt?: number;

  hostId: number;

  allowSpectators: boolean;
  spectators: Set<string>;
}
export interface World {
  players: Record<string, PlayerState>;
  orbs: Orb[];
  ejects: Eject[];
  viruses: Virus[];
  meta: RoomMeta;
}

export interface PlayerState {
  player: Player;
  startTime: number;
  endTime: number;
  maxMass: number;
  kills: number;
  userId?: number;
  guestId?: string;
  input: InputState | null;
  splitRequested: boolean;
  ejectRequested: boolean;
  virusEatTimes: number[];
}

export type PublicUser = {
  id: number;
  username: string;
  avatarUrl: string | null;
};

export type PublicGuest = {
  id: string;
};

export type RoomLeaderboardEntry = {
  id: number | string;
  type: UserGuest;
  trueName: string | null;
  name: string;

  rank: number;
  kills: number;
  maxMass: number;
  durationMs: number;
  isWinner: boolean;

  user: PublicUser | null;
  guest: PublicGuest | null;

  createdAt: Date;
};

export type RoomWinner = {
  id: number | string;
  type: "user" | "guest";
  name: string;
  trueName: string | null;
  kills: number;
  rank: number;
  durationMs: number;
  maxMass: number;
} | null;

export type RoomHistoryItem = {
  id: number;
  name: string;
  visibility: string;
  isDefault: boolean;
  maxPlayers: number | null;
  maxDurationMin: number | null;
  startedAt: Date;
  endedAt: Date | null;

  createdBy: PublicUser | null;

  playersCount: number;

  leaderboard: RoomLeaderboardEntry[];

  winner: RoomWinner;
};

export type UserGuest = "user" | "guest";

export type GetRoomHistoryDbReturn = {
  id: number;
  name: string;
  visibility: string;
  isDefault: boolean;
  startedAt: Date;
  endedAt: Date | null;
  maxPlayers: number | null;
  maxDurationMin: number | null;

  createdBy: PublicUser | null;

  leaderboard: RoomLeaderboardEntry[];
};

export type PlayerHistoryRoomPreview = {
  id: number;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  visibility: string;
  isDefault: boolean;
};

export type PlayerHistoryWithRoom = {
  id: number;
  roomId: number;
  userId: number | null;
  guestId: string | null;
  name: string;

  durationMs: number;
  maxMass: number;
  kills: number;
  rank: number | null;
  isWinner: boolean;

  createdAt: Date;

  room: PlayerHistoryRoomPreview;
};

