// // Pong.tsx
// import React, { useEffect, useRef, useState } from "react";
// import { Volume2, VolumeX, Shuffle, Palette } from "lucide-react";
// import { beepSound } from "@/utils/sound";
// import createAIOpponent, { AIOpponent } from "@/game/ai";
// import {
//   AIConfig,
//   AIObject,
//   AiPos,
//   Ball,
//   Difficulty,
//   DifficultyPreset,
//   GameStatus,
//   Paddle,
//   Winner,
// } from "@/game/types";
// import {
//   CONFIG,
//   INITIAL_Y,
//   LEFT_X,
//   MAX_SPEED,
//   MIN_SPEED,
//   PADDLE_WIDTH,
//   RADIUS,
//   RIGHT_X,
//   WIN_SCORE,
// } from "@/game/config";
// import DifficultySlider from "./DifficultySlider";

// // Theme definitions
// interface GameTheme {
//   id: string;
//   name: string;
//   background: string;
//   backgroundGradient?: (
//     ctx: CanvasRenderingContext2D,
//     width: number,
//     height: number
//   ) => void;
//   centerLine: string;
//   centerLineStyle: "dashed" | "solid" | "dots" | "glow";
//   textColor: string;
//   scoreColor: string;
//   comboColor: string;
//   glowEnabled: boolean;
// }

// const THEMES: GameTheme[] = [
//   {
//     id: "classic",
//     name: "Classic",
//     background: "#1e1e2e",
//     centerLine: "rgba(137, 180, 250, 0.5)",
//     centerLineStyle: "dashed",
//     textColor: "#cdd6f4",
//     scoreColor: "#cdd6f4",
//     comboColor: "#f9e2af",
//     glowEnabled: true,
//   },
//   {
//     id: "neon",
//     name: "Neon",
//     background: "#0a0a0f",
//     backgroundGradient: (ctx, w, h) => {
//       const grad = ctx.createRadialGradient(
//         w / 2,
//         h / 2,
//         0,
//         w / 2,
//         h / 2,
//         w / 2
//       );
//       grad.addColorStop(0, "#1a0a2e");
//       grad.addColorStop(1, "#0a0a0f");
//       ctx.fillStyle = grad;
//       ctx.fillRect(0, 0, w, h);
//     },
//     centerLine: "#ff00ff",
//     centerLineStyle: "glow",
//     textColor: "#00ffff",
//     scoreColor: "#ff00ff",
//     comboColor: "#00ff00",
//     glowEnabled: true,
//   },
//   {
//     id: "retro",
//     name: "Retro",
//     background: "#000000",
//     centerLine: "#ffffff",
//     centerLineStyle: "dots",
//     textColor: "#ffffff",
//     scoreColor: "#ffffff",
//     comboColor: "#ffff00",
//     glowEnabled: false,
//   },
//   {
//     id: "ocean",
//     name: "Ocean",
//     background: "#0c1929",
//     backgroundGradient: (ctx, w, h) => {
//       const grad = ctx.createLinearGradient(0, 0, 0, h);
//       grad.addColorStop(0, "#0c1929");
//       grad.addColorStop(0.5, "#1a3a5c");
//       grad.addColorStop(1, "#0c1929");
//       ctx.fillStyle = grad;
//       ctx.fillRect(0, 0, w, h);
//     },
//     centerLine: "#4ecdc4",
//     centerLineStyle: "solid",
//     textColor: "#a8e6cf",
//     scoreColor: "#4ecdc4",
//     comboColor: "#ff6b6b",
//     glowEnabled: true,
//   },
// ];

// // Color presets
// const PADDLE_COLORS = [
//   { name: "Blue", value: "#89b4fa" },
//   { name: "Purple", value: "#cba6f7" },
//   { name: "Pink", value: "#f5c2e7" },
//   { name: "Red", value: "#f38ba8" },
//   { name: "Orange", value: "#fab387" },
//   { name: "Yellow", value: "#f9e2af" },
//   { name: "Green", value: "#a6e3a1" },
//   { name: "Teal", value: "#94e2d5" },
//   { name: "Cyan", value: "#00ffff" },
//   { name: "White", value: "#ffffff" },
// ];

// const BALL_COLORS = [
//   { name: "Cream", value: "#f5e0dc" },
//   { name: "White", value: "#ffffff" },
//   { name: "Yellow", value: "#f9e2af" },
//   { name: "Orange", value: "#fab387" },
//   { name: "Pink", value: "#f5c2e7" },
//   { name: "Cyan", value: "#00ffff" },
//   { name: "Green", value: "#a6e3a1" },
//   { name: "Red", value: "#f38ba8" },
// ];

// class Particle {
//   x: number;
//   y: number;
//   vx: number;
//   vy: number;
//   life: number;
//   decay: number;
//   color: string;
//   size: number;

//   constructor(x: number, y: number, color: string) {
//     this.x = x;
//     this.y = y;
//     this.vx = (Math.random() - 0.5) * 160;
//     this.vy = (Math.random() - 0.5) * 160;
//     this.life = 1;
//     this.decay = 0.9;
//     this.color = color;
//     this.size = Math.random() * 3 + 2;
//   }

//   update(dt: number) {
//     this.x += this.vx * dt;
//     this.y += this.vy * dt;
//     this.life *= Math.pow(this.decay, dt * 60);
//     this.vx *= 1 - 0.02 * dt * 60;
//     this.vy *= 1 - 0.02 * dt * 60;
//   }

//   draw(ctx: CanvasRenderingContext2D) {
//     ctx.globalAlpha = this.life;
//     ctx.fillStyle = this.color;
//     ctx.beginPath();
//     ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.globalAlpha = 1;
//   }
// }

// interface PlayerProfile {
//   name: string;
//   avatar: string;
//   paddleColor: string;
// }

// interface GameColors {
//   ballColor: string;
//   theme: string;
// }

// const Pong: React.FC<{ onReturn?: () => void }> = ({ onReturn }) => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);

//   const [gameMode, setGameMode] = useState<"menu" | "setup" | "playing">(
//     "menu"
//   );
//   const [isSingle, setIsSingle] = useState<boolean>(false);
//   const [isAI, setIsAI] = useState<boolean>(false);
//   const [soundOn, setSoundOn] = useState<boolean>(true);
//   const [difficulty, setDifficulty] = useState<Difficulty>("easy");
//   const [aiPos, setAiPos] = useState<AiPos>("left");

//   // Player profiles with paddle colors
//   const [leftPlayer, setLeftPlayer] = useState<PlayerProfile>({
//     name: "Player 1",
//     avatar: "felix",
//     paddleColor: "#89b4fa",
//   });
//   const [rightPlayer, setRightPlayer] = useState<PlayerProfile>({
//     name: "Player 2",
//     avatar: "luna",
//     paddleColor: "#f5c2e7",
//   });

//   // Game colors and theme
//   const [gameColors, setGameColors] = useState<GameColors>({
//     ballColor: "#f5e0dc",
//     theme: "classic",
//   });

//   const [showLeftAvatars, setShowLeftAvatars] = useState(false);
//   const [showRightAvatars, setShowRightAvatars] = useState(false);
//   const [showLeftColors, setShowLeftColors] = useState(false);
//   const [showRightColors, setShowRightColors] = useState(false);
//   const [showBallColors, setShowBallColors] = useState(false);

//   // Preset avatar options
//   const avatarOptions = [
//     "felix",
//     "luna",
//     "max",
//     "sophie",
//     "charlie",
//     "alex",
//     "bailey",
//     "river",
//     "sage",
//     "phoenix",
//     "quinn",
//     "rowan",
//   ];

//   const soundOnRef = useRef(soundOn);
//   useEffect(() => {
//     soundOnRef.current = soundOn;
//   }, [soundOn]);

//   const generateRandomSeed = () => Math.random().toString(36).substring(7);

//   const getAvatarUrl = (seed: string) =>
//     `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${seed}`;

//   const getCurrentTheme = (): GameTheme => {
//     return THEMES.find((t) => t.id === gameColors.theme) || THEMES[0];
//   };

//   const startGame = (mode: "single" | "two" | "ai") => {
//     if (mode === "single") {
//       setIsSingle(true);
//       setIsAI(true);
//       setGameMode("setup");
//     } else if (mode === "two") {
//       setIsSingle(false);
//       setIsAI(false);
//       setGameMode("setup");
//     } else {
//       setIsSingle(false);
//       setIsAI(true);
//       setGameMode("playing");
//     }
//   };

//   useEffect(() => {
//     if (gameMode !== "playing") return;
//     if (!canvasRef.current) return;

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d")!;
//     if (!ctx) return;

//     const currentConfig = getConfig(difficulty);
//     const currentTheme = getCurrentTheme();

//     let phase: GameStatus = "start";
//     let winner: Winner = null;
//     let animationId: number | null = null;
//     let lastTime = 0;
//     let combo = 0;
//     let maxCombo = 0;

//     const keys: Record<string, boolean> = {};
//     const particles: Particle[] = [];

//     const leftPaddle = createPaddle(
//       LEFT_X,
//       INITIAL_Y,
//       PADDLE_WIDTH,
//       currentConfig.paddleHeight,
//       currentConfig.paddleSpeed
//     );
//     const rightPaddle = createPaddle(
//       RIGHT_X,
//       INITIAL_Y,
//       PADDLE_WIDTH,
//       currentConfig.paddleHeight,
//       currentConfig.paddleSpeed
//     );
//     let ball: Ball = createBall(canvas, currentConfig.ballSpeed);

//     function getConfig(d: Difficulty): DifficultyPreset {
//       return CONFIG[d];
//     }

//     function randomDirection() {
//       return Math.random() > 0.5 ? 1 : -1;
//     }

//     function randomSpeedY(min: number, max: number) {
//       return Math.random() * (max - min) + min;
//     }

//     function getBall() {
//       return ball;
//     }

//     function createBall(canvasEl: HTMLCanvasElement, ballSpeed: number): Ball {
//       return {
//         x: canvasEl.width / 2,
//         y: canvasEl.height / 2,
//         radius: RADIUS,
//         speedX: randomDirection() * ballSpeed,
//         speedY: randomDirection() * randomSpeedY(MIN_SPEED, MAX_SPEED),
//         trail: [],
//       };
//     }

//     function createParticles(
//       x: number,
//       y: number,
//       count: number,
//       color: string
//     ) {
//       for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
//     }

//     function createPaddle(
//       x: number,
//       y: number,
//       width: number,
//       height: number,
//       speed: number
//     ): Paddle {
//       return { x, y, width, height, speed, score: 0 };
//     }

//     function resetBall() {
//       ball = createBall(canvas, currentConfig.ballSpeed);
//       combo = 0;
//     }

//     function getControls() {
//       if (isAI && isSingle) return aiPos;
//       return "both";
//     }

//     const aiConfig: AIConfig = {
//       enabled: isAI || isSingle,
//       controls: getControls(),
//       reactionDelayMs: currentConfig.aiReactionDelayMs,
//     };

//     const ais = configAiOpponent(aiConfig);

//     function sweptPaddleHit(
//       bx: number,
//       by: number,
//       vx: number,
//       vy: number,
//       r: number,
//       p: Paddle
//     ): number | null {
//       const x0 = bx,
//         y0 = by,
//         x1 = bx + vx,
//         y1 = by + vy;
//       const dx = x1 - x0,
//         dy = y1 - y0;

//       const minX = p.x - r,
//         maxX = p.x + p.width + r;
//       const minY = p.y - r,
//         maxY = p.y + p.height + r;

//       let t0 = 0,
//         t1 = 1;

//       const clip = (p_: number, q_: number) => {
//         if (p_ === 0) return q_ <= 0;
//         const r_ = q_ / p_;
//         if (p_ < 0) {
//           if (r_ > t1) return false;
//           if (r_ > t0) t0 = r_;
//         } else {
//           if (r_ < t0) return false;
//           if (r_ < t1) t1 = r_;
//         }
//         return true;
//       };

//       if (
//         clip(-dx, x0 - minX) &&
//         clip(dx, maxX - x0) &&
//         clip(-dy, y0 - minY) &&
//         clip(dy, maxY - y0)
//       )
//         return t0;

//       return null;
//     }

//     function handlePaddleCollision(paddle: Paddle, isLeft: boolean) {
//       const paddleCenter = paddle.y + paddle.height / 2;
//       const hitPos = (ball.y - paddleCenter) / (paddle.height / 2);
//       const maxBounce = Math.PI / 4;
//       const angle = Math.max(
//         -maxBounce,
//         Math.min(maxBounce, hitPos * maxBounce)
//       );

//       const curSpeed = Math.hypot(ball.speedX, ball.speedY);
//       const nextBase = Math.min(900, curSpeed * (1.05 + combo * 0.01));

//       const minAbsx = 140;
//       let newVX = Math.cos(angle) * nextBase * (isLeft ? 1 : -1);
//       let newVY = Math.sin(angle) * nextBase;

//       if (Math.abs(newVX) < minAbsx) {
//         const sign = isLeft ? 1 : -1;
//         const keepSpeed = Math.hypot(minAbsx, newVY);
//         const scale = nextBase / keepSpeed;
//         newVX = minAbsx * sign;
//         newVY *= scale;
//       }

//       ball.speedX = newVX;
//       ball.speedY = newVY;

//       ball.x = isLeft
//         ? paddle.x + paddle.width + ball.radius
//         : paddle.x - ball.radius;

//       combo++;
//       maxCombo = Math.max(maxCombo, combo);
//       beepSound(soundOnRef.current, 440);
//     }

//     function configAiOpponent(cfg: AIConfig): AIObject {
//       if (!cfg.enabled) return {};

//       const aiObjects: { leftAI?: AIOpponent; rightAI?: AIOpponent } = {};

//       if (cfg.controls === "left" || cfg.controls === "both") {
//         aiObjects.leftAI = createAIOpponent({
//           paddle: leftPaddle,
//           isLeft: true,
//           canvas: { width: canvas.width, height: canvas.height },
//           reactionDelayMs: cfg.reactionDelayMs,
//           paddleHeight: currentConfig.paddleHeight,
//           getBall,
//         });
//       }

//       if (cfg.controls === "right" || cfg.controls === "both") {
//         aiObjects.rightAI = createAIOpponent({
//           paddle: rightPaddle,
//           isLeft: false,
//           canvas: { width: canvas.width, height: canvas.height },
//           reactionDelayMs: cfg.reactionDelayMs,
//           paddleHeight: currentConfig.paddleHeight,
//           getBall,
//         });
//       }

//       return aiObjects;
//     }

//     function update(dt: number, tFrame: number) {
//       if (phase !== "playing") return;

//       let dyL = 0;
//       let dyR = 0;

//       if (aiConfig.enabled && ais.leftAI) {
//         const aiKeys = ais.leftAI.update(tFrame);
//         if (aiKeys.up) dyL -= leftPaddle.speed * dt;
//         if (aiKeys.down) dyL += leftPaddle.speed * dt;
//       } else {
//         if (keys["w"]) dyL -= leftPaddle.speed * dt;
//         if (keys["s"]) dyL += leftPaddle.speed * dt;
//       }

//       if (aiConfig.enabled && ais.rightAI) {
//         const aiKeys = ais.rightAI.update(tFrame);
//         if (aiKeys.up) dyR -= rightPaddle.speed * dt;
//         if (aiKeys.down) dyR += rightPaddle.speed * dt;
//       } else {
//         if (keys["ArrowUp"]) dyR -= rightPaddle.speed * dt;
//         if (keys["ArrowDown"]) dyR += rightPaddle.speed * dt;
//       }

//       leftPaddle.y += dyL;
//       rightPaddle.y += dyR;

//       leftPaddle.y = Math.max(
//         0,
//         Math.min(canvas.height - leftPaddle.height, leftPaddle.y)
//       );
//       rightPaddle.y = Math.max(
//         0,
//         Math.min(canvas.height - rightPaddle.height, rightPaddle.y)
//       );

//       const vx = ball.speedX * dt;
//       const vy = ball.speedY * dt;

//       let tHit = sweptPaddleHit(
//         ball.x,
//         ball.y,
//         vx,
//         vy,
//         ball.radius,
//         leftPaddle
//       );
//       let hitSide: "left" | "right" | null = tHit !== null ? "left" : null;

//       const tRight = sweptPaddleHit(
//         ball.x,
//         ball.y,
//         vx,
//         vy,
//         ball.radius,
//         rightPaddle
//       );
//       if (tRight !== null && (tHit === null || tRight < tHit)) {
//         tHit = tRight;
//         hitSide = "right";
//       }

//       if (tHit !== null) {
//         ball.x += vx * tHit;
//         ball.y += vy * tHit;

//         handlePaddleCollision(
//           hitSide === "left" ? leftPaddle : rightPaddle,
//           hitSide === "left"
//         );

//         const remain = 1 - tHit;
//         ball.x += ball.speedX * dt * remain;
//         ball.y += ball.speedY * dt * remain;
//       } else {
//         ball.x += vx;
//         ball.y += vy;
//       }

//       if (ball.y - ball.radius < 0) {
//         ball.y = ball.radius;
//         ball.speedY = Math.abs(ball.speedY);
//         beepSound(soundOnRef.current, 520, 0.05, 0.15);
//       } else if (ball.y + ball.radius > canvas.height) {
//         ball.y = canvas.height - ball.radius;
//         ball.speedY = -Math.abs(ball.speedY);
//         beepSound(soundOnRef.current, 520, 0.05, 0.15);
//       }

//       ball.trail.push({ x: ball.x, y: ball.y });
//       if (ball.trail.length > 10) ball.trail.shift();

//       if (ball.x + ball.radius < 0) {
//         rightPaddle.score++;
//         beepSound(
//           soundOnRef.current,
//           rightPaddle.score >= WIN_SCORE ? 659 : 523,
//           0.12,
//           0.3
//         );
//         if (rightPaddle.score >= WIN_SCORE) {
//           winner = "right";
//           phase = "gameover";
//           maxCombo = Math.max(maxCombo, combo);
//         } else {
//           phase = "scored";
//         }
//       } else if (ball.x - ball.radius > canvas.width) {
//         leftPaddle.score++;
//         beepSound(
//           soundOnRef.current,
//           leftPaddle.score >= WIN_SCORE ? 659 : 523,
//           0.12,
//           0.3
//         );
//         if (leftPaddle.score >= WIN_SCORE) {
//           winner = "left";
//           phase = "gameover";
//           maxCombo = Math.max(maxCombo, combo);
//         } else {
//           phase = "scored";
//         }
//       }

//       for (let i = particles.length - 1; i >= 0; i--) {
//         particles[i].update(dt);
//         if (particles[i].life <= 0.02) particles.splice(i, 1);
//       }
//     }

//     function drawCenterLine() {
//       const style = currentTheme.centerLineStyle;
//       const color = currentTheme.centerLine;

//       ctx.strokeStyle = color;
//       ctx.lineWidth = 2;

//       if (style === "dashed") {
//         const gradient = ctx.createLinearGradient(
//           canvas.width / 2 - 2,
//           0,
//           canvas.width / 2 + 2,
//           0
//         );
//         gradient.addColorStop(0, "transparent");
//         gradient.addColorStop(0.5, color);
//         gradient.addColorStop(1, "transparent");
//         ctx.strokeStyle = gradient;
//         ctx.setLineDash([10, 15]);
//         ctx.beginPath();
//         ctx.moveTo(canvas.width / 2, 0);
//         ctx.lineTo(canvas.width / 2, canvas.height);
//         ctx.stroke();
//         ctx.setLineDash([]);
//       } else if (style === "solid") {
//         ctx.globalAlpha = 0.3;
//         ctx.beginPath();
//         ctx.moveTo(canvas.width / 2, 0);
//         ctx.lineTo(canvas.width / 2, canvas.height);
//         ctx.stroke();
//         ctx.globalAlpha = 1;
//       } else if (style === "dots") {
//         ctx.fillStyle = color;
//         for (let y = 10; y < canvas.height; y += 25) {
//           ctx.beginPath();
//           ctx.arc(canvas.width / 2, y, 4, 0, Math.PI * 2);
//           ctx.fill();
//         }
//       } else if (style === "glow") {
//         ctx.shadowBlur = 20;
//         ctx.shadowColor = color;
//         ctx.strokeStyle = color;
//         ctx.lineWidth = 2;
//         ctx.setLineDash([20, 10]);
//         ctx.beginPath();
//         ctx.moveTo(canvas.width / 2, 0);
//         ctx.lineTo(canvas.width / 2, canvas.height);
//         ctx.stroke();
//         ctx.setLineDash([]);
//         ctx.shadowBlur = 0;
//       }
//     }

//     function draw() {
//       // Draw background
//       if (currentTheme.backgroundGradient) {
//         currentTheme.backgroundGradient(ctx, canvas.width, canvas.height);
//       } else {
//         ctx.fillStyle = currentTheme.background;
//         ctx.fillRect(0, 0, canvas.width, canvas.height);
//       }

//       // Draw center line
//       drawCenterLine();

//       const centered = (text: string, y: number) => {
//         ctx.font = "32px monospace";
//         ctx.fillStyle = currentTheme.textColor;
//         const w = ctx.measureText(text).width;
//         ctx.fillText(text, (canvas.width - w) / 2, y);
//       };

//       if (phase === "start") {
//         centered("Press SPACE to Start", canvas.height / 2);
//       } else if (phase === "paused") {
//         centered("Paused - Press P to Resume", canvas.height / 2);
//       } else if (phase === "scored") {
//         centered("Point! Press SPACE to Continue", canvas.height / 2);
//       } else if (phase === "gameover") {
//         const winnerName =
//           winner === "left" ? leftPlayer.name : rightPlayer.name;
//         centered(`${winnerName} Wins!`, canvas.height / 2 - 40);
//         if (maxCombo > 0) {
//           ctx.font = "20px monospace";
//           ctx.fillStyle = currentTheme.comboColor;
//           const t = `Max Combo: ${maxCombo}`;
//           const w = ctx.measureText(t).width;
//           ctx.fillText(t, (canvas.width - w) / 2, canvas.height / 2);
//         }
//         centered("Press SPACE to Restart", canvas.height / 2 + 40);
//       }

//       particles.forEach((p) => p.draw(ctx));

//       // Ball trail
//       ctx.globalAlpha = 0.3;
//       for (let i = 0; i < ball.trail.length; i++) {
//         const t = ball.trail[i];
//         const a = (i / ball.trail.length) * 0.3;
//         ctx.globalAlpha = a;
//         ctx.fillStyle = gameColors.ballColor;
//         ctx.beginPath();
//         ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
//         ctx.fill();
//       }
//       ctx.globalAlpha = 1;

//       // Draw paddles with custom colors
//       if (currentTheme.glowEnabled) {
//         ctx.shadowBlur = 15;
//         ctx.shadowColor = leftPlayer.paddleColor;
//       }
//       ctx.fillStyle = leftPlayer.paddleColor;
//       ctx.fillRect(
//         leftPaddle.x,
//         leftPaddle.y,
//         leftPaddle.width,
//         leftPaddle.height
//       );

//       if (currentTheme.glowEnabled) {
//         ctx.shadowColor = rightPlayer.paddleColor;
//       }
//       ctx.fillStyle = rightPlayer.paddleColor;
//       ctx.fillRect(
//         rightPaddle.x,
//         rightPaddle.y,
//         rightPaddle.width,
//         rightPaddle.height
//       );
//       ctx.shadowBlur = 0;

//       // Draw ball with custom color
//       if (currentTheme.glowEnabled) {
//         ctx.shadowBlur = 20;
//         ctx.shadowColor = gameColors.ballColor;
//       }
//       ctx.beginPath();
//       ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
//       ctx.fillStyle = gameColors.ballColor;
//       ctx.fill();
//       ctx.shadowBlur = 0;

//       // Scores
//       ctx.font = "bold 48px monospace";
//       ctx.fillStyle = currentTheme.scoreColor;
//       ctx.fillText(leftPaddle.score.toString(), canvas.width / 4 - 12, 60);
//       ctx.fillText(
//         rightPaddle.score.toString(),
//         (canvas.width * 3) / 4 - 12,
//         60
//       );

//       // Combo display
//       if (combo > 2 && phase === "playing") {
//         ctx.font = "bold 24px monospace";
//         ctx.fillStyle = currentTheme.comboColor;
//         const text = `${combo}x COMBO!`;
//         const w = ctx.measureText(text).width;
//         ctx.fillText(text, (canvas.width - w) / 2, 100);
//       }
//     }

//     function gameLoop(now: number) {
//       try {
//         const dt = lastTime ? (now - lastTime) / 1000 : 0;
//         lastTime = now;
//         update(dt, now);
//         draw();
//       } catch (err) {
//         console.error("Game loop crashed:", err);
//         if (animationId) cancelAnimationFrame(animationId);
//         return;
//       }
//       animationId = requestAnimationFrame(gameLoop);
//     }

//     const controlKeys = new Set([" ", "ArrowUp", "ArrowDown", "w", "s", "p"]);

//     function handleKeyDown(e: KeyboardEvent) {
//       if (controlKeys.has(e.key)) e.preventDefault();
//       keys[e.key] = true;

//       if (phase === "start" && e.key === " ") {
//         leftPaddle.score = 0;
//         rightPaddle.score = 0;
//         resetBall();
//         phase = "playing";
//         combo = 0;
//         maxCombo = 0;
//         beepSound(soundOnRef.current, 440, 0.06, 0.2);
//       } else if (phase === "playing" && e.key === "p") {
//         phase = "paused";
//         beepSound(soundOnRef.current, 330, 0.05, 0.18);
//       } else if (phase === "paused" && e.key === "p") {
//         phase = "playing";
//         beepSound(soundOnRef.current, 440, 0.05, 0.18);
//       } else if (phase === "scored" && e.key === " ") {
//         resetBall();
//         phase = "playing";
//       } else if (phase === "gameover" && e.key === " ") {
//         phase = "start";
//         leftPaddle.score = 0;
//         rightPaddle.score = 0;
//         winner = null;
//       }
//     }

//     function handleKeyUp(e: KeyboardEvent) {
//       if (controlKeys.has(e.key)) e.preventDefault();
//       keys[e.key] = false;
//     }

//     document.addEventListener("keydown", handleKeyDown, { passive: false });
//     document.addEventListener("keyup", handleKeyUp, { passive: false });

//     animationId = requestAnimationFrame(gameLoop);

//     return () => {
//       document.removeEventListener("keydown", handleKeyDown as any);
//       document.removeEventListener("keyup", handleKeyUp as any);
//       if (animationId) cancelAnimationFrame(animationId);
//     };
//   }, [
//     gameMode,
//     leftPlayer,
//     rightPlayer,
//     gameColors,
//     difficulty,
//     isSingle,
//     isAI,
//     aiPos,
//   ]);

//   return (
//     <>
//       {/* MENU */}
//       {gameMode === "menu" && (
//         <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl max-w-md w-full">
//           <h1 className="text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
//             PinPon Game
//           </h1>

//           <div className="space-y-4 mb-6">
//             <button
//               onClick={() => startGame("single")}
//               className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
//             >
//               Single Player
//             </button>
//             <button
//               onClick={() => startGame("two")}
//               className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
//             >
//               Two Players
//             </button>
//             <button
//               onClick={() => startGame("ai")}
//               className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
//             >
//               AI vs AI
//             </button>
//             <button
//               onClick={() => {
//                 if (onReturn) onReturn();
//               }}
//               className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg font-semibold transition-all shadow-lg"
//             >
//               Return
//             </button>
//           </div>

//           <div className="border-t border-gray-700 pt-6 space-y-4">
//             <div>
//               <label className="block text-gray-300 mb-2 font-medium">
//                 AI Side (Single Player)
//               </label>
//               <div className="flex gap-2">
//                 {(["left", "right"] as const).map((pos) => (
//                   <button
//                     key={pos}
//                     onClick={() => setAiPos(pos)}
//                     className={`flex-1 py-2 rounded-lg border transition-colors ${
//                       aiPos === pos
//                         ? "bg-blue-600 border-blue-500 text-white"
//                         : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
//                     }`}
//                   >
//                     {pos.charAt(0).toUpperCase() + pos.slice(1)}
//                   </button>
//                 ))}
//               </div>
//             </div>

//             <DifficultySlider
//               difficulty={difficulty}
//               setDifficulty={setDifficulty}
//             />

//             <button
//               onClick={() => setSoundOn(!soundOn)}
//               className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
//             >
//               {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
//               Sound: {soundOn ? "On" : "Off"}
//             </button>
//           </div>

//           <div className="mt-6 text-gray-400 text-sm space-y-2">
//             <p className="font-semibold text-gray-300">Controls:</p>
//             <p>Left Player: W / S</p>
//             <p>Right Player: Up/Down Arrows</p>
//             <p>Pause: P • Start: SPACE</p>
//           </div>
//         </div>
//       )}

//       {/* CHARACTER SETUP */}
//       {gameMode === "setup" && (
//         <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 overflow-y-auto">
//           <div className="max-w-4xl w-full py-8">
//             <h2 className="text-4xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
//               Setup Your Characters
//             </h2>

//             {/* Theme Selection */}
//             <div className="mb-6">
//               <h3 className="text-lg font-semibold text-gray-300 text-center mb-3">
//                 Select Map Theme
//               </h3>
//               <div className="flex justify-center gap-3 flex-wrap">
//                 {THEMES.map((theme) => (
//                   <button
//                     key={theme.id}
//                     onClick={() =>
//                       setGameColors({ ...gameColors, theme: theme.id })
//                     }
//                     className={`px-4 py-2 rounded-lg border-2 transition-all ${
//                       gameColors.theme === theme.id
//                         ? "border-purple-500 bg-purple-500/20 text-white"
//                         : "border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500"
//                     }`}
//                   >
//                     <div className="flex items-center gap-2">
//                       <div
//                         className="w-4 h-4 rounded-full"
//                         style={{ backgroundColor: theme.centerLine }}
//                       />
//                       {theme.name}
//                     </div>
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {/* Ball Color Selection */}
//             <div className="mb-6 flex justify-center">
//               <div className="relative">
//                 <button
//                   onClick={() => setShowBallColors(!showBallColors)}
//                   className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 rounded-lg border border-gray-600 hover:border-gray-500 transition-all"
//                 >
//                   <div
//                     className="w-6 h-6 rounded-full border-2 border-white/30"
//                     style={{ backgroundColor: gameColors.ballColor }}
//                   />
//                   <span className="text-gray-300">Ball Color</span>
//                   <Palette size={16} className="text-gray-400" />
//                 </button>
//                 {showBallColors && (
//                   <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-800 rounded-lg p-3 shadow-xl z-10 min-w-[200px]">
//                     <div className="grid grid-cols-4 gap-2">
//                       {BALL_COLORS.map((color) => (
//                         <button
//                           key={color.value}
//                           onClick={() => {
//                             setGameColors({
//                               ...gameColors,
//                               ballColor: color.value,
//                             });
//                             setShowBallColors(false);
//                           }}
//                           className={`w-8 h-8 rounded-full transition-all ${
//                             gameColors.ballColor === color.value
//                               ? "ring-2 ring-white scale-110"
//                               : "hover:scale-110"
//                           }`}
//                           style={{ backgroundColor: color.value }}
//                           title={color.name}
//                         />
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="flex gap-6 justify-center">
//               {/* Left Player Setup */}
//               {(!isSingle || aiPos === "right") && (
//                 <div className="w-80 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6">
//                   <div className="text-center mb-4">
//                     <span className="text-purple-400 font-bold text-lg">
//                       LEFT PLAYER
//                     </span>
//                   </div>

//                   <div className="flex justify-center mb-6">
//                     <div className="relative">
//                       <img
//                         src={getAvatarUrl(leftPlayer.avatar)}
//                         alt="Left Player Avatar"
//                         className="w-32 h-32 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 p-1 cursor-pointer hover:opacity-80 transition-opacity"
//                         onClick={() => setShowLeftAvatars(!showLeftAvatars)}
//                       />
//                       <button
//                         onClick={() =>
//                           setLeftPlayer({
//                             ...leftPlayer,
//                             avatar: generateRandomSeed(),
//                           })
//                         }
//                         className="absolute -bottom-2 -right-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition-all shadow-lg"
//                         title="Random avatar"
//                       >
//                         <Shuffle size={16} />
//                       </button>
//                     </div>
//                   </div>

//                   {/* Avatar Selector */}
//                   {showLeftAvatars && (
//                     <div className="mb-4 bg-gray-700/50 rounded-lg p-3">
//                       <p className="text-gray-300 text-xs mb-2 text-center">
//                         Choose an avatar:
//                       </p>
//                       <div className="grid grid-cols-4 gap-2">
//                         {avatarOptions.map((seed) => (
//                           <img
//                             key={seed}
//                             src={getAvatarUrl(seed)}
//                             alt={seed}
//                             className={`w-14 h-14 rounded-lg cursor-pointer transition-all ${
//                               leftPlayer.avatar === seed
//                                 ? "ring-2 ring-purple-500 scale-105"
//                                 : "hover:scale-110 opacity-70 hover:opacity-100"
//                             }`}
//                             onClick={() => {
//                               setLeftPlayer({ ...leftPlayer, avatar: seed });
//                               setShowLeftAvatars(false);
//                             }}
//                           />
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-gray-300 text-sm mb-2">
//                         Player Name
//                       </label>
//                       <input
//                         type="text"
//                         value={leftPlayer.name}
//                         onChange={(e) =>
//                           setLeftPlayer({ ...leftPlayer, name: e.target.value })
//                         }
//                         maxLength={15}
//                         className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
//                         placeholder="Enter name..."
//                       />
//                     </div>

//                     {/* Paddle Color */}
//                     <div className="relative">
//                       <label className="block text-gray-300 text-sm mb-2">
//                         Paddle Color
//                       </label>
//                       <button
//                         onClick={() => setShowLeftColors(!showLeftColors)}
//                         className="w-full flex items-center justify-between px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-all"
//                       >
//                         <div className="flex items-center gap-2">
//                           <div
//                             className="w-6 h-6 rounded"
//                             style={{ backgroundColor: leftPlayer.paddleColor }}
//                           />
//                           <span className="text-gray-300">
//                             {PADDLE_COLORS.find(
//                               (c) => c.value === leftPlayer.paddleColor
//                             )?.name || "Custom"}
//                           </span>
//                         </div>
//                         <Palette size={16} className="text-gray-400" />
//                       </button>
//                       {showLeftColors && (
//                         <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg p-3 shadow-xl z-10">
//                           <div className="grid grid-cols-5 gap-2">
//                             {PADDLE_COLORS.map((color) => (
//                               <button
//                                 key={color.value}
//                                 onClick={() => {
//                                   setLeftPlayer({
//                                     ...leftPlayer,
//                                     paddleColor: color.value,
//                                   });
//                                   setShowLeftColors(false);
//                                 }}
//                                 className={`w-8 h-8 rounded transition-all ${
//                                   leftPlayer.paddleColor === color.value
//                                     ? "ring-2 ring-white scale-110"
//                                     : "hover:scale-110"
//                                 }`}
//                                 style={{ backgroundColor: color.value }}
//                                 title={color.name}
//                               />
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     <div className="bg-gray-700/30 rounded-lg p-3 text-sm text-gray-300">
//                       <p className="font-semibold mb-1">Controls:</p>
//                       <p>W - Move Up</p>
//                       <p>S - Move Down</p>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Right Player Setup */}
//               {(!isSingle || aiPos === "left") && (
//                 <div className="w-80 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-pink-500/30 p-6">
//                   <div className="text-center mb-4">
//                     <span className="text-pink-400 font-bold text-lg">
//                       RIGHT PLAYER
//                     </span>
//                   </div>

//                   <div className="flex justify-center mb-6">
//                     <div className="relative">
//                       <img
//                         src={getAvatarUrl(rightPlayer.avatar)}
//                         alt="Right Player Avatar"
//                         className="w-32 h-32 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 p-1 cursor-pointer hover:opacity-80 transition-opacity"
//                         onClick={() => setShowRightAvatars(!showRightAvatars)}
//                       />
//                       <button
//                         onClick={() =>
//                           setRightPlayer({
//                             ...rightPlayer,
//                             avatar: generateRandomSeed(),
//                           })
//                         }
//                         className="absolute -bottom-2 -right-2 bg-pink-600 hover:bg-pink-700 text-white p-2 rounded-full transition-all shadow-lg"
//                         title="Random avatar"
//                       >
//                         <Shuffle size={16} />
//                       </button>
//                     </div>
//                   </div>

//                   {/* Avatar Selector */}
//                   {showRightAvatars && (
//                     <div className="mb-4 bg-gray-700/50 rounded-lg p-3">
//                       <p className="text-gray-300 text-xs mb-2 text-center">
//                         Choose an avatar:
//                       </p>
//                       <div className="grid grid-cols-4 gap-2">
//                         {avatarOptions.map((seed) => (
//                           <img
//                             key={seed}
//                             src={getAvatarUrl(seed)}
//                             alt={seed}
//                             className={`w-14 h-14 rounded-lg cursor-pointer transition-all ${
//                               rightPlayer.avatar === seed
//                                 ? "ring-2 ring-pink-500 scale-105"
//                                 : "hover:scale-110 opacity-70 hover:opacity-100"
//                             }`}
//                             onClick={() => {
//                               setRightPlayer({ ...rightPlayer, avatar: seed });
//                               setShowRightAvatars(false);
//                             }}
//                           />
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-gray-300 text-sm mb-2">
//                         Player Name
//                       </label>
//                       <input
//                         type="text"
//                         value={rightPlayer.name}
//                         onChange={(e) =>
//                           setRightPlayer({
//                             ...rightPlayer,
//                             name: e.target.value,
//                           })
//                         }
//                         maxLength={15}
//                         className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500"
//                         placeholder="Enter name..."
//                       />
//                     </div>

//                     {/* Paddle Color */}
//                     <div className="relative">
//                       <label className="block text-gray-300 text-sm mb-2">
//                         Paddle Color
//                       </label>
//                       <button
//                         onClick={() => setShowRightColors(!showRightColors)}
//                         className="w-full flex items-center justify-between px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-all"
//                       >
//                         <div className="flex items-center gap-2">
//                           <div
//                             className="w-6 h-6 rounded"
//                             style={{ backgroundColor: rightPlayer.paddleColor }}
//                           />
//                           <span className="text-gray-300">
//                             {PADDLE_COLORS.find(
//                               (c) => c.value === rightPlayer.paddleColor
//                             )?.name || "Custom"}
//                           </span>
//                         </div>
//                         <Palette size={16} className="text-gray-400" />
//                       </button>
//                       {showRightColors && (
//                         <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg p-3 shadow-xl z-10">
//                           <div className="grid grid-cols-5 gap-2">
//                             {PADDLE_COLORS.map((color) => (
//                               <button
//                                 key={color.value}
//                                 onClick={() => {
//                                   setRightPlayer({
//                                     ...rightPlayer,
//                                     paddleColor: color.value,
//                                   });
//                                   setShowRightColors(false);
//                                 }}
//                                 className={`w-8 h-8 rounded transition-all ${
//                                   rightPlayer.paddleColor === color.value
//                                     ? "ring-2 ring-white scale-110"
//                                     : "hover:scale-110"
//                                 }`}
//                                 style={{ backgroundColor: color.value }}
//                                 title={color.name}
//                               />
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     <div className="bg-gray-700/30 rounded-lg p-3 text-sm text-gray-300">
//                       <p className="font-semibold mb-1">Controls:</p>
//                       <p>↑ - Move Up</p>
//                       <p>↓ - Move Down</p>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="flex justify-center gap-4 mt-8">
//               <button
//                 onClick={() => setGameMode("menu")}
//                 className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-all"
//               >
//                 Back
//               </button>
//               <button
//                 onClick={() => setGameMode("playing")}
//                 className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
//               >
//                 Start Game
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* PLAYING - Dashboard unchanged */}
//       {gameMode === "playing" && (
//         <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
//           <div className="absolute top-4 right-4 flex gap-2 z-50">
//             <button
//               onClick={() => setSoundOn(!soundOn)}
//               className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
//             >
//               {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
//             </button>
//             <button
//               onClick={() => setGameMode("menu")}
//               className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
//             >
//               Return
//             </button>
//           </div>

//           {/* Main row (responsive): dashboards + canvas */}
//           <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-[1200px]">
//             {/* Left Player Dashboard */}
//             <div className="flex flex-col items-center gap-3 w-[110px] md:w-[120px] shrink-0">
//               <div className="relative">
//                 <img
//                   src={getAvatarUrl(leftPlayer.avatar)}
//                   alt={leftPlayer.name}
//                   className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 p-0.5 shadow-lg shadow-purple-500/30"
//                 />
//                 {isAI && (isSingle ? aiPos === "left" : true) && (
//                   <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
//                     AI
//                   </div>
//                 )}
//               </div>

//               <div className="text-center">
//                 <p className="text-purple-400 font-bold text-sm truncate max-w-[100px]">
//                   {isAI && (isSingle ? aiPos === "left" : true)
//                     ? "AI Bot"
//                     : leftPlayer.name}
//                 </p>
//                 <p className="text-gray-500 text-xs uppercase tracking-wider">
//                   Left
//                 </p>
//               </div>

//               <div className="flex flex-col items-center gap-1 text-gray-400 text-xs bg-gray-800/50 rounded-lg px-3 py-2">
//                 <span className="font-semibold text-gray-300">Controls</span>
//                 <div className="flex gap-1">
//                   <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
//                     W
//                   </kbd>
//                   <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
//                     S
//                   </kbd>
//                 </div>
//               </div>
//             </div>

//             {/* Canvas wrapper: normal 810x600, scales down nicely without shrinking loop */}
//             <div className="flex-1 min-w-0 flex items-center justify-center">
//               <div className="w-full max-w-[810px] aspect-[810/600]">
//                 <canvas
//                   ref={canvasRef}
//                   width={810}
//                   height={600}
//                   className="w-full h-full border-4 border-gray-700 rounded-lg shadow-2xl"
//                   style={{ imageRendering: "auto" }}
//                 />
//               </div>
//             </div>

//             {/* Right Player Dashboard */}
//             <div className="flex flex-col items-center gap-3 w-[110px] md:w-[120px] shrink-0">
//               <div className="relative">
//                 <img
//                   src={getAvatarUrl(rightPlayer.avatar)}
//                   alt={rightPlayer.name}
//                   className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 p-0.5 shadow-lg shadow-pink-500/30"
//                 />
//                 {isAI && (isSingle ? aiPos === "right" : true) && (
//                   <div className="absolute -top-2 -right-2 bg-pink-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
//                     AI
//                   </div>
//                 )}
//               </div>

//               <div className="text-center">
//                 <p className="text-pink-400 font-bold text-sm truncate max-w-[100px]">
//                   {isAI && (isSingle ? aiPos === "right" : true)
//                     ? "AI Bot"
//                     : rightPlayer.name}
//                 </p>
//                 <p className="text-gray-500 text-xs uppercase tracking-wider">
//                   Right
//                 </p>
//               </div>

//               <div className="flex flex-col items-center gap-1 text-gray-400 text-xs bg-gray-800/50 rounded-lg px-3 py-2">
//                 <span className="font-semibold text-gray-300">Controls</span>
//                 <div className="flex gap-1">
//                   <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
//                     ↑
//                   </kbd>
//                   <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
//                     ↓
//                   </kbd>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default Pong;
