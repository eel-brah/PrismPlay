import { AIOpponent } from "./ai";

export type Difficulty = "easy" | "medium" | "hard";
export type GameStatus = "start" | "playing" | "paused" | "scored" | "gameover";
export type Winner = "left" | "right" | null;
export type AiPos = "left" | "right";

export type Config = Record<Difficulty, DifficultyPreset>;

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  score: number;
}
export interface TrailPoint {
  x: number;
  y: number;
}
export interface Ball {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  trail: TrailPoint[];
}

export interface DifficultyPreset {
  ballSpeed: number;
  paddleSpeed: number;
  aiReactionDelayMs: number;
  paddleHeight: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface AIConfig {
  enabled: boolean;
  controls: "left" | "right" | "both";
  reactionDelayMs: number;
}

export interface AIObject {
  leftAI?: AIOpponent;
  rightAI?: AIOpponent;
}
