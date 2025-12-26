import React, { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Volume2, VolumeX } from "lucide-react";
import { beepSound } from "@/utils/sound";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSnapshot,
  MatchFoundPayload,
} from "../../shared/pong/gameTypes";

export interface OnlinePongProps {
  profile: {
    id: string;
    nickname: string;
    avatarUrl?: string;
  };
  onReturn?: () => void;
}

type PhaseUI = "searching" | "inMatch" | "gameover" | "opponentLeft";

const GAME_WIDTH = 810;
const GAME_HEIGHT = 600;

const OnlinePong: React.FC<OnlinePongProps> = ({ profile, onReturn }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const snapshotRef = useRef<GameSnapshot | null>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef({ up: false, down: false });
  const [soundOn, setSoundOn] = useState(true);
  const [uiPhase, setUiPhase] = useState<PhaseUI>("searching");
  const [side, setSide] = useState<"left" | "right" | null>(null);
  const [opponentName, setOpponentName] = useState<string>("?");

  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // --- Setup socket & matchmaking ---
  useEffect(() => {
    console.log("Connecting to /pong namespace");
    // Connect to the same socket.io path as Agario, but in /pong namespace
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      "/pong",
      {
        path: "/socket.io", // matches your backend socket index.ts
        transports: ["websocket", "polling"],
        withCredentials: true,
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[pong] connected", socket.id, profile);
      socket.emit("match.join", {
        id: profile.id,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      });
    });

    socket.on("match.waiting", () => setUiPhase("searching"));
    socket.on("match.found", (payload: MatchFoundPayload) => {
      setSide(payload.side);
      setOpponentName(payload.opponent.nickname);
      setUiPhase("inMatch");
    });
    socket.on("game.state", (snapshot) => (snapshotRef.current = snapshot));
    socket.on("game.over", (payload) => {
      snapshotRef.current = {
        ...(snapshotRef.current as GameSnapshot),
        phase: "gameover",
        winner: payload.winnerSide,
      };
      setUiPhase("gameover");
      if (soundOnRef.current) beepSound(true, 659, 0.15, 0.4);
    });
    socket.on("opponent.disconnected", () => {
      setUiPhase((prev) => (prev === "gameover" ? prev : "gameover"));
    });

    return () => {
      socket.emit("match.leave");
      socket.disconnect();
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current);
    };
  }, [profile.id, profile.nickname, profile.avatarUrl]);

  // --- Key handling: local input + send to server ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
      if (e.key === "ArrowUp") keysRef.current.up = true;
      if (e.key === "ArrowDown") keysRef.current.down = true;
      emitInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
      if (e.key === "ArrowUp") keysRef.current.up = false;
      if (e.key === "ArrowDown") keysRef.current.down = false;
      emitInput();
    };

    function emitInput() {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit("input.update", {
        up: keysRef.current.up,
        down: keysRef.current.down,
      });
    }

    document.addEventListener("keydown", handleKeyDown, { passive: false });
    document.addEventListener("keyup", handleKeyUp, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown as any);
      document.removeEventListener("keyup", handleKeyUp as any);
    };
  }, []);

  // --- Rendering loop (client only draws; server runs physics) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const snap = snapshotRef.current;
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!snap) {
        // no state yet
        ctx.fillStyle = "#cdd6f4";
        ctx.font = "28px monospace";
        const msg =
          uiPhase === "searching"
            ? "Searching for opponent..."
            : "Waiting for game...";
        const w = ctx.measureText(msg).width;
        ctx.fillText(msg, (canvas.width - w) / 2, canvas.height / 2);
        return;
      }

      // mid line
      const gradient = ctx.createLinearGradient(
        canvas.width / 2 - 2,
        0,
        canvas.width / 2 + 2,
        0
      );
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

      const centered = (text: string, y: number, fontSize: number = 28) => {
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = "#cdd6f4";
        const w = ctx.measureText(text).width;
        ctx.fillText(text, (canvas.width - w) / 2, y);
      };

      if (snap.phase === "gameover" && snap.winner && side) {
        const isWinner = snap.winner === side;
        centered(isWinner ? "You win!" : "You lose!", canvas.height / 2);
      }

      // ball trail
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < snap.ball.trail.length; i++) {
        const t = snap.ball.trail[i];
        const a = (i / snap.ball.trail.length) * 0.3;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#f5e0dc";
        ctx.beginPath();
        ctx.arc(t.x, t.y, snap.ball.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // paddles
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#89b4fa";
      ctx.fillStyle = "#89b4fa";

      const leftX = 40;
      const rightX = GAME_WIDTH - 40 - 16; // matches server

      ctx.fillRect(leftX, snap.left.y, 16, snap.left.height);
      ctx.fillRect(rightX, snap.right.y, 16, snap.right.height);
      ctx.shadowBlur = 0;

      // ball
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#f5e0dc";
      ctx.beginPath();
      ctx.arc(snap.ball.x, snap.ball.y, snap.ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f5e0dc";
      ctx.fill();
      ctx.shadowBlur = 0;

      // score
      ctx.font = "bold 48px monospace";
      ctx.fillStyle = "#cdd6f4";
      ctx.fillText(snap.left.score.toString(), canvas.width / 4 - 12, 60);
      ctx.fillText(
        snap.right.score.toString(),
        (canvas.width * 3) / 4 - 12,
        60
      );

      // combo
      if (snap.combo > 2 && snap.phase === "playing") {
        ctx.font = "bold 24px monospace";
        ctx.fillStyle = "#f9e2af";
        const text = `${snap.combo}x COMBO!`;
        const w = ctx.measureText(text).width;
        ctx.fillText(text, (canvas.width - w) / 2, 100);
      }

      // Display countdown overlay (drawn last so it appears on top)
      if (snap.phase === "countdown") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (snap.countdown > 0) {
          centered(snap.countdown.toString(), canvas.height / 2 + 20, 96);
          centered("Game Ready!", canvas.height / 2 - 60, 32);
          centered(`vs ${opponentName}`, canvas.height / 2 + 100, 24);
        }
      }
    };

    const loop = () => {
      try {
        draw();
      } catch (err) {
        console.error("Online draw loop crashed:", err);
        if (animationRef.current !== null)
          cancelAnimationFrame(animationRef.current);
        return;
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current);
    };
  }, [uiPhase, opponentName, side]);

  // Resize canvas like your offline component
  useEffect(() => {
    const resizeCanvas = () => {
      if (!canvasRef.current?.parentElement) return;
      const parent = canvasRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      const ratio = GAME_WIDTH / GAME_HEIGHT;
      const scale = 0.8;
      const effectiveScale = Math.min(scale, 1);

      let w = rect.width;
      let h = rect.height;
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.width = `${w * effectiveScale}px`;
      canvas.style.height = `${h * effectiveScale}px`;
    };
    const observer = new ResizeObserver(resizeCanvas);
    if (canvasRef.current?.parentElement)
      observer.observe(canvasRef.current.parentElement);
    resizeCanvas();

    return () => observer.disconnect();
  }, []);

  // --- UI ---
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => setSoundOn((s) => !s)}
          className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
        >
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        {onReturn && (
          <button
            onClick={onReturn}
            className="bg-gray-800/80 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all"
          >
            Return
          </button>
        )}
      </div>

      {/* Status overlay */}
      <div className="absolute top-4 left-4 text-gray-200 z-10 space-y-1">
        <p className="font-semibold">
          You: <span className="text-blue-400">{profile.nickname}</span>
        </p>
        {side && (
          <p>
            Side:{" "}
            <span className="font-mono">
              {side === "left" ? "Left (↑/↓)" : "Right (↑/↓)"}
            </span>
          </p>
        )}
        {uiPhase === "searching" && <p>Matching...</p>}
        {uiPhase === "inMatch" && (
          <p>
            Opponent: <span className="text-pink-300">{opponentName}</span>
          </p>
        )}
        {uiPhase === "opponentLeft" && (
          <p className="text-yellow-300">Opponent disconnected</p>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="max-w-full max-h-full w-auto h-auto border-4 border-gray-700 rounded-lg shadow-2xl"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
};

export default OnlinePong;
