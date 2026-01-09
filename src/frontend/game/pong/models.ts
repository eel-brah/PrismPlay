export interface PlayerProfile {
  name: string;
  avatar: string;
  paddleColor: string;
}

export interface GameColors {
  ballColor: string;
  theme: string;
}

export type BoolRef = { current: boolean };
