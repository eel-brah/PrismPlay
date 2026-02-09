import { Config } from "./types";

export const PADDLE_HEIGHT = 80;

export const PADDLE_WIDTH = 20;
export const INITIAL_Y = 260;
export const LEFT_X = 10;
export const RIGHT_X = 780;
export const WIN_SCORE = 5;
export const RADIUS = 8;
export const MIN_SPEED = 120;
export const MAX_SPEED = 280;
export const CONFIG: Config = {
  easy: {
    ballSpeed: 320,
    paddleSpeed: 520,
    aiReactionDelayMs: 120,
    paddleHeight: 120,
  },
  medium: {
    ballSpeed: 380,
    paddleSpeed: 640,
    aiReactionDelayMs: 60,
    paddleHeight: 100,
  },
  hard: {
    ballSpeed: 440,
    paddleSpeed: 760,
    aiReactionDelayMs: 0,
    paddleHeight: 80,
  },
};
