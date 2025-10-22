import { Ball, Paddle, CanvasSize } from "./types";

interface AIKeys {
  up: boolean;
  down: boolean;
}

interface AIState {
  targetY: number;
  tolerance: number;
}

interface AIOpponent {
  update: () => AIKeys;
  keys: AIKeys;
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
    tolerance: 8,
  };

  const keys: AIKeys = { up: false, down: false };

  function predictBallY(ball: Ball, paddleX: number): number {
    if (ball.speedX === 0) return canvas.height / 2;

    const movingTowardAI = isLeft ? ball.speedX < 0 : ball.speedX > 0;

    if (!movingTowardAI) return canvas.height / 2;

    const dx = paddleX - ball.x;
    const timex = dx / ball.speedX; // time to reach the paddle
    const rawY = ball.y + ball.speedY * timex;
    return rawY;
  }

  function update(): AIKeys {
    state.targetY = predictBallY(getBall(), paddle.x);
    const paddleCenter = paddle.y + paddle.height / 2;
    if (paddleCenter < state.targetY - state.tolerance) {
      pressDown();
    } else if (paddleCenter > state.targetY + state.tolerance) {
      pressUp();
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

  return { update, keys };
}
