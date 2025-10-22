import { PADDLE_HEIGHT, VELOCITY_X } from "./config";
import { Ball, Paddle, CanvasSize } from "./types";

interface AIKeys {
  up: boolean;
  down: boolean;
}

interface AIState {
  targetY: number;
  lastUpdate: number;
  error: number;
  tolerance: number;
  reactionDelayMs: number;
  decisionMadeAt: number;
}

export interface AIOpponent {
  update: (now: number) => AIKeys;
  keys: AIKeys;
  state: AIState;
}

interface CreateAIOpponentParams {
  paddle: Paddle;
  isLeft: boolean;
  canvas: CanvasSize;
  getBall: () => Ball;
}

export default function createAIOpponent({
  paddle,
  isLeft,
  canvas,
  getBall,
}: CreateAIOpponentParams): AIOpponent {
  const state: AIState = {
    targetY: canvas.height / 2,
    lastUpdate: 0,
    error: 10,
    tolerance: PADDLE_HEIGHT / 10,
    reactionDelayMs: 120,
    decisionMadeAt: 0,
  };

  const keys: AIKeys = { up: false, down: false };

  function reflectY(y: number, height: number): number {
    const period = 2 * height;
    const r = ((y % period) + period) % period;
    return r <= height ? r : 2 * height - r;
  }

  function predictBallY(ball: Ball, paddleX: number): number {
    if (ball.speedX === 0) return canvas.height / 2;

    const movingTowardAI = isLeft
      ? ball.speedX < 0 && ball.x > paddleX
      : ball.speedX > 0 && ball.x < paddleX; // remove the unnecessary check

    if (!movingTowardAI) return canvas.height / 2;

    const dx = paddleX - ball.x;
    const timex = dx / ball.speedX; // time to reach the paddle
    const rawY = ball.y + ball.speedY * timex;
    return reflectY(rawY, canvas.height);
  }

  function update(now: number): AIKeys {
    if (now - state.lastUpdate >= 1000) {
      state.lastUpdate = now;
      const ball = getBall();
      let pred = predictBallY(ball, paddle.x);
      pred = addRandomNoise(pred, state.error);
      state.targetY = Math.max(0, Math.min(canvas.height, pred));
      state.decisionMadeAt = now;
    }

    if (now - state.decisionMadeAt >= state.reactionDelayMs) {
      const paddleCenter = paddle.y + paddle.height / 2;
      if (paddleCenter < state.targetY - state.tolerance) {
        pressDown();
      } else if (paddleCenter > state.targetY + state.tolerance) {
        pressUp();
      } else {
        releaseKeys();
      }
    } else {
      releaseKeys();
    }

    return keys;
  }

  function pressUp(): void {
    keys.up = true;
    keys.down = false;
  }

  function pressDown(): void {
    keys.down = true;
    keys.up = false;
  }

  function releaseKeys(): void {
    keys.up = false;
    keys.down = false;
  }

  function addRandomNoise(pred: number, error: number): number {
    return pred + (Math.random() * 2 - 1) * error;
  }

  return { update, keys, state };
}
