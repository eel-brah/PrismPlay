export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  totalMass: number;
  rank: number;
  isMe: boolean;
  decayMultiplier: number;
}

export interface RoomInfo {
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
}

export interface LobbyPlayer {
  id: string;
  name: string;
}

export type AlertType = "error" | "warning" | "info" | "";
