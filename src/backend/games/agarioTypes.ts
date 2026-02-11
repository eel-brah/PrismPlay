import { RoomVisibility } from "../../shared/agario/types.js";

export interface CreateRoomPayload {
  room: string;
  name: string;
  visibility: RoomVisibility;
  maxPlayers: number;
  durationMin: number;
  allowSpectators: boolean;
}

export interface Identity {
  type: string;
  userId?: number;
  guestId?: string;
}

export interface JoinRoomPayload {
  room: string;
  name: string;
  key?: string;
  spectator: boolean;
}

export interface ActivePlayer {
  identity: Identity;
  roomName: string;

  socketId: string;
  sessionId: string;
  disconnectedAt?: number;
  timeoutId?: NodeJS.Timeout;
}
