export type Side = "left" | "right";
export type Phase = "waiting" | "countdown" | "playing" | "gameover";

export interface PlayerProfile {
  id: string; // some stable identifier (UUID, user id, etc.)
  nickname: string;
  avatarUrl?: string;
}

export interface BallSnapshot {
  x: number;
  y: number;
  radius: number;
  trail: { x: number; y: number }[];
}

export interface PaddleSnapshot {
  y: number;
  height: number;
  score: number;
}

export interface GameSnapshot {
  phase: Phase;
  winner: Side | null;
  ball: BallSnapshot;
  left: PaddleSnapshot;
  right: PaddleSnapshot;
  combo: number;
  maxCombo: number;
  countdown: number; // seconds remaining in countdown (0 when not in countdown)
}

export interface MatchFoundPayload {
  matchId: string;
  side: Side;
  opponent: PlayerProfile;
}

export interface MatchResultPayload {
  matchId: string;
  winnerSide: Side;
  leftScore: number;
  rightScore: number;
}

export interface ClientToServerEvents {
  "match.join": (profile: PlayerProfile) => void;
  "input.update": (payload: { up: boolean; down: boolean }) => void;
  "match.leave": () => void;
}

export interface ServerToClientEvents {
  "match.waiting": () => void;
  "match.found": (payload: MatchFoundPayload) => void;
  "game.state": (snapshot: GameSnapshot) => void;
  "game.over": (payload: MatchResultPayload) => void;
  "opponent.disconnected": () => void;
}