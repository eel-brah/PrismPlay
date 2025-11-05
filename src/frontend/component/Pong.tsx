import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { beepSound } from "../utils/sound";
// declaration
type Difficulty = "easy" | "medium" | "hard";
type GameStutes = "start" | "playing" | "paused" | "scored" | "gameover";
type Winner = "left" | "right" | null;

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  score: number;
}
interface TrailPoint {
  x: number;
  y: number;
}
interface Ball {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  trail: TrailPoint[];
}

interface DifficultyPreset {
  ballSpeed: number; // pixels per second
  paddleSpeed: number; // pixels per second
  aiReaction: number; // how fast the bot follows
  paddleHeight: number;
}

type Config = Record<Difficulty, DifficultyPreset>;

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
    // px/sec
    this.life = 1;
    this.decay = 0.9;
    this.color = color;
    this.size = Math.random() * 3 + 2;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vx * dt;
    // exponential-ish fade
    this.life *= Math.pow(this.decay, dt * 60);
    this.vx *= 1 - 0.2 * dt * 60;
    this.vy *= 1 - 0.2 * dt * 60;
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

const Pong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameMode, setGameMode] = useState<"menu" | "playing">("menu");
  const [isSingle, setIsSingle] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    //Config tuned for px/sec

    const config: Config = {
      easy: {
        ballSpeed: 320,
        paddleSpeed: 520,
        aiReaction: 0.06,
        paddleHeight: 120,
      },
      medium: {
        ballSpeed: 380,
        paddleSpeed: 640,
        aiReaction: 0.09,
        paddleHeight: 100,
      },
      hard: {
        ballSpeed: 440,
        paddleSpeed: 760,
        aiReaction: 0.13,
        paddleHeight: 80,
      },
    };
    //Game state (not React state)
    let phase: GameStutes = "start";
    let winner: Winner = null;
    let animationId: number | null = null;
    let lastTime: number = 0;
    let combo: number = 0;
    let maxCombo: number = 0;

    const keys: Record<string, boolean> = {};
    const particles: Particle[] = [];
    const leftPaddle: Paddle = {
      x: 10,
      y: 260,
      width: 20,
      height: config[difficulty].paddleHeight,
      speed: config[difficulty].paddleSpeed,
      score: 0,
    };
    const rightPaddle: Paddle = {
      x: 780,
      y: 260,
      width: 20,
      height: config[difficulty].paddleHeight,
      speed: config[difficulty].paddleSpeed,
      score: 0,
    };
    const ball: Ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 8,
      speedX: (Math.random() > 0.5 ? 1 : -1) * config[difficulty].ballSpeed,
      speedY: (Math.random() * 160 + 120) * (Math.random() > 0.5 ? 1 : -1), // 120..280 px/sec
      trail: [],
    };

    const WIN_SCORE = 5;

    function createParticles(
      x: number,
      y: number,
      count: number,
      color: string
    ) {
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
    }
    function resetBall() {
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.trail = [];
      const dir = Math.random() > 0.5 ? 1 : -1;
      ball.speedX = dir * config[difficulty].ballSpeed;
      ball.speedY =
        (Math.random() * 160 + 120) * (Math.random() > 0.5 ? 1 : -1);
      combo = 0;
    }

    //ai work fasi badl ila ola update l ai dyalk

    function updateAI(dt: number) {
      if (!isSingle || GameStutes !== "playing") return;
    }
  }, []);
};
