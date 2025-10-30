// frontend/game/index.ts
import createAIOpponent, { AIOpponent } from "./ai";
import {
  BALL_REDIUS,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_WIDTH,
  VELOCITY_X,
  VELOCITY_Y,
} from "./config";
import { Paddle, Ball, CanvasSize, AIConfig, AIObject } from "./types";

export type GameState = "start" | "playing" | "paused" | "scored" | "gameover";

export function createPongGame(
  canvas: HTMLCanvasElement,
  fpsEl?: HTMLElement | null,
  aiConfigOverride?: Partial<AIConfig>
) {
  const ctx = canvas.getContext("2d")!;
  const fpsCounter = fpsEl ?? null;

  // Colors & Fonts
  const COLORS = {
    background: "#181825",
    paddle: "#89b4fa",
    ball: "#f5e0dc",
    line: "#cdd6f4",
    text: "#cdd6f4",
  };
  const FONTS = {
    main: "32px monospace",
  };

  // Audio
  const hitSound = new Audio("/audio/hit.mp3");
  const lossSound = new Audio("/audio/loss.mp3");
  const scoreSound = new Audio("/audio/score.mp3");
  const winSound = new Audio("/audio/win.mp3");
  hitSound.volume = 0.4;
  scoreSound.volume = 0.6;
  winSound.volume = 0.4;

  // Game state
  let gameState: GameState = "start";
  let winner: "left" | "right" | null = null;

  // Input Tracking
  const keys: Record<string, boolean> = {};

  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.key] = true;
    if (gameState === "start" && e.key === " ") startGame();
    else if (gameState === "playing" && e.key === "p") gameState = "paused";
    else if (gameState === "paused" && e.key === "p") gameState = "playing";
    else if (gameState === "scored" && e.key === " ") {
      resetBall();
      gameState = "playing";
    } else if (gameState === "gameover" && e.key === " ") {
      gameState = "start";
      leftScore = 0;
      rightScore = 0;
      winner = null;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.key] = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function createPaddle(x: number, y: number): Paddle {
    return {
      x,
      y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: PADDLE_SPEED,
    };
  }

  // Game objects
  const leftPaddle: Paddle = createPaddle(20, 260);
  const rightPaddle: Paddle = createPaddle(
    canvas.width - 20 - PADDLE_WIDTH,
    260
  );
  const ball: Ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: BALL_REDIUS,
    speedX: VELOCITY_X,
    speedY: VELOCITY_Y,
  };

  let leftScore = 0;
  let rightScore = 0;
  const winScore = 5;

  // Fixed timestep (you’re using variable-step below; keeping this here for parity)
  // const tickLength = 20;
  // let lastTick = performance.now();
  // let lastRender = lastTick;

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const direction = Math.random() > 0.5 ? 1 : -1;
    ball.speedX = 5 * direction;
    ball.speedY = (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1);
  }

  function startGame() {
    leftScore = 0;
    rightScore = 0;
    resetBall();
    gameState = "playing";
  }

  function drawCenteredText(text: string, y: number) {
    ctx.font = FONTS.main;
    ctx.fillStyle = COLORS.text;
    const width = ctx.measureText(text).width;
    ctx.fillText(text, (canvas.width - width) / 2, y);
  }

  const getBall = () => ball;

  function update(tickTime: number, aiConfig: AIConfig, ais: AIObject) {
    if (gameState !== "playing") return;

    // LEFT SIDE (AI or player)
    if (aiConfig.enabled && ais.leftAI) {
      const aiKeys = ais.leftAI.update(tickTime);
      if (aiKeys.up) leftPaddle.y -= leftPaddle.speed;
      if (aiKeys.down) leftPaddle.y += leftPaddle.speed;
    } else {
      if (keys["w"]) leftPaddle.y -= leftPaddle.speed;
      if (keys["s"]) leftPaddle.y += leftPaddle.speed;
    }

    // RIGHT SIDE (AI or player)
    if (aiConfig.enabled && ais.rightAI) {
      const aiKeys = ais.rightAI.update(tickTime);
      if (aiKeys.up) rightPaddle.y -= rightPaddle.speed;
      if (aiKeys.down) rightPaddle.y += rightPaddle.speed;
    } else {
      if (keys["ArrowUp"]) rightPaddle.y -= rightPaddle.speed;
      if (keys["ArrowDown"]) rightPaddle.y += rightPaddle.speed;
    }

    // Keep paddles on screen
    leftPaddle.y = Math.max(
      0,
      Math.min(canvas.height - leftPaddle.height, leftPaddle.y)
    );
    rightPaddle.y = Math.max(
      0,
      Math.min(canvas.height - rightPaddle.height, rightPaddle.y)
    );

    // Move ball
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Wall collision
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
      ball.speedY = -ball.speedY;
    }

    // Paddle collisions
    checkPaddleCollision(leftPaddle, true);
    checkPaddleCollision(rightPaddle, false);

    // Score
    if (ball.x + ball.radius < 0) handleScore("right");
    else if (ball.x - ball.radius > canvas.width) handleScore("left");
  }

  function checkPaddleCollision(paddle: Paddle, isLeft: boolean) {
    if (
      ball.x + (isLeft ? -ball.radius : ball.radius) <
        paddle.x + paddle.width &&
      ball.x + (isLeft ? -ball.radius : ball.radius) > paddle.x &&
      ball.y > paddle.y &&
      ball.y < paddle.y + paddle.height
    ) {
      const center = paddle.y + paddle.height / 2;
      const hitPos = (ball.y - center) / (paddle.height / 2);
      const angle = hitPos * (Math.PI / 4);
      const speed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
      ball.speedX = Math.cos(angle) * speed * (isLeft ? 1 : -1);
      ball.speedY = Math.sin(angle) * speed;
      if (isLeft) ball.speedX = Math.abs(ball.speedX);
      else ball.speedX = -Math.abs(ball.speedX);
      ball.speedX *= 1.05;
      ball.speedY *= 1.05;
      ball.x = isLeft
        ? paddle.x + paddle.width + ball.radius
        : paddle.x - ball.radius;
      hitSound.currentTime = 0;
      hitSound.play();
    }
  }

  function handleScore(player: "left" | "right") {
    if (player === "left") leftScore++;
    else rightScore++;

    if (leftScore >= winScore || rightScore >= winScore) {
      winner = leftScore >= winScore ? "left" : "right";
      winSound.currentTime = 0;
      winSound.play();
      gameState = "gameover";
    } else {
      scoreSound.currentTime = 0;
      scoreSound.play();
      gameState = "scored";
    }
  }

  function draw(_interpolation: number) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center line
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/paused/scored/gameover overlays
    if (gameState === "start")
      drawCenteredText("Press SPACE to Start", canvas.height / 2);
    if (gameState === "gameover") {
      drawCenteredText(
        `${winner === "left" ? "Left" : "Right"} Player Wins!`,
        canvas.height / 2 - 20
      );
      drawCenteredText("Press SPACE to Restart", canvas.height / 2 + 30);
    }
    if (gameState === "paused")
      drawCenteredText("Paused - Press P to Resume", canvas.height / 2);
    if (gameState === "scored")
      drawCenteredText("Point! Press SPACE to Continue", canvas.height / 2);

    // Paddles
    ctx.fillStyle = COLORS.paddle;
    ctx.fillRect(
      leftPaddle.x,
      leftPaddle.y,
      leftPaddle.width,
      leftPaddle.height
    );
    ctx.fillRect(
      rightPaddle.x,
      rightPaddle.y,
      rightPaddle.width,
      rightPaddle.height
    );

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.fill();

    // Scores
    ctx.font = FONTS.main;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(leftScore.toString(), canvas.width / 4, 50);
    ctx.fillText(rightScore.toString(), (canvas.width * 3) / 4, 50);
  }

  // FPS counter
  let lastFrame = performance.now(),
    frames = 0,
    fps = 0;
  function updateFPS() {
    const now = performance.now();
    frames++;
    if (now - lastFrame >= 1000) {
      fps = frames;
      frames = 0;
      lastFrame = now;
      if (fpsCounter) fpsCounter.textContent = `FPS: ${fps}`;
    }
  }

  function configAiOpponent(aiConfig: AIConfig): AIObject {
    if (!aiConfig.enabled) return {};
    const aiObjects: { leftAI?: AIOpponent; rightAI?: AIOpponent } = {};
    const getBallFn = getBall;

    if (aiConfig.controls === "left" || aiConfig.controls === "both") {
      aiObjects.leftAI = createAIOpponent({
        paddle: leftPaddle,
        isLeft: true,
        canvas: { width: canvas.width, height: canvas.height },
        getBall: getBallFn,
      });
    }

    if (aiConfig.controls === "right" || aiConfig.controls === "both") {
      aiObjects.rightAI = createAIOpponent({
        paddle: rightPaddle,
        isLeft: false,
        canvas: { width: canvas.width, height: canvas.height },
        getBall: getBallFn,
      });
    }

    return aiObjects;
  }

  // AI config (overridable from React)
  const aiConfig: AIConfig = {
    enabled: true,
    controls: "both",
    ...aiConfigOverride,
  };
  const ais = configAiOpponent(aiConfig);

  let rafId = 0;
  function mainLoop(tFrame: DOMHighResTimeStamp) {
    rafId = requestAnimationFrame(mainLoop);
    update(tFrame, aiConfig, ais);
    draw(1);
    updateFPS();
  }

  // start immediately (as your original did)
  rafId = requestAnimationFrame(mainLoop);

  // public controls + cleanup for React
  function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    if (fpsCounter) fpsCounter.textContent = "";
  }

  return {
    destroy,
    // Optional helpers if you ever want to call them from React:
    startGame,
    pause: () => (gameState = "paused"),
    resume: () => (gameState = "playing"),
    state: () => ({ gameState, leftScore, rightScore, winner }),
  };
}
