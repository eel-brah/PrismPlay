import { RoomVisibility } from "../../shared/agario/types.js";


export interface Identity {
  type: string;
  userId?: number;
  guestId?: string;
}


export interface ActivePlayer {
  identity: Identity;
  roomName: string;

  socketId: string;
  sessionId: string;
  disconnectedAt?: number;
  timeoutId?: NodeJS.Timeout;
}
