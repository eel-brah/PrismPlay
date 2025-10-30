// frontend/game/Pong.tsx
import { useEffect, useRef } from "react";
import { createPongGame } from "./index";
import type { AIConfig } from "./types";

type Props = {
  width?: number;
  height?: number;
  ai?: Partial<AIConfig>;
  className?: string;
};

export default function Game({
  width = 800,
  height = 520,
  ai,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsRef = useRef<HTMLSpanElement | null>(null);

  // Set canvas size + device-pixel-ratio scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  // Boot the game and clean up on unmount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createPongGame(canvas, fpsRef.current, ai);
    return () => game.destroy();
  }, [ai]);

  return (
    <div className={className} style={{ display: "inline-block" }}>
      <canvas ref={canvasRef} />
      <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12 }}>
        <span ref={fpsRef} />
        <span style={{ marginLeft: 12, opacity: 0.75 }}>
          Controls: W/S (Left), ↑/↓ (Right), Space (Start), P (Pause/Continue)
        </span>
      </div>
    </div>
  );
}
