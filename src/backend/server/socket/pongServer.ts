import type { GameSnapshot, Side } from "../../../shared/pong/gameTypes";

export const GAME_WIDTH = 810;
export const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 16;
const PADDLE_HEIGHT = 100;
const PADDLE_SPEED = 520;
const BALL_RADIUS = 10;
const INITIAL_BALL_SPEED = 380;
const MAX_SPEED = 900;
const MIN_SPEED = 140;
const WIN_SCORE = 5;
const COUNTDOWN_SECONDS = 4;

export type Phase = "waiting" | "countdown" | "playing" | "gameover";

export interface Ball {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  trail: { x: number; y: number }[];
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  score: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
}

export interface ServerGameState {
  phase: Phase;
  winner: Side | null;
  combo: number;
  maxCombo: number;
  ball: Ball;
  left: Paddle;
  right: Paddle;
  countdown: number; // seconds remaining
  countdownTimer: number; // internal timer accumulator
}

export interface MatchInputs {
  left: InputState;
  right: InputState;
}

function randomDirection() {
  return Math.random() > 0.5 ? 1 : -1;
}

function randomSpeedY(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createBall(): Ball {
  return {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    radius: BALL_RADIUS,
    speedX: randomDirection() * INITIAL_BALL_SPEED,
    speedY: randomDirection(),
    trail: [],
  };
}

function createPaddle(x: number): Paddle {
  return {
    x,
    y: (GAME_HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: PADDLE_SPEED,
    score: 0,
  };
}

export function createInitialState(): ServerGameState {
  return {
    phase: "waiting",
    winner: null,
    combo: 0,
    maxCombo: 0,
    ball: createBall(),
    left: createPaddle(40),
    right: createPaddle(GAME_WIDTH - 40 - PADDLE_WIDTH),
    countdown: COUNTDOWN_SECONDS,
    countdownTimer: 0,
  };
}

/** ===== Swept collision (segment vs. expanded AABB) ===== */
function sweptPaddleHit(
  bx: number,
  by: number,
  vx: number,
  vy: number,
  r: number,
  p: Paddle
): number | null {
  const x0 = bx,
    y0 = by,
    x1 = bx + vx,
    y1 = by + vy;
  const dx = x1 - x0,
    dy = y1 - y0;

  const minX = p.x - r,
    maxX = p.x + p.width + r;
  const minY = p.y - r,
    maxY = p.y + p.height + r;

  let t0 = 0,
    t1 = 1;
  const clip = (p_: number, q_: number) => {
    if (p_ === 0) return q_ <= 0;
    const r_ = q_ / p_;
    if (p_ < 0) {
      if (r_ > t1) return false;
      if (r_ > t0) t0 = r_;
    } else {
      if (r_ < t0) return false;
      if (r_ < t1) t1 = r_;
    }
    return true;
  };

  if (
    clip(-dx, x0 - minX) &&
    clip(dx, maxX - x0) &&
    clip(-dy, y0 - minY) &&
    clip(dy, maxY - y0)
  )
    return t0;
  return null;
}

function handlePaddleCollision(
  state: ServerGameState,
  paddle: Paddle,
  isLeft: boolean
) {
  const { ball } = state;

  const paddleCenter = paddle.y + paddle.height / 2;
  const hitPos = (ball.y - paddleCenter) / (paddle.height / 2); // -1..1
  const maxBounce = Math.PI / 4; // 45°
  const angle = Math.max(-maxBounce, Math.min(maxBounce, hitPos * maxBounce));

  const curSpeed = Math.hypot(ball.speedX, ball.speedY);
  const nextBase = Math.min(MAX_SPEED, curSpeed * (1.05 + state.combo * 0.01));

  const minAbsX = 140;
  let newVX = Math.cos(angle) * nextBase * (isLeft ? 1 : -1);
  let newVY = Math.sin(angle) * nextBase;

  if (Math.abs(newVX) < minAbsX) {
    const sign = isLeft ? 1 : -1;
    const keepSpeed = Math.hypot(minAbsX, newVY);
    const scale = nextBase / keepSpeed;
    newVX = minAbsX * sign;
    newVY *= scale;
  }

  ball.speedX = newVX;
  ball.speedY = newVY;

  ball.x = isLeft
    ? paddle.x + paddle.width + ball.radius
    : paddle.x - ball.radius;

  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
}

function resetBall(state: ServerGameState) {
  // Create fresh ball with initial speed (not carried over from previous round)
  state.ball = createBall();
  state.combo = 0;
  // Reset paddles to center position
  state.left.y = (GAME_HEIGHT - state.left.height) / 2;
  state.right.y = (GAME_HEIGHT - state.right.height) / 2;
  // Start countdown phase between rounds
  state.phase = "countdown";
  state.countdown = COUNTDOWN_SECONDS;
  state.countdownTimer = 0;
}

export function stepServerGame(
  state: ServerGameState,
  inputs: MatchInputs,
  dt: number
) {
  // Handle countdown phase - no paddle control allowed
  if (state.phase === "countdown") {
    state.countdownTimer += dt;
    if (state.countdownTimer >= 1) {
      state.countdownTimer -= 1;
      state.countdown -= 1;
    }
    // Transition to playing when countdown finishes
    if (state.countdown <= 0) {
      state.phase = "playing";
      state.countdown = 0;
    }
    return;
  }

  if (state.phase !== "playing") return;

  const { left, right, ball } = state;

  // === paddles ===
  const movePaddle = (p: Paddle, input: InputState) => {
    let dy = 0;
    if (input.up) dy -= p.speed * dt;
    if (input.down) dy += p.speed * dt;
    p.y += dy;
    p.y = Math.max(0, Math.min(GAME_HEIGHT - p.height, p.y));
  };

  movePaddle(left, inputs.left);
  movePaddle(right, inputs.right);

  // === ball + paddle collisions (swept) ===
  const vx = ball.speedX * dt;
  const vy = ball.speedY * dt;

  let tHit = sweptPaddleHit(ball.x, ball.y, vx, vy, ball.radius, left);
  let hitSide: Side | null = tHit !== null ? "left" : null;

  const tRight = sweptPaddleHit(ball.x, ball.y, vx, vy, ball.radius, right);
  if (tRight !== null && (tHit === null || tRight < tHit)) {
    tHit = tRight;
    hitSide = "right";
  }

  if (tHit !== null && hitSide) {
    ball.x += vx * tHit;
    ball.y += vy * tHit;
    handlePaddleCollision(
      state,
      hitSide === "left" ? left : right,
      hitSide === "left"
    );
    const remain = 1 - tHit;
    ball.x += ball.speedX * dt * remain;
    ball.y += ball.speedY * dt * remain;
  } else {
    ball.x += vx;
    ball.y += vy;
  }

  // === walls ===
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.speedY = Math.abs(ball.speedY);
  } else if (ball.y + ball.radius > GAME_HEIGHT) {
    ball.y = GAME_HEIGHT - ball.radius;
    ball.speedY = -Math.abs(ball.speedY);
  }

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 10) ball.trail.shift();

  // === scoring ===
  if (ball.x + ball.radius < 0) {
    right.score++;
    resetBall(state);
    if (right.score >= WIN_SCORE) {
      state.phase = "gameover";
      state.winner = "right";
    }
  } else if (ball.x - ball.radius > GAME_WIDTH) {
    left.score++;
    resetBall(state);
    if (left.score >= WIN_SCORE) {
      state.phase = "gameover";
      state.winner = "left";
    }
  }
}

export function toSnapshot(state: ServerGameState): GameSnapshot {
  return {
    phase: state.phase,
    winner: state.winner,
    ball: {
      x: state.ball.x,
      y: state.ball.y,
      radius: state.ball.radius,
      trail: [...state.ball.trail],
    },
    left: {
      y: state.left.y,
      height: state.left.height,
      score: state.left.score,
    },
    right: {
      y: state.right.y,
      height: state.right.height,
      score: state.right.score,
    },
    combo: state.combo,
    maxCombo: state.maxCombo,
    countdown: state.countdown,
  };
}
