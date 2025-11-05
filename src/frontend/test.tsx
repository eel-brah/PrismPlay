// import React, { useEffect, useRef, useState } from "react";
// import { Volume2, VolumeX } from "lucide-react";

// /** ===== Types ===== */
// type DifficultyKey = "easy" | "medium" | "hard";
// type Phase = "start" | "playing" | "paused" | "scored" | "gameover";
// type Winner = "left" | "right" | null;

// interface Paddle {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   speed: number; // px/sec
//   score: number;
// }

// interface TrailPoint {
//   x: number;
//   y: number;
// }

// interface Ball {
//   x: number;
//   y: number;
//   radius: number;
//   speedX: number; // px/sec
//   speedY: number; // px/sec
//   trail: TrailPoint[];
// }

// interface DifficultyPreset {
//   ballSpeed: number; // px/sec baseline
//   paddleSpeed: number; // px/sec
//   aiReaction: number; // 0..1 (how aggressively AI chases)
//   paddleHeight: number;
// }

// type Config = Record<DifficultyKey, DifficultyPreset>;

// /** ===== Particles ===== */
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
//     this.vx = (Math.random() - 0.5) * 160; // px/sec
//     this.vy = (Math.random() - 0.5) * 160;
//     this.life = 1;
//     this.decay = 0.9; // life multiplier per second ~ exp(-t)
//     this.color = color;
//     this.size = Math.random() * 3 + 2;
//   }
//   update(dt: number) {
//     this.x += this.vx * dt;
//     this.y += this.vy * dt;
//     // exponential-ish fade
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

// /** ===== Reusable Audio ===== */
// const AC =
//   typeof window !== "undefined" &&
//   ((window as any).AudioContext || (window as any).webkitAudioContext);
// let sharedAudioCtx: AudioContext | null = null;

// function ensureAudioContext(): AudioContext | null {
//   if (!AC) return null;
//   if (!sharedAudioCtx) sharedAudioCtx = new AC();
//   if (sharedAudioCtx.state === "suspended") {
//     // Browsers often require a user gesture before audio can play
//     sharedAudioCtx.resume().catch(() => {});
//   }
//   return sharedAudioCtx;
// }
// function blip(enabled: boolean, freq = 440, dur = 0.08, vol = 0.25) {
//   if (!enabled) return;
//   const ctx = ensureAudioContext();
//   if (!ctx) return;
//   const o = ctx.createOscillator();
//   const g = ctx.createGain();
//   o.connect(g);
//   g.connect(ctx.destination);
//   o.frequency.value = freq;
//   const t = ctx.currentTime;
//   g.gain.setValueAtTime(vol, t);
//   g.gain.exponentialRampToValueAtTime(0.01, t + dur);
//   o.start(t);
//   o.stop(t + dur);
// }

// /** ===== Component ===== */
// const Pong: React.FC = () => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);

//   const [gameMode, setGameMode] = useState<"menu" | "playing">("menu");
//   const [isSinglePlayer, setIsSinglePlayer] = useState<boolean>(false);
//   const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
//   const [difficulty, setDifficulty] = useState<DifficultyKey>("medium");

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     /** ===== Config tuned for px/sec ===== */
//     const config: Config = {
//       easy: {
//         ballSpeed: 320,
//         paddleSpeed: 520,
//         aiReaction: 0.06,
//         paddleHeight: 120,
//       },
//       medium: {
//         ballSpeed: 380,
//         paddleSpeed: 640,
//         aiReaction: 0.09,
//         paddleHeight: 100,
//       },
//       hard: {
//         ballSpeed: 440,
//         paddleSpeed: 760,
//         aiReaction: 0.13,
//         paddleHeight: 80,
//       },
//     };

//     /** ===== Game state (not React state) ===== */
//     let phase: Phase = "start";
//     let winner: Winner = null;
//     let animationId: number | null = null;
//     let lastTime = 0;
//     let combo = 0;
//     let maxCombo = 0;

//     const keys: Record<string, boolean> = {};
//     const particles: Particle[] = [];

//     const leftPaddle: Paddle = {
//       x: 10,
//       y: 260,
//       width: 20,
//       height: config[difficulty].paddleHeight,
//       speed: config[difficulty].paddleSpeed,
//       score: 0,
//     };
//     const rightPaddle: Paddle = {
//       x: 780,
//       y: 260,
//       width: 20,
//       height: config[difficulty].paddleHeight,
//       speed: config[difficulty].paddleSpeed,
//       score: 0,
//     };
//     const ball: Ball = {
//       x: canvas.width / 2,
//       y: canvas.height / 2,
//       radius: 8,
//       speedX: (Math.random() > 0.5 ? 1 : -1) * config[difficulty].ballSpeed,
//       speedY: (Math.random() * 160 + 120) * (Math.random() > 0.5 ? 1 : -1), // 120..280 px/sec
//       trail: [],
//     };
//     const WIN_SCORE = 5;

//     function createParticles(
//       x: number,
//       y: number,
//       count: number,
//       color: string
//     ) {
//       for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
//     }

//     function resetBall() {
//       ball.x = canvas.width / 2;
//       ball.y = canvas.height / 2;
//       ball.trail = [];
//       const dir = Math.random() > 0.5 ? 1 : -1;
//       ball.speedX = dir * config[difficulty].ballSpeed;
//       ball.speedY =
//         (Math.random() * 160 + 120) * (Math.random() > 0.5 ? 1 : -1);
//       combo = 0;
//     }

//     /** ===== AI with capped movement ===== */
//     function updateAI(dt: number) {
//       if (!isSinglePlayer || phase !== "playing") return;
//       const paddleCenter = rightPaddle.y + rightPaddle.height / 2;
//       const diff = ball.y - paddleCenter;
//       // target delta scaled by reaction, then clamp by paddle speed
//       const desired =
//         diff * config[difficulty].aiReaction * rightPaddle.speed * dt;
//       const maxStep = rightPaddle.speed * dt;
//       const step = Math.max(-maxStep, Math.min(maxStep, desired));
//       rightPaddle.y += step;
//       rightPaddle.y = Math.max(
//         0,
//         Math.min(canvas.height - rightPaddle.height, rightPaddle.y)
//       );
//     }

//     /** ===== Swept collision (segment vs. expanded AABB) ===== */
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

//       // Paddle expanded by ball radius
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

//     /** ===== Paddle bounce with angle clamp & min |speedX| ===== */
//     function handlePaddleCollision(paddle: Paddle, isLeft: boolean) {
//       const paddleCenter = paddle.y + paddle.height / 2;
//       const hitPos = (ball.y - paddleCenter) / (paddle.height / 2); // -1..1
//       const maxBounce = Math.PI / 4; // 45°
//       const angle = Math.max(
//         -maxBounce,
//         Math.min(maxBounce, hitPos * maxBounce)
//       );

//       const curSpeed = Math.hypot(ball.speedX, ball.speedY);
//       const nextBase = Math.min(900, curSpeed * (1.05 + combo * 0.01)); // speed growth with combo

//       // Guarantee some horizontal push to avoid near-vertical
//       const minAbsX = 140;
//       let newVX = Math.cos(angle) * nextBase * (isLeft ? 1 : -1);
//       let newVY = Math.sin(angle) * nextBase;

//       if (Math.abs(newVX) < minAbsX) {
//         const sign = isLeft ? 1 : -1;
//         const keepSpeed = Math.hypot(minAbsX, newVY);
//         // scale to maintain nextBase magnitude
//         const scale = nextBase / keepSpeed;
//         newVX = minAbsX * sign;
//         newVY *= scale;
//       }

//       ball.speedX = newVX;
//       ball.speedY = newVY;

//       // Nudge ball outside paddle face to avoid sticking
//       ball.x = isLeft
//         ? paddle.x + paddle.width + ball.radius
//         : paddle.x - ball.radius;

//       combo++;
//       createParticles(ball.x, ball.y, 10, "#89b4fa");
//       blip(soundEnabled, 440);
//     }

//     /** ===== Update (dt in seconds) ===== */
//     function update(dt: number) {
//       if (phase !== "playing") return;

//       // Player controls
//       let dyL = 0,
//         dyR = 0;
//       if (keys["w"]) dyL -= leftPaddle.speed * dt;
//       if (keys["s"]) dyL += leftPaddle.speed * dt;
//       if (!isSinglePlayer) {
//         if (keys["ArrowUp"]) dyR -= rightPaddle.speed * dt;
//         if (keys["ArrowDown"]) dyR += rightPaddle.speed * dt;
//       }
//       leftPaddle.y += dyL;
//       rightPaddle.y += dyR;
//       // Clamp paddles
//       leftPaddle.y = Math.max(
//         0,
//         Math.min(canvas.height - leftPaddle.height, leftPaddle.y)
//       );
//       rightPaddle.y = Math.max(
//         0,
//         Math.min(canvas.height - rightPaddle.height, rightPaddle.y)
//       );

//       // AI
//       updateAI(dt);

//       // --- Ball movement with swept collisions against paddles ---
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
//         // move to contact
//         ball.x += vx * tHit;
//         ball.y += vy * tHit;

//         handlePaddleCollision(
//           hitSide === "left" ? leftPaddle : rightPaddle,
//           hitSide === "left"
//         );

//         // move the remainder of the frame after bounce
//         const remain = 1 - tHit;
//         ball.x += ball.speedX * dt * remain;
//         ball.y += ball.speedY * dt * remain;
//       } else {
//         // no paddle hit this frame
//         ball.x += vx;
//         ball.y += vy;
//       }

//       // Top/bottom walls (use radius)
//       if (ball.y - ball.radius < 0) {
//         ball.y = ball.radius;
//         ball.speedY = Math.abs(ball.speedY);
//         blip(soundEnabled, 520, 0.05, 0.15);
//       } else if (ball.y + ball.radius > canvas.height) {
//         ball.y = canvas.height - ball.radius;
//         ball.speedY = -Math.abs(ball.speedY);
//         blip(soundEnabled, 520, 0.05, 0.15);
//       }

//       // Trail (keep last 10)
//       ball.trail.push({ x: ball.x, y: ball.y });
//       if (ball.trail.length > 10) ball.trail.shift();

//       // Scoring
//       if (ball.x + ball.radius < 0) {
//         rightPaddle.score++;
//         createParticles(50, canvas.height / 2, 24, "#f38ba8");
//         blip(
//           soundEnabled,
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
//         createParticles(canvas.width - 50, canvas.height / 2, 24, "#a6e3a1");
//         blip(
//           soundEnabled,
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

//       // Particles
//       for (let i = particles.length - 1; i >= 0; i--) {
//         particles[i].update(dt);
//         if (particles[i].life <= 0.02) particles.splice(i, 1);
//       }
//     }

//     /** ===== Draw ===== */
//     function draw() {
//       // Background
//       ctx.fillStyle = "#1e1e2e";
//       ctx.fillRect(0, 0, canvas.width, canvas.height);

//       // Center line with glow
//       const gradient = ctx.createLinearGradient(
//         canvas.width / 2 - 2,
//         0,
//         canvas.width / 2 + 2,
//         0
//       );
//       gradient.addColorStop(0, "rgba(137, 180, 250, 0)");
//       gradient.addColorStop(0.5, "rgba(137, 180, 250, 0.5)");
//       gradient.addColorStop(1, "rgba(137, 180, 250, 0)");
//       ctx.strokeStyle = gradient;
//       ctx.lineWidth = 2;
//       ctx.setLineDash([10, 15]);
//       ctx.beginPath();
//       ctx.moveTo(canvas.width / 2, 0);
//       ctx.lineTo(canvas.width / 2, canvas.height);
//       ctx.stroke();
//       ctx.setLineDash([]);

//       // Phase overlays
//       const centered = (text: string, y: number) => {
//         ctx.font = "32px monospace";
//         ctx.fillStyle = "#cdd6f4";
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
//         centered(
//           `${winner === "left" ? "Left" : "Right"} Player Wins!`,
//           canvas.height / 2 - 40
//         );
//         if (maxCombo > 0) {
//           ctx.font = "20px monospace";
//           ctx.fillStyle = "#f9e2af";
//           const t = `Max Combo: ${maxCombo}`;
//           const w = ctx.measureText(t).width;
//           ctx.fillText(t, (canvas.width - w) / 2, canvas.height / 2);
//         }
//         centered("Press SPACE to Restart", canvas.height / 2 + 40);
//       }

//       // Particles
//       particles.forEach((p) => p.draw(ctx));

//       // Ball trail
//       ctx.globalAlpha = 0.3;
//       for (let i = 0; i < ball.trail.length; i++) {
//         const t = ball.trail[i];
//         const a = (i / ball.trail.length) * 0.3;
//         ctx.globalAlpha = a;
//         ctx.fillStyle = "#f5e0dc";
//         ctx.beginPath();
//         ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
//         ctx.fill();
//       }
//       ctx.globalAlpha = 1;

//       // Paddles
//       ctx.shadowBlur = 15;
//       ctx.shadowColor = "#89b4fa";
//       ctx.fillStyle = "#89b4fa";
//       ctx.fillRect(
//         leftPaddle.x,
//         leftPaddle.y,
//         leftPaddle.width,
//         leftPaddle.height
//       );
//       ctx.fillRect(
//         rightPaddle.x,
//         rightPaddle.y,
//         rightPaddle.width,
//         rightPaddle.height
//       );
//       ctx.shadowBlur = 0;

//       // Ball
//       ctx.shadowBlur = 20;
//       ctx.shadowColor = "#f5e0dc";
//       ctx.beginPath();
//       ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
//       ctx.fillStyle = "#f5e0dc";
//       ctx.fill();
//       ctx.shadowBlur = 0;

//       // Scores
//       ctx.font = "bold 48px monospace";
//       ctx.fillStyle = "#cdd6f4";
//       ctx.fillText(leftPaddle.score.toString(), canvas.width / 4 - 12, 60);
//       ctx.fillText(
//         rightPaddle.score.toString(),
//         (canvas.width * 3) / 4 - 12,
//         60
//       );

//       // Combo
//       if (combo > 2 && phase === "playing") {
//         ctx.font = "bold 24px monospace";
//         ctx.fillStyle = "#f9e2af";
//         const text = `${combo}x COMBO!`;
//         const w = ctx.measureText(text).width;
//         ctx.fillText(text, (canvas.width - w) / 2, 100);
//       }
//     }

//     /** ===== Loop ===== */
//     function gameLoop(now: number) {
//       const dt = lastTime ? (now - lastTime) / 1000 : 0;
//       lastTime = now;
//       update(dt);
//       draw();
//       animationId = requestAnimationFrame(gameLoop);
//     }

//     /** ===== Input (prevent page scroll) ===== */
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
//         blip(soundEnabled, 440, 0.06, 0.2);
//       } else if (phase === "playing" && e.key === "p") {
//         phase = "paused";
//         blip(soundEnabled, 330, 0.05, 0.18);
//       } else if (phase === "paused" && e.key === "p") {
//         phase = "playing";
//         blip(soundEnabled, 440, 0.05, 0.18);
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
//   }, [isSinglePlayer, soundEnabled, difficulty, gameMode]);

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
//       {gameMode === "menu" && (
//         <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl max-w-md w-full">
//           <h1 className="text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
//             Enhanced Pong
//           </h1>

//           <div className="space-y-4 mb-6">
//             <button
//               onClick={() => {
//                 setIsSinglePlayer(true);
//                 setGameMode("playing");
//               }}
//               className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
//             >
//               Single Player
//             </button>
//             <button
//               onClick={() => {
//                 setIsSinglePlayer(false);
//                 setGameMode("playing");
//               }}
//               className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
//             >
//               Two Players
//             </button>
//           </div>

//           <div className="border-t border-gray-700 pt-6 space-y-4">
//             <div>
//               <label className="block text-gray-300 mb-2 font-medium">
//                 Difficulty
//               </label>
//               <select
//                 value={difficulty}
//                 onChange={(e) => setDifficulty(e.target.value as DifficultyKey)}
//                 className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
//               >
//                 <option value="easy">Easy</option>
//                 <option value="medium">Medium</option>
//                 <option value="hard">Hard</option>
//               </select>
//             </div>

//             <button
//               onClick={() => setSoundEnabled(!soundEnabled)}
//               className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
//             >
//               {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
//               Sound: {soundEnabled ? "On" : "Off"}
//             </button>
//           </div>

//           <div className="mt-6 text-gray-400 text-sm space-y-2">
//             <p className="font-semibold text-gray-300">Controls:</p>
//             <p>Left Player: W / S</p>
//             <p>Right Player: ↑ / ↓</p>
//             <p>Pause: P • Start: SPACE</p>
//           </div>
//         </div>
//       )}

//       {gameMode === "playing" && (
//         <div className="relative">
//           <div className="absolute top-4 right-4 flex gap-2">
//             <button
//               onClick={() => setSoundEnabled(!soundEnabled)}
//               className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
//             >
//               {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
//             </button>
//             <button
//               onClick={() => setGameMode("menu")}
//               className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
//             >
//               Menu
//             </button>
//           </div>

//           <canvas
//             ref={canvasRef}
//             width={810}
//             height={600}
//             className="border-4 border-gray-700 rounded-lg shadow-2xl"
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export default Pong;
