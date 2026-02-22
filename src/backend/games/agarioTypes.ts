export interface Identity {
  type: string;
  userId?: number;
  guestId?: string;
}

export interface ActivePlayer {
  identity: Identity;
  roomName: string;

  socketId: string;
  disconnectedAt?: number;
  timeoutId?: NodeJS.Timeout;
}
