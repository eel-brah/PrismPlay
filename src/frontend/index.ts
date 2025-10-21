// Select the canvas
const canvas = document.getElementById("pong") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
// if (!ctx) throw new Error("2D context not available");

// audio
const hitSound = new Audio("../../public/audio/hit.mp3");
const lossSound = new Audio("../../public/audio/loss.mp3");
const scoreSound = new Audio("../../public/audio/score.mp3");
const winSound = new Audio("../../public/audio/win.mp3");

hitSound.volume = 0.4;
scoreSound.volume = 0.6;
winSound.volume = 0.4;

// Game States
type GameState = "start" | "playing" | "paused" | "scored" | "gameover";
let gameState: GameState = "start";
let winner: "left" | "right" | null = null;

// Input Tracking
const keys: Record<string, boolean> = {};

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  // Start the game
  if (gameState === "start" && e.key === " ") {
    startGame();
  }

  // Pause / Resume
  else if (gameState === "playing" && e.key === "p") {
    gameState = "paused";
  } else if (gameState === "paused" && e.key === "p") {
    gameState = "playing";
  }

  // Continue after scoring
  else if (gameState === "scored" && e.key === " ") {
    resetBall();
    gameState = "playing";
  } else if (gameState === "gameover" && e.key === " ") {
    gameState = "start";
    leftscore = 0;
    rightscore = 0;
    winner = null;
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Interfaces
interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  speed_x: number;
  speed_y: number;
}

// Game Objects
const leftPaddle: Paddle = { x: 20, y: 260, width: 10, height: 80, speed: 6 };
const rightPaddle: Paddle = { x: 770, y: 260, width: 10, height: 80, speed: 6 };

const ball: Ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 8,
  speed_x: 5,
  speed_y: 5,
};

let leftscore = 0;
let rightscore = 0;
const win_score = 5;

// Helper Functions

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  const direction = Math.random() > 0.5 ? 1 : -1;
  ball.speed_x = 5 * direction;
  ball.speed_y = (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1);
}

function startGame() {
  leftscore = 0;
  rightscore = 0;
  resetBall();
  gameState = "playing";
}

function drawCenteredText(text: string, y: number) {
  ctx.font = "32px monospace";
  ctx.fillStyle = "#cdd6f4";
  const textWidth = ctx.measureText(text).width;
  ctx.fillText(text, (canvas.width - textWidth) / 2, y);
}

// Update
function update() {
  if (gameState !== "playing") return;

  // Paddle controls
  if (keys["w"]) leftPaddle.y -= leftPaddle.speed;
  if (keys["s"]) leftPaddle.y += leftPaddle.speed;
  if (keys["ArrowUp"]) rightPaddle.y -= rightPaddle.speed;
  if (keys["ArrowDown"]) rightPaddle.y += rightPaddle.speed;

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
  ball.x += ball.speed_x;
  ball.y += ball.speed_y;

  // Bounce off top/bottom
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.speed_y = -ball.speed_y;
  }

  // left right paddle collision
  if (
    ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
    ball.y > leftPaddle.y &&
    ball.y < leftPaddle.y + leftPaddle.height
  ) {
    const paddleCenter = leftPaddle.y + leftPaddle.height / 2;
    const hitPosition = (ball.y - paddleCenter) / (leftPaddle.height / 2);
    const angle = hitPosition * (Math.PI / 4);
    const speed = Math.sqrt(ball.speed_x ** 2 + ball.speed_y ** 2);
    ball.speed_x = Math.cos(angle) * speed;
    ball.speed_y = Math.sin(angle) * speed;
    ball.speed_x = Math.abs(ball.speed_x);
    ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
    ball.speed_x *= 1.05;
    ball.speed_y *= 1.05;
    hitSound.currentTime = 0;
    hitSound.play();
  }

  if (
    ball.x + ball.radius > rightPaddle.x &&
    ball.y > rightPaddle.y &&
    ball.y < rightPaddle.y + rightPaddle.height
  ) {
    const paddleCenter = rightPaddle.y + rightPaddle.height / 2;
    const hitPosition = (ball.y - paddleCenter) / (rightPaddle.height / 2);
    const angle = hitPosition * (Math.PI / 4);
    const speed = Math.sqrt(ball.speed_x ** 2 + ball.speed_y ** 2);
    ball.speed_x = -Math.cos(angle) * speed;
    ball.speed_y = Math.sin(angle) * speed;
    ball.x = rightPaddle.x - ball.radius;
    ball.speed_x *= 1.05;
    ball.speed_y *= 1.05;
    hitSound.currentTime = 0;
    hitSound.play();
  }

  // Score check
  if (ball.x + ball.radius < 0) {
    rightscore++;
    if (rightscore >= win_score) {
      winner = "right";
      winSound.currentTime = 0;
      winSound.play();
      gameState = "gameover";
    } else {
      gameState = "scored";
      scoreSound.currentTime = 0;
      scoreSound.play();
    }
  } else if (ball.x - ball.radius > canvas.width) {
    leftscore++;
    if (leftscore >= win_score) {
      winner = "left";
      winSound.currentTime = 0;
      winSound.play();
      gameState = "gameover";
    } else {
      gameState = "scored";
      scoreSound.currentTime = 0;
      scoreSound.play();
    }
  }
}

// Draw
function draw() {
  ctx.fillStyle = "#181825";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw center line ---
  ctx.strokeStyle = "#cdd6f4";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 15]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Start screen
  if (gameState === "start") {
    drawCenteredText("Press SPACE to Start", canvas.height / 2);
    return;
  }

  // Game over screen
  if (gameState === "gameover") {
    drawCenteredText(
      `${winner === "left" ? "Left" : "Right"} Player Wins!`,
      canvas.height / 2 - 20
    );
    drawCenteredText("Press SPACE to Restart", canvas.height / 2 + 30);
  }

  // Paused
  if (gameState === "paused") {
    drawCenteredText("Paused - Press P to Resume", canvas.height / 2);
  }

  // After scoring
  if (gameState === "scored") {
    drawCenteredText("Point! Press SPACE to Continue", canvas.height / 2);
  }

  // Draw paddles
  ctx.fillStyle = "#89b4fa";
  ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
  ctx.fillRect(
    rightPaddle.x,
    rightPaddle.y,
    rightPaddle.width,
    rightPaddle.height
  );

  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f5e0dc";
  ctx.fill();

  // Scores
  ctx.font = "32px monospace";
  ctx.fillStyle = "#cdd6f4";
  ctx.fillText(leftscore.toString(), canvas.width / 4, 50);
  ctx.fillText(rightscore.toString(), (canvas.width * 3) / 4, 50);
}

// Game Loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
