import createAIOpponent from "./ai";
import { BALL_REDIUS, PADDLE_HEIGHT, PADDLE_SPEED, PADDLE_WIDTH, VELOCITY_X, VELOCITY_Y } from "./config";
import { Paddle, Ball, CanvasSize } from "./types";

(() => {
  // Select the canvas
  const canvas = document.getElementById("pong") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  // if (!ctx) throw new Error("2D context not available");

  const fpsCounter = document.getElementById("fpsCounter")!;

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
  type GameState = "start" | "playing" | "paused" | "scored" | "gameover";
  let gameState: GameState = "start";
  let winner: "left" | "right" | null = null;

  // Input Tracking
  const keys: Record<string, boolean> = {};

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;

    // Start the game
    if (gameState === "start" && e.key === " ") startGame();
    // Pause / Resume
    else if (gameState === "playing" && e.key === "p") gameState = "paused";
    else if (gameState === "paused" && e.key === "p") gameState = "playing";
    // Continue after scoring
    else if (gameState === "scored" && e.key === " ") {
      resetBall();
      gameState = "playing";
    } else if (gameState === "gameover" && e.key === " ") {
      gameState = "start";
      leftScore = 0;
      rightScore = 0;
      winner = null;
    }
  });
  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

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
  const rightPaddle: Paddle = createPaddle(770, 260);
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

  // Fixed timestep
  const tickLength = 20;
  let lastTick = performance.now();
  let lastRender = lastTick;

  // Helper Functions
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

  const ai = createAIOpponent({
    paddle: leftPaddle,
    isLeft: true,
    canvas: { width: canvas.width, height: canvas.height },
    getBall,
  });

  // Update
  function update(tickTime: number) {
    if (gameState !== "playing") return;

    const aiKeys = ai.update();
    if (aiKeys.up) leftPaddle.y -= leftPaddle.speed;
    if (aiKeys.down) leftPaddle.y += leftPaddle.speed;

    // Paddle movement
    // if (keys["w"]) leftPaddle.y -= leftPaddle.speed;
    // if (keys["s"]) leftPaddle.y += leftPaddle.speed;
    if (keys["ArrowUp"]) rightPaddle.y -= rightPaddle.speed;
    if (keys["ArrowDown"]) rightPaddle.y += rightPaddle.speed;

    // Keep paddles on screen
    leftPaddle.y = Math.max(
      0,
      Math.min(canvas.height - leftPaddle.height, leftPaddle.y),
    );
    rightPaddle.y = Math.max(
      0,
      Math.min(canvas.height - rightPaddle.height, rightPaddle.y),
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

  // Draw
  function draw(interpolation: number) {
    // ctx.fillStyle = COLORS.background;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    // Start screen
    if (gameState === "start")
      drawCenteredText("Press SPACE to Start", canvas.height / 2);
    if (gameState === "gameover") {
      drawCenteredText(
        `${winner === "left" ? "Left" : "Right"} Player Wins!`,
        canvas.height / 2 - 20,
      );
      drawCenteredText("Press SPACE to Restart", canvas.height / 2 + 30);
    }
    if (gameState === "paused")
      drawCenteredText("Paused - Press P to Resume", canvas.height / 2);
    if (gameState === "scored")
      drawCenteredText("Point! Press SPACE to Continue", canvas.height / 2);

    // Draw paddles
    ctx.fillStyle = COLORS.paddle;
    ctx.fillRect(
      leftPaddle.x,
      leftPaddle.y,
      leftPaddle.width,
      leftPaddle.height,
    );
    ctx.fillRect(
      rightPaddle.x,
      rightPaddle.y,
      rightPaddle.width,
      rightPaddle.height,
    );

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.fill();

    // Draw scores
    ctx.font = FONTS.main;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(leftScore.toString(), canvas.width / 4, 50);
    ctx.fillText(rightScore.toString(), (canvas.width * 3) / 4, 50);
  }

  let lastFrame = performance.now(),
    frames = 0;
  let fps = 0;
  function updateFPS() {
    const now = performance.now();
    frames++;
    if (now - lastFrame >= 1000) {
      fps = frames;
      frames = 0;
      lastFrame = now;
      fpsCounter.textContent = `FPS: ${fps}`;
    }
  }
  let stopMain = 0;

  // function mainLoop(tFrame: DOMHighResTimeStamp) {
  //   stopMain = requestAnimationFrame(mainLoop);
  //
  //   let numTicks = 0;
  //   if (tFrame > lastTick + tickLength) {
  //     const timeSinceTick = tFrame - lastTick;
  //     numTicks = Math.floor(timeSinceTick / tickLength);
  //   }
  //
  //   for (let i = 0; i < numTicks; i++) {
  //     lastTick += tickLength;
  //     update(lastTick);
  //     updateFPS();
  //   }
  //
  //   const interpolation = (tFrame - lastTick) / tickLength;
  //   draw(interpolation);
  //
  //   lastRender = tFrame;
  // }
  function mainLoop(tFrame: DOMHighResTimeStamp) {
    requestAnimationFrame(mainLoop);

    update(tFrame);
    draw(1);

    updateFPS();
  }

  mainLoop(performance.now());
})();
