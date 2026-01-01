// Pong.tsx
import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { beepSound } from "@/utils/sound";
import createAIOpponent, { AIOpponent } from "@/game/ai";
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
} from "@/game/types";
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
} from "@/game/config";
import DifficultySlider from "./DifficultySlider";

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

const Pong: React.FC<{ onReturn?: () => void }> = ({ onReturn }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const [gameMode, setGameMode] = useState<"menu" | "playing">("menu");
  const [isSingle, setIsSingle] = useState<boolean>(false);
  const [isAI, setIsAI] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [aiPos, setAiPos] = useState<AiPos>("left");

const soundOnRef = useRef(soundOn);

useEffect(() => {
  soundOnRef.current = soundOn;
}, [soundOn]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentConfig = getConfig(difficulty);

    let phase: GameStatus = "start";
    let winner: Winner = null;
    let animationId: number | null = null;
    let lastTime: number = 0;
    let combo: number = 0;
    let maxCombo: number = 0;

    const keys: Record<string, boolean> = {};
    const particles: Particle[] = [];
    const leftPaddle = createPaddle(
      LEFT_X,
      INITIAL_Y,
      PADDLE_WIDTH,
      currentConfig.paddleHeight,
      currentConfig.paddleSpeed
    );
    const rightPaddle = createPaddle(
      RIGHT_X,
      INITIAL_Y,
      PADDLE_WIDTH,
      currentConfig.paddleHeight,
      currentConfig.paddleSpeed
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

    function createBall(canvas: HTMLCanvasElement, ballSpeed: number): Ball {
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: RADIUS,
        speedX: randomDirection() * ballSpeed,
        speedY: randomDirection() * randomSpeedY(MIN_SPEED, MAX_SPEED),
        trail: [],
      };
    }
    function createParticles(x: number, y: number, count: number, color: string) {
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
    }
    function createPaddle(
      x: number,
      y: number,
      width: number,
      height: number,
      speed: number
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
      p: Paddle
    ): number | null {
      const x0 = bx, y0 = by, x1 = bx + vx, y1 = by + vy;
      const dx = x1 - x0, dy = y1 - y0;

      const minX = p.x - r, maxX = p.x + p.width + r;
      const minY = p.y - r, maxY = p.y + p.height + r;

      let t0 = 0, t1 = 1;
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

    function configAiOpponent(aiConfig: AIConfig): AIObject {
      if (!aiConfig.enabled) return {};

      const aiObjects: { leftAI?: AIOpponent; rightAI?: AIOpponent } = {};

      if (aiConfig.controls === "left" || aiConfig.controls === "both") {
        aiObjects.leftAI = createAIOpponent({
          paddle: leftPaddle,
          isLeft: true,
          canvas: { width: canvas.width, height: canvas.height },
          reactionDelayMs: aiConfig.reactionDelayMs,
          paddleHeight: currentConfig.paddleHeight,
          getBall,
        });
      }

      if (aiConfig.controls === "right" || aiConfig.controls === "both") {
        aiObjects.rightAI = createAIOpponent({
          paddle: rightPaddle,
          isLeft: false,
          canvas: { width: canvas.width, height: canvas.height },
          reactionDelayMs: aiConfig.reactionDelayMs,
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
        if (keys["w"]) dyL -= leftPaddle.speed * dt;
        if (keys["s"]) dyL += leftPaddle.speed * dt;
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

      leftPaddle.y = Math.max(0, Math.min(canvas.height - leftPaddle.height, leftPaddle.y));
      rightPaddle.y = Math.max(0, Math.min(canvas.height - rightPaddle.height, rightPaddle.y));

      const vx = ball.speedX * dt;
      const vy = ball.speedY * dt;

      let tHit = sweptPaddleHit(ball.x, ball.y, vx, vy, ball.radius, leftPaddle);
      let hitSide: "left" | "right" | null = tHit !== null ? "left" : null;

      const tRight = sweptPaddleHit(ball.x, ball.y, vx, vy, ball.radius, rightPaddle);
      if (tRight !== null && (tHit === null || tRight < tHit)) {
        tHit = tRight;
        hitSide = "right";
      }
      if (tHit !== null) {
        ball.x += vx * tHit;
        ball.y += vy * tHit;
        handlePaddleCollision(hitSide === "left" ? leftPaddle : rightPaddle, hitSide === "left");
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
        beepSound(soundOnRef.current, rightPaddle.score >= WIN_SCORE ? 659 : 523, 0.12, 0.3);
        if (rightPaddle.score >= WIN_SCORE) {
          winner = "right";
          phase = "gameover";
          maxCombo = Math.max(maxCombo, combo);
        } else {
          phase = "scored";
        }
      } else if (ball.x - ball.radius > canvas.width) {
        leftPaddle.score++;
        beepSound(soundOnRef.current, leftPaddle.score >= WIN_SCORE ? 659 : 523, 0.12, 0.3);
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

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(canvas.width / 2 - 2, 0, canvas.width / 2 + 2, 0);
      gradient.addColorStop(0, "rgba(137, 180, 250, 0)");
      gradient.addColorStop(0.5, "rgba(137, 180, 250, 0.5)");
      gradient.addColorStop(1, "rgba(137, 180, 250, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      const centered = (text: string, y: number) => {
        ctx.font = "32px monospace";
        ctx.fillStyle = "#cdd6f4";
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
        centered(`${winner === "left" ? "Left" : "Right"} Player Wins!`, canvas.height / 2 - 40);
        if (maxCombo > 0) {
          ctx.font = "20px monospace";
          ctx.fillStyle = "#f9e2af";
          const t = `Max Combo: ${maxCombo}`;
          const w = ctx.measureText(t).width;
          ctx.fillText(t, (canvas.width - w) / 2, canvas.height / 2);
        }
        centered("Press SPACE to Restart", canvas.height / 2 + 40);
      }

      particles.forEach((p) => p.draw(ctx));

      ctx.globalAlpha = 0.3;
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        const a = (i / ball.trail.length) * 0.3;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#f5e0dc";
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.shadowBlur = 15;
      ctx.shadowColor = "#89b4fa";
      ctx.fillStyle = "#89b4fa";
      ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
      ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);
      ctx.shadowBlur = 0;

      ctx.shadowBlur = 20;
      ctx.shadowColor = "#f5e0dc";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f5e0dc";
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = "bold 48px monospace";
      ctx.fillStyle = "#cdd6f4";
      ctx.fillText(leftPaddle.score.toString(), canvas.width / 4 - 12, 60);
      ctx.fillText(rightPaddle.score.toString(), (canvas.width * 3) / 4 - 12, 60);

      if (combo > 2 && phase === "playing") {
        ctx.font = "bold 24px monospace";
        ctx.fillStyle = "#f9e2af";
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
      } catch (err) {
        console.error("Game loop crashed:", err);
        cancelAnimationFrame(animationId!);
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

    
    const resizeCanvas = () => {
      const parent =
        arenaContainerRef.current ??
        canvasRef.current?.parentElement ??
        null;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const ratio = 810 / 600;
      const scale = 1.0;
      const effectiveScale = Math.min(scale, 1);
      let w = rect.width;
      let h = rect.height;
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;

      
      canvas.style.width = `${w * effectiveScale}px`;
      canvas.style.height = `${h * effectiveScale}px`;
    };

    const observer = new ResizeObserver(resizeCanvas);
    if (canvasRef.current.parentElement) observer.observe(canvasRef.current.parentElement);
    resizeCanvas();

    return () => {
      document.removeEventListener("keydown", handleKeyDown as any);
      document.removeEventListener("keyup", handleKeyUp as any);
      if (animationId) cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [, gameMode,]);

  const leftIsAI = isAI && (!isSingle || aiPos === "left");
  const rightIsAI = isAI && (!isSingle || aiPos === "right");

  return (
    <>
      {/* MENU - stays in the right 40% */}
      {gameMode === "menu" && (
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <h1 className="text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            PinPon Game
          </h1>

          <div className="space-y-4 mb-6">
            <button
              onClick={() => {
                setIsSingle(true);
                setIsAI(true);
                setGameMode("playing");
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Single Player
            </button>
            <button
              onClick={() => {
                setIsSingle(false);
                setIsAI(false);
                setGameMode("playing");
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Two Players
            </button>
            <button
              onClick={() => {
                setIsSingle(false);
                setIsAI(true);
                setGameMode("playing");
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              AIs
            </button>
            <button
              onClick={() => {
                if (onReturn) onReturn();
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg font-semibold transition-all shadow-lg"
            >
              Return
            </button>
          </div>

          <div className="border-t border-gray-700 pt-6 space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">AI Side</label>
              <div className="flex gap-2">
                {(["left", "right"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setAiPos(pos)}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${aiPos === pos
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      }`}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <DifficultySlider difficulty={difficulty} setDifficulty={setDifficulty} />

            <button
              onClick={() => setSoundOn(!soundOn)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              Sound: {soundOn ? "On" : "Off"}
            </button>
          </div>

          <div className="mt-6 text-gray-400 text-sm space-y-2">
            <p className="font-semibold text-gray-300">Controls:</p>
            <p>Left Player: W / S</p>
            <p>Right Player: Up/Down Arrows</p>
            <p>Pause: P • Start: SPACE</p>
          </div>
        </div>
      )}

      {/* PLAYING - FULL SCREEN */}
      {gameMode === "playing" && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
          
          {/* Header */}
          <div className="absolute top-16 text-center space-y-1 z-10">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center gap-2">
              <span className="text-3xl">🏓</span> PingPong Craft Arena
            </h1>
            <p className="text-gray-400 text-sm">Use arrow keys or W/S to control your paddle</p>
          </div>

           <div className="flex w-full max-w-[1400px] gap-6 items-center justify-center mt-12 h-[70vh]">
             {/* Left Player Panel */}
             <div className="w-80 bg-gray-900/80 border border-gray-700 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden shadow-2xl">
               <div className={`${leftIsAI ? "bg-blue-600" : "bg-purple-600"} text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-6`}>
                 {leftIsAI ? "AI Opponent" : "Player"}
               </div>
               
               <div className="bg-gray-800/50 rounded-xl p-6 mb-6 flex flex-col items-center border border-gray-700/50">
                 <div className="w-16 h-16 rounded-full bg-gray-700 mb-3 overflow-hidden flex items-center justify-center">
                    {leftIsAI ? <span className="text-3xl">🤖</span> : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Player1`} alt="P1" className="w-full h-full" />}
                 </div>
                 <h3 className={`text-lg font-semibold ${leftIsAI ? "text-blue-300" : "text-purple-300"}`}>{leftIsAI ? "AI Opponent" : "Player 1"}</h3>
                 <p className="text-xs text-gray-400 mt-1">Left Paddle</p>
               </div>
 
               <div className="space-y-4 flex-1">
                 <div className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      🏆 Score
                    </span>
                    <span className="text-2xl font-bold text-white">{0 /* Score handled in canvas, maybe reflect here? */}</span>
                 </div>
                 <div className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Total Wins</span>
                    <span className="text-green-400 font-mono">40</span>
                 </div>
                 <div className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Losses</span>
                    <span className="text-red-400 font-mono">11</span>
                 </div>
                 
                 <div className="mt-4">
                   <div className="flex justify-between text-xs text-gray-400 mb-1">
                     <span>Win Rate</span>
                     <span>78%</span>
                   </div>
                   <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-500 w-[78%]"></div>
                   </div>
                 </div>
               </div>

               {!leftIsAI ? (
                 <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                   <p className="text-xs text-gray-400 mb-2">Controls:</p>
                   <div className="flex gap-2">
                     <div className="flex flex-col gap-1">
                       <div className="w-8 h-8 rounded border border-gray-600 flex items-center justify-center text-xs text-gray-300">W</div>
                       <div className="w-8 h-8 rounded border border-gray-600 flex items-center justify-center text-xs text-gray-300">S</div>
                     </div>
                     <div className="flex flex-col justify-center text-xs text-gray-500 gap-3 ml-2">
                       <span>Move Up</span>
                       <span>Move Down</span>
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                   <p className="text-xs text-gray-400 mb-2">AI Behavior:</p>
                   <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                     <li>Tracks ball movement</li>
                     <li>Adjusts paddle position</li>
                     <li>{difficulty} difficulty</li>
                     <li>Fair gameplay</li>
                   </ul>
                 </div>
               )}
             </div>
 
             {/* Middle Game Arena */}
             <div className="flex-1 h-full flex flex-col relative">
               <div className="absolute top-4 right-6 z-20 font-mono text-2xl text-white font-bold tracking-wider">
                 {/* Score Placeholder - Canvas draws it, but we can overlay too if needed, or rely on canvas */}
                 {/* 0 - 0 */}
               </div>
               
               <div ref={arenaContainerRef} className="flex-shrink-0 bg-gray-900 border-2 border-purple-500/30 rounded-2xl relative shadow-[0_0_50px_rgba(168,85,247,0.2)]">
                 <div className="absolute top-4 left-6 text-gray-400 font-medium">Game Arena</div>
                 <canvas
                   ref={canvasRef}
                   width={810}
                   height={600}
                   className="max-w-full max-h-full w-auto h-auto"
                   style={{ imageRendering: "auto" }}
                 />
               </div>
               
               <div className="mt-6 flex justify-center gap-3 items-center">
                  <button 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-12 rounded-xl shadow-lg shadow-blue-900/20 transform transition hover:scale-105 active:scale-95"
                    onClick={() => {
                      // Trigger start logic manually if needed
                      const event = new KeyboardEvent('keydown', { key: ' ' });
                      document.dispatchEvent(event);
                    }}
                  >
                    Start Game
                  </button>
                  <button
                    onClick={() => setSoundOn(!soundOn)}
                    className="bg-gray-800/80 hover:bg-gray-800 text-white px-4 py-3 rounded-xl transition-all flex items-center gap-2"
                  >
                    {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    {soundOn ? "Sound: On" : "Sound: Off"}
                  </button>
               </div>
             </div>
 
             {/* Right Player Panel */}
             <div className="w-80 bg-gray-900/80 border border-gray-700 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden shadow-2xl">
               <div className={`${rightIsAI ? "bg-blue-600" : "bg-purple-600"} text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-6`}>
                 {rightIsAI ? "AI Opponent" : "Player"}
               </div>
               
               <div className="bg-gray-800/50 rounded-xl p-6 mb-6 flex flex-col items-center border border-gray-700/50">
                 <div className="w-16 h-16 rounded-full bg-gray-700 mb-3 overflow-hidden flex items-center justify-center">
                    {rightIsAI ? <span className="text-3xl">🤖</span> : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Player2`} alt="P2" className="w-full h-full" />}
                 </div>
                 <h3 className={`text-lg font-semibold ${rightIsAI ? "text-blue-300" : "text-purple-300"}`}>{rightIsAI ? "AI Opponent" : "Player 2"}</h3>
                 <p className="text-xs text-gray-400 mt-1">Right Paddle {rightIsAI && "(AI)"}</p>
               </div>
 
               <div className="space-y-4 flex-1">
                 <div className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      🏆 Score
                    </span>
                    <span className="text-2xl font-bold text-white">{0 /* Score */}</span>
                 </div>
                 
                 {rightIsAI && (
                   <div className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-gray-400 text-sm flex items-center gap-2">
                        🤖 AI Level
                      </span>
                      <span className="text-blue-400 font-medium capitalize">{difficulty}</span>
                   </div>
                 )}
                 
                 <div className="bg-gray-800/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      ⚡ Status
                    </span>
                    <span className="text-green-400 text-sm">Active</span>
                 </div>
 
                 <div className="mt-4">
                   <div className="flex justify-between text-xs text-gray-400 mb-1">
                     <span>Match Progress</span>
                     <span className="text-blue-400">Live</span>
                   </div>
                   <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 w-[45%] animate-pulse"></div>
                   </div>
                 </div>
               </div>
 
               {rightIsAI ? (
                 <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                   <p className="text-xs text-gray-400 mb-2">AI Behavior:</p>
                   <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                     <li>Tracks ball movement</li>
                     <li>Adjusts paddle position</li>
                     <li>{difficulty} difficulty</li>
                     <li>Fair gameplay</li>
                   </ul>
                 </div>
               ) : (
                 <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                   <p className="text-xs text-gray-400 mb-2">Controls:</p>
                   <div className="flex gap-2">
                     <div className="flex flex-col gap-1">
                       <div className="w-8 h-8 rounded border border-gray-600 flex items-center justify-center text-xs text-gray-300">↑</div>
                       <div className="w-8 h-8 rounded border border-gray-600 flex items-center justify-center text-xs text-gray-300">↓</div>
                     </div>
                     <div className="flex flex-col justify-center text-xs text-gray-500 gap-3 ml-2">
                       <span>Move Up</span>
                       <span>Move Down</span>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}
    </>
  );
};

export default Pong;
