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

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

// export interface InputState {
//   mouseX: number;
//   mouseY: number;
//   // seq: number;
//   dt: number;
// }

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

export type LeaderboardEntry = {
  id: string;
  name: string;
  totalMass: number;
  rank: number;
  isMe: boolean;
  decayMultiplier: number;
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
  durationMin: number | undefined;
  startedAt: number | undefined;
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

export type FinalLeaderboardEntry = {
  id: string;
  name: string;
  rank: number;
  kills: number;
  maxMass: number;
};

export type FinalStatus = {
  id: string;
  name: string;
  kills: number;
  maxMass: number;
};

export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "started";

export type RoomMeta = {
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
};

export type WorldHistory = {
  playerName: string;
  maxMass: number;
  kills: number;
  durationMs: number;
};

export type World = {
  players: Record<string, PlayerState>;
  orbs: Orb[];
  ejects: Eject[];
  viruses: Virus[];
  meta: RoomMeta;
};

export type CreateRoomPayload = {
  room: string;
  name: string;
  visibility: RoomVisibility;
  maxPlayers: number;
  durationMin: number;
  allowSpectators: boolean;
};

export type JoinRoomPayload = {
  room: string;
  name: string;
  key?: string;
  spectator: boolean;
};

export type Identity = {
  type: string;
  userId?: number;
  guestId?: string;
};

export type ActivePlayer = {
  identity: Identity;
  roomName: string;

  socketId: string;
  sessionId: string;
  disconnectedAt?: number;
  timeoutId?: NodeJS.Timeout;
};
