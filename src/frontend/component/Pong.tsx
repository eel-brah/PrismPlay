import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// declaration
type DifficultyKey = "easy" | "medium" | "hard";
type Phase = "start" | "playing" | "paused" | "scored" | "gameover";
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
type Config = Record<DifficultyKey, DifficultyPreset>;
