export type Side = "left" | "right";
export type Phase = "waiting" | "countdown" | "playing" | "gameover";

export interface PlayerProfile {
  id: number;
  nickname: string;
  email: string;
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
  countdown: number;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  winrate: number;
}

export interface MatchFoundPayload {
  matchId: string;
  side: Side;
  opponent: PlayerProfile;
  playerStats: PlayerStats;
  opponentStats: PlayerStats;
}

export interface MatchResultPayload {
  matchId: string;
  winnerSide: Side;
  leftScore: number;
  rightScore: number;
}

export interface ServerToClientEvents {
  "match.waiting": () => void;
  "match.found": (payload: MatchFoundPayload) => void;
  "match.cancelled": () => void;
  "match.reconnected": (payload: {
    matchId: string;
    side: Side;
    snapshot: GameSnapshot;
    opponent: PlayerProfile;
  }) => void;
  "match.surrendered": (payload: { matchId: string }) => void;
  "game.state": (snapshot: GameSnapshot) => void;
  "game.over": (payload: {
    matchId: string;
    winnerSide: Side;
    leftScore: number;
    rightScore: number;
    reason?: "score" | "surrender" | "disconnect";
  }) => void;
  "opponent.disconnected": () => void;
  "opponent.connectionLost": (payload: { timeout: number }) => void;
  "opponent.reconnected": () => void;
  "opponent.surrendered": () => void;
  "opponent.left": () => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  "match.join": (profile: PlayerProfile) => void;
  "match.leave": () => void;
  "match.surrender": () => void;
  "input.update": (payload: { up: boolean; down: boolean }) => void;
}
