import { beepSound } from "@/utils/sound";
import createAIOpponent, { AIOpponent } from "@/game/pong/ai";
import {
  AIConfig,
  AIObject,
  AiPos,
  Ball,
  Difficulty,
  DifficultyPreset,
  GameStatus,
  Paddle,
  Winner,
} from "@/game/pong/types";
import {
  CONFIG,
  INITIAL_Y,
  LEFT_X,
  MAX_SPEED,
  MIN_SPEED,
  PADDLE_WIDTH,
  RADIUS,
  RIGHT_X,
  WIN_SCORE,
} from "@/game/pong/config";
import { GameColors, PlayerProfile, BoolRef } from "./models";
import { GameTheme } from "./visuals";

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 160;
    this.vy = (Math.random() - 0.5) * 160;
    this.life = 1;
    this.decay = 0.9;
    this.color = color;
    this.size = Math.random() * 3 + 2;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life *= Math.pow(this.decay, dt * 60);
    this.vx *= 1 - 0.02 * dt * 60;
    this.vy *= 1 - 0.02 * dt * 60;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export type RunPongEngineParams = {
  canvas: HTMLCanvasElement;
  difficulty: Difficulty;
  isSingle: boolean;
  isAI: boolean;
  aiPos: AiPos;

  leftPlayer: PlayerProfile;
  rightPlayer: PlayerProfile;
  gameColors: GameColors;

  currentTheme: GameTheme;
  soundOnRef: BoolRef;
};

export function runPongEngine(params: RunPongEngineParams): () => void {
  const {
    canvas,
    difficulty,
    isSingle,
    isAI,
    aiPos,
    leftPlayer,
    rightPlayer,
    gameColors,
    currentTheme,
    soundOnRef,
  } = params;

  const ctx = canvas.getContext("2d")!;
  if (!ctx) return () => {};

  const currentConfig = getConfig(difficulty);

  let phase: GameStatus = "start";
  let winner: Winner = null;
  let animationId: number | null = null;
  let lastTime = 0;
  let combo = 0;
  let maxCombo = 0;

  const keys: Record<string, boolean> = {};
  const particles: Particle[] = [];

  const leftPaddle = createPaddle(
    LEFT_X,
    INITIAL_Y,
    PADDLE_WIDTH,
    currentConfig.paddleHeight,
    currentConfig.paddleSpeed,
  );
  const rightPaddle = createPaddle(
    RIGHT_X,
    INITIAL_Y,
    PADDLE_WIDTH,
    currentConfig.paddleHeight,
    currentConfig.paddleSpeed,
  );
  let ball: Ball = createBall(canvas, currentConfig.ballSpeed);

  function getConfig(d: Difficulty): DifficultyPreset {
    return CONFIG[d];
  }

  function randomDirection() {
    return Math.random() > 0.5 ? 1 : -1;
  }

  function randomSpeedY(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  function getBall() {
    return ball;
  }

  function createBall(canvasEl: HTMLCanvasElement, ballSpeed: number): Ball {
    return {
      x: canvasEl.width / 2,
      y: canvasEl.height / 2,
      radius: RADIUS,
      speedX: randomDirection() * ballSpeed,
      speedY: randomDirection() * randomSpeedY(MIN_SPEED, MAX_SPEED),
      trail: [],
    };
  }

  function createPaddle(
    x: number,
    y: number,
    width: number,
    height: number,
    speed: number,
  ): Paddle {
    return { x, y, width, height, speed, score: 0 };
  }

  function resetBall() {
    ball = createBall(canvas, currentConfig.ballSpeed);
    combo = 0;
  }

  function getControls() {
    if (isAI && isSingle) return aiPos;
    return "both";
  }

  const aiConfig: AIConfig = {
    enabled: isAI || isSingle,
    controls: getControls(),
    reactionDelayMs: currentConfig.aiReactionDelayMs,
  };

  const ais = configAiOpponent(aiConfig);

  function sweptPaddleHit(
    bx: number,
    by: number,
    vx: number,
    vy: number,
    r: number,
    p: Paddle,
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

  function handlePaddleCollision(paddle: Paddle, isLeft: boolean) {
    const paddleCenter = paddle.y + paddle.height / 2;
    const hitPos = (ball.y - paddleCenter) / (paddle.height / 2);
    const maxBounce = Math.PI / 4;
    const angle = Math.max(-maxBounce, Math.min(maxBounce, hitPos * maxBounce));

    const curSpeed = Math.hypot(ball.speedX, ball.speedY);
    const nextBase = Math.min(900, curSpeed * (1.05 + combo * 0.01));

    const minAbsx = 140;
    let newVX = Math.cos(angle) * nextBase * (isLeft ? 1 : -1);
    let newVY = Math.sin(angle) * nextBase;

    if (Math.abs(newVX) < minAbsx) {
      const sign = isLeft ? 1 : -1;
      const keepSpeed = Math.hypot(minAbsx, newVY);
      const scale = nextBase / keepSpeed;
      newVX = minAbsx * sign;
      newVY *= scale;
    }

    ball.speedX = newVX;
    ball.speedY = newVY;

    ball.x = isLeft
      ? paddle.x + paddle.width + ball.radius
      : paddle.x - ball.radius;

    combo++;
    maxCombo = Math.max(maxCombo, combo);
    beepSound(soundOnRef.current, 440);
  }

  function configAiOpponent(cfg: AIConfig): AIObject {
    if (!cfg.enabled) return {};

    const aiObjects: { leftAI?: AIOpponent; rightAI?: AIOpponent } = {};

    if (cfg.controls === "left" || cfg.controls === "both") {
      aiObjects.leftAI = createAIOpponent({
        paddle: leftPaddle,
        isLeft: true,
        canvas: { width: canvas.width, height: canvas.height },
        reactionDelayMs: cfg.reactionDelayMs,
        paddleHeight: currentConfig.paddleHeight,
        getBall,
      });
    }

    if (cfg.controls === "right" || cfg.controls === "both") {
      aiObjects.rightAI = createAIOpponent({
        paddle: rightPaddle,
        isLeft: false,
        canvas: { width: canvas.width, height: canvas.height },
        reactionDelayMs: cfg.reactionDelayMs,
        paddleHeight: currentConfig.paddleHeight,
        getBall,
      });
    }

    return aiObjects;
  }

  function update(dt: number, tFrame: number) {
    if (phase !== "playing") return;

    let dyL = 0;
    let dyR = 0;

    if (aiConfig.enabled && ais.leftAI) {
      const aiKeys = ais.leftAI.update(tFrame);
      if (aiKeys.up) dyL -= leftPaddle.speed * dt;
      if (aiKeys.down) dyL += leftPaddle.speed * dt;
    } else {
      if (keys["w"] || keys["W"]) dyL -= leftPaddle.speed * dt;
      if (keys["s"] || keys["S"]) dyL += leftPaddle.speed * dt;
    }

    if (aiConfig.enabled && ais.rightAI) {
      const aiKeys = ais.rightAI.update(tFrame);
      if (aiKeys.up) dyR -= rightPaddle.speed * dt;
      if (aiKeys.down) dyR += rightPaddle.speed * dt;
    } else {
      if (keys["ArrowUp"]) dyR -= rightPaddle.speed * dt;
      if (keys["ArrowDown"]) dyR += rightPaddle.speed * dt;
    }

    leftPaddle.y += dyL;
    rightPaddle.y += dyR;

    leftPaddle.y = Math.max(
      0,
      Math.min(canvas.height - leftPaddle.height, leftPaddle.y),
    );
    rightPaddle.y = Math.max(
      0,
      Math.min(canvas.height - rightPaddle.height, rightPaddle.y),
    );

    const vx = ball.speedX * dt;
    const vy = ball.speedY * dt;

    let tHit = sweptPaddleHit(ball.x, ball.y, vx, vy, ball.radius, leftPaddle);
    let hitSide: "left" | "right" | null = tHit !== null ? "left" : null;

    const tRight = sweptPaddleHit(
      ball.x,
      ball.y,
      vx,
      vy,
      ball.radius,
      rightPaddle,
    );
    if (tRight !== null && (tHit === null || tRight < tHit)) {
      tHit = tRight;
      hitSide = "right";
    }

    if (tHit !== null) {
      ball.x += vx * tHit;
      ball.y += vy * tHit;

      handlePaddleCollision(
        hitSide === "left" ? leftPaddle : rightPaddle,
        hitSide === "left",
      );

      const remain = 1 - tHit;
      ball.x += ball.speedX * dt * remain;
      ball.y += ball.speedY * dt * remain;
    } else {
      ball.x += vx;
      ball.y += vy;
    }

    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.speedY = Math.abs(ball.speedY);
      beepSound(soundOnRef.current, 520, 0.05, 0.15);
    } else if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.speedY = -Math.abs(ball.speedY);
      beepSound(soundOnRef.current, 520, 0.05, 0.15);
    }

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();

    if (ball.x + ball.radius < 0) {
      rightPaddle.score++;
      beepSound(
        soundOnRef.current,
        rightPaddle.score >= WIN_SCORE ? 659 : 523,
        0.12,
        0.3,
      );
      if (rightPaddle.score >= WIN_SCORE) {
        winner = "right";
        phase = "gameover";
        maxCombo = Math.max(maxCombo, combo);
      } else {
        phase = "scored";
      }
    } else if (ball.x - ball.radius > canvas.width) {
      leftPaddle.score++;
      beepSound(
        soundOnRef.current,
        leftPaddle.score >= WIN_SCORE ? 659 : 523,
        0.12,
        0.3,
      );
      if (leftPaddle.score >= WIN_SCORE) {
        winner = "left";
        phase = "gameover";
        maxCombo = Math.max(maxCombo, combo);
      } else {
        phase = "scored";
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt);
      if (particles[i].life <= 0.02) particles.splice(i, 1);
    }
  }

  function drawCenterLine() {
    const style = currentTheme.centerLineStyle;
    const color = currentTheme.centerLine;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    if (style === "dashed") {
      const gradient = ctx.createLinearGradient(
        canvas.width / 2 - 2,
        0,
        canvas.width / 2 + 2,
        0,
      );
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, "transparent");
      ctx.strokeStyle = gradient;
      ctx.setLineDash([10, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (style === "solid") {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (style === "dots") {
      ctx.fillStyle = color;
      for (let y = 10; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (style === "glow") {
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
  }

  function draw() {
    // Draw background
    if (currentTheme.backgroundGradient) {
      currentTheme.backgroundGradient(ctx, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = currentTheme.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw center line
    drawCenterLine();

    const centered = (text: string, y: number) => {
      ctx.font = "32px monospace";
      ctx.fillStyle = currentTheme.textColor;
      const w = ctx.measureText(text).width;
      ctx.fillText(text, (canvas.width - w) / 2, y);
    };

    if (phase === "start") {
      centered("Press SPACE to Start", canvas.height / 2);
    } else if (phase === "paused") {
      centered("Paused - Press P to Resume", canvas.height / 2);
    } else if (phase === "scored") {
      centered("Point! Press SPACE to Continue", canvas.height / 2);
    } else if (phase === "gameover") {
      const winnerName = winner === "left" ? leftPlayer.name : rightPlayer.name;
      centered(`${winnerName} Wins!`, canvas.height / 2 - 40);
      if (maxCombo > 0) {
        ctx.font = "20px monospace";
        ctx.fillStyle = currentTheme.comboColor;
        const t = `Max Combo: ${maxCombo}`;
        const w = ctx.measureText(t).width;
        ctx.fillText(t, (canvas.width - w) / 2, canvas.height / 2);
      }
      centered("Press SPACE to Restart", canvas.height / 2 + 40);
    }

    particles.forEach((p) => p.draw(ctx));

    // Ball trail
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const a = (i / ball.trail.length) * 0.3;
      ctx.globalAlpha = a;
      ctx.fillStyle = gameColors.ballColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (currentTheme.glowEnabled) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = leftPlayer.paddleColor;
    }
    ctx.fillStyle = leftPlayer.paddleColor;
    ctx.fillRect(
      leftPaddle.x,
      leftPaddle.y,
      leftPaddle.width,
      leftPaddle.height,
    );

    if (currentTheme.glowEnabled) {
      ctx.shadowColor = rightPlayer.paddleColor;
    }
    ctx.fillStyle = rightPlayer.paddleColor;
    ctx.fillRect(
      rightPaddle.x,
      rightPaddle.y,
      rightPaddle.width,
      rightPaddle.height,
    );
    ctx.shadowBlur = 0;

    if (currentTheme.glowEnabled) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = gameColors.ballColor;
    }
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gameColors.ballColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "bold 48px monospace";
    ctx.fillStyle = currentTheme.scoreColor;
    ctx.fillText(leftPaddle.score.toString(), canvas.width / 4 - 12, 60);
    ctx.fillText(rightPaddle.score.toString(), (canvas.width * 3) / 4 - 12, 60);

    if (combo > 2 && phase === "playing") {
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = currentTheme.comboColor;
      const text = `${combo}x COMBO!`;
      const w = ctx.measureText(text).width;
      ctx.fillText(text, (canvas.width - w) / 2, 100);
    }
  }

  function gameLoop(now: number) {
    try {
      const dt = lastTime ? (now - lastTime) / 1000 : 0;
      lastTime = now;
      update(dt, now);
      draw();
    } catch {
      if (animationId) cancelAnimationFrame(animationId);
      return;
    }
    animationId = requestAnimationFrame(gameLoop);
  }

  const controlKeys = new Set([" ", "ArrowUp", "ArrowDown", "w", "s", "p"]);

  function handleKeyDown(e: KeyboardEvent) {
    if (controlKeys.has(e.key)) e.preventDefault();
    keys[e.key] = true;

    if (phase === "start" && e.key === " ") {
      leftPaddle.score = 0;
      rightPaddle.score = 0;
      resetBall();
      phase = "playing";
      combo = 0;
      maxCombo = 0;
      beepSound(soundOnRef.current, 440, 0.06, 0.2);
    } else if (phase === "playing" && e.key === "p") {
      phase = "paused";
      beepSound(soundOnRef.current, 330, 0.05, 0.18);
    } else if (phase === "paused" && e.key === "p") {
      phase = "playing";
      beepSound(soundOnRef.current, 440, 0.05, 0.18);
    } else if (phase === "scored" && e.key === " ") {
      resetBall();
      phase = "playing";
    } else if (phase === "gameover" && e.key === " ") {
      phase = "start";
      leftPaddle.score = 0;
      rightPaddle.score = 0;
      winner = null;
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (controlKeys.has(e.key)) e.preventDefault();
    keys[e.key] = false;
  }

  document.addEventListener("keydown", handleKeyDown, { passive: false });
  document.addEventListener("keyup", handleKeyUp, { passive: false });

  animationId = requestAnimationFrame(gameLoop);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    if (animationId) cancelAnimationFrame(animationId);
  };
}
