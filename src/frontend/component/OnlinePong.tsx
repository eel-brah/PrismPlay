import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { Volume2, VolumeX, LogOut } from "lucide-react";
import { beepSound } from "@/utils/sound";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameSnapshot,
  MatchFoundPayload,
  Side,
} from "../../shared/pong/gameTypes";
import {
  OnlinePongHUD,
  OnlinePlayerLite,
  OnlinePongStats,
  Status,
} from "./OnlinePongHUD";
import { GameOverPopup, WinReason } from "./GameOverPopup";

export interface OnlinePongProps {
  token: string;
  onReturn?: () => void;
}

type PhaseUI = "searching" | "inMatch" | "gameover" | "opponentLeft" | "error";

const GAME_WIDTH = 810;
const GAME_HEIGHT = 600;

//opponent is unknown object
const UNKNOWN_PLAYER: OnlinePlayerLite = {
  id: 0,
  nickname: "???",
  avatarUrl: null,
};

const OnlinePong: React.FC<OnlinePongProps> = ({ token, onReturn }) => {
  const navigate = useNavigate();
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [side, setSide] = useState<Side | null>(null);

  // Player info state
  const [opponent, setOpponent] = useState<OnlinePlayerLite>(UNKNOWN_PLAYER);
  const [myStatus, setMyStatus] = useState<Status>("connected");
  const [opponentStatus, setOpponentStatus] = useState<Status>("disconnected");

  // Stats
  const [myStats, setMyStats] = useState<OnlinePongStats | undefined>(
    undefined,
  );
  const [opponentStats, setOpponentStats] = useState<
    OnlinePongStats | undefined
  >(undefined);
  const [loadingStats, setLoadingStats] = useState(true);

  // Game over state
  const [gameOverData, setGameOverData] = useState<{
    isWinner: boolean;
    myScore: number;
    opponentScore: number;
    winReason?: WinReason;
  } | null>(null);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [myProfile, setMyProfile] = useState<OnlinePlayerLite | null>(null);

  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const uiPhaseRef = useRef<PhaseUI>("searching");
  useEffect(() => {
    uiPhaseRef.current = uiPhase;
  }, [uiPhase]);

  const connectionErrorRef = useRef<string | null>(null);
  useEffect(() => {
    connectionErrorRef.current = connectionError;
  }, [connectionError]);

  const opponentNicknameRef = useRef<string>(UNKNOWN_PLAYER.nickname);
  useEffect(() => {
    opponentNicknameRef.current = opponent.nickname;
  }, [opponent.nickname]);

  const sideRef = useRef<Side | null>(null);
  useEffect(() => {
    sideRef.current = side;
  }, [side]);

  // Create player objects for HUD
  const myPlayer: OnlinePlayerLite = myProfile ?? {
    id: 0,
    nickname: "you",
    avatarUrl: undefined,
  };

  // Determine which player is on which side
  const leftPlayer = side === "left" ? myPlayer : opponent;
  const rightPlayer = side === "right" ? myPlayer : opponent;
  const leftStatus = side === "left" ? myStatus : opponentStatus;
  const rightStatus = side === "right" ? myStatus : opponentStatus;
  const leftStats = side === "left" ? myStats : opponentStats;
  const rightStats = side === "right" ? myStats : opponentStats;

  // --- Setup socket & matchmaking ---
  useEffect(() => {
    console.log("Connecting to /pong namespace");
    console.log("Token being used:", token ? "present" : "MISSING");
    console.log("Token value:", token?.substring(0, 20) + "...");
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      "/pong",
      {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket", "polling"],
        withCredentials: true,
      },
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[pong] connected", socket.id);
      setMyStatus("connected");
      setConnectionError(null);
      socket.emit("match.join");
    });

    socket.on("disconnect", () => {
      setMyStatus("disconnected");
    });

    socket.on("match.waiting", () => {
      setUiPhase("searching");
      setOpponentStatus("disconnected");
      setOpponent(UNKNOWN_PLAYER);
      //Reset stats
      setMyStats(undefined);
      setOpponentStats(undefined);
      setLoadingStats(true);
    });

    socket.on("match.found", (payload: MatchFoundPayload) => {
      console.log("[match.found] side:", payload.side);
      console.log("[match.found] playerStats:", payload.playerStats);
      console.log("[match.found] opponentStats:", payload.opponentStats);

      setSide(payload.side);
      sideRef.current = payload.side;

      setMyProfile({
        id: payload.player.id,
        nickname: payload.player.nickname,
        avatarUrl: payload.player.avatarUrl,
      });

      setOpponent({
        id: payload.opponent.id,
        nickname: payload.opponent.nickname,
        avatarUrl: payload.opponent.avatarUrl,
      });

      setOpponentStatus("connected");

      // Set stats from payload
      setMyStats(payload.playerStats);
      setOpponentStats(payload.opponentStats);
      setLoadingStats(false);

      setUiPhase("inMatch");
    });

    socket.on("game.state", (snapshot) => (snapshotRef.current = snapshot));

    socket.on("game.over", (payload) => {
      snapshotRef.current = {
        ...(snapshotRef.current as GameSnapshot),
        phase: "gameover",
        winner: payload.winnerSide,
      };

      // Use ref to get current side (avoids stale closure)
      const currentSide = sideRef.current;
      const isWinner = payload.winnerSide === currentSide;
      const myScore =
        currentSide === "left" ? payload.leftScore : payload.rightScore;
      const opponentScore =
        currentSide === "left" ? payload.rightScore : payload.leftScore;

      console.log("[game.over] payload:", payload);
      console.log(
        "[game.over] currentSide:",
        currentSide,
        "winnerSide:",
        payload.winnerSide,
        "isWinner:",
        isWinner,
      );

      setGameOverData({
        isWinner,
        myScore,
        opponentScore,
        winReason: payload.reason as WinReason,
      });
      setShowGameOverPopup(true);
      setUiPhase("gameover");
      if (soundOnRef.current) beepSound(true, 659, 0.15, 0.4);
    });

    socket.on("opponent.disconnected", () => {
      setOpponentStatus("disconnected");
      if (uiPhaseRef.current !== "gameover") {
        // If opponent disconnected mid-game, show as a win
        const snap = snapshotRef.current;
        const currentSide = sideRef.current;
        setGameOverData({
          isWinner: true,
          myScore: snap
            ? currentSide === "left"
              ? snap.left.score
              : snap.right.score
            : 0,
          opponentScore: snap
            ? currentSide === "left"
              ? snap.right.score
              : snap.left.score
            : 0,
          winReason: "disconnect",
        });
        setShowGameOverPopup(true);
        setUiPhase("opponentLeft");
      }
    });

    socket.on("opponent.connectionLost", () => {
      setOpponentStatus("disconnected");
    });

    socket.on("opponent.reconnected", () => {
      setOpponentStatus("connected");
    });

    socket.on("match.reconnected", (payload) => {
      console.log("[match.reconnected]", payload);

      setSide(payload.side);
      sideRef.current = payload.side;

      snapshotRef.current = payload.snapshot;

      setMyProfile({
        id: payload.player.id,
        nickname: payload.player.nickname,
        avatarUrl: payload.player.avatarUrl,
      });

      setOpponent({
        id: payload.opponent.id,
        nickname: payload.opponent.nickname,
        avatarUrl: payload.opponent.avatarUrl,
      });

      setMyStats(payload.playerStats);
      setOpponentStats(payload.opponentStats);
      setLoadingStats(false);

      setOpponentStatus("connected");
      setUiPhase("inMatch");
    });

    socket.on("opponent.left", () => {
      setOpponentStatus("disconnected");
      if (uiPhaseRef.current !== "gameover") {
        const snap = snapshotRef.current;
        const currentSide = sideRef.current;
        setGameOverData({
          isWinner: true,
          myScore: snap
            ? currentSide === "left"
              ? snap.left.score
              : snap.right.score
            : 0,
          opponentScore: snap
            ? currentSide === "left"
              ? snap.right.score
              : snap.left.score
            : 0,
          winReason: "disconnect",
        });
        setShowGameOverPopup(true);
        setUiPhase("opponentLeft");
      }
    });

    socket.on("match.cancelled", () => {
      console.log("[pong] match cancelled");
      snapshotRef.current = null;
      setUiPhase("searching");
      setOpponent(UNKNOWN_PLAYER);
      setSide(null);
      setMyStats(undefined);
      setOpponentStats(undefined);
      setLoadingStats(true);
    });

    socket.on("match.surrendered", (payload) => {
      console.log("[pong] you surrendered", payload);
      // You surrendered - show game over as loss
      const snap = snapshotRef.current;
      const currentSide = sideRef.current;
      setGameOverData({
        isWinner: false,
        myScore: snap
          ? currentSide === "left"
            ? snap.left.score
            : snap.right.score
          : 0,
        opponentScore: snap
          ? currentSide === "left"
            ? snap.right.score
            : snap.left.score
          : 0,
        winReason: "surrender",
      });
      setShowGameOverPopup(true);
      setUiPhase("gameover");
    });

    socket.on("opponent.surrendered", () => {
      console.log("[pong] opponent surrendered");
      setOpponentStatus("disconnected");
      // Opponent surrendered - show game over as win
      const snap = snapshotRef.current;
      const currentSide = sideRef.current;
      setGameOverData({
        isWinner: true,
        myScore: snap
          ? currentSide === "left"
            ? snap.left.score
            : snap.right.score
          : 0,
        opponentScore: snap
          ? currentSide === "left"
            ? snap.right.score
            : snap.left.score
          : 0,
        winReason: "surrender",
      });
      setShowGameOverPopup(true);
      setUiPhase("gameover");
    });

    socket.on("connect_error", (err) => {
      console.error("[pong] connection error:", err.message);
      setConnectionError(err.message);
      setMyStatus("disconnected");
      setUiPhase("error");
    });

    socket.on("match.error", (payload) => {
      console.error("[pong] server error:", payload.message);
      setConnectionError(payload.message);
      setUiPhase("error");
    });

    return () => {
      socket.emit("match.leave");
      socket.disconnect();
      if (animationRef.current !== null)
        cancelAnimationFrame(animationRef.current);
    };
  }, [token]);

  // --- Key handling  ---
  useEffect(() => {
    const isUpKey = (k: string) => k === "ArrowUp" || k === "w" || k === "W";
    const isDownKey = (k: string) =>
      k === "ArrowDown" || k === "s" || k === "S";

    function emitInput() {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit("input.update", {
        up: keysRef.current.up,
        down: keysRef.current.down,
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isUpKey(e.key) && !isDownKey(e.key)) return;

      e.preventDefault();

      if (isUpKey(e.key)) keysRef.current.up = true;
      if (isDownKey(e.key)) keysRef.current.down = true;

      emitInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isUpKey(e.key) && !isDownKey(e.key)) return;

      e.preventDefault();

      if (isUpKey(e.key)) keysRef.current.up = false;
      if (isDownKey(e.key)) keysRef.current.down = false;

      emitInput();
    };

    document.addEventListener("keydown", handleKeyDown, { passive: false });
    document.addEventListener("keyup", handleKeyUp, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Rendering loop --- //
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const phase = uiPhaseRef.current;
      const connectionError = connectionErrorRef.current;
      const side = sideRef.current;
      const openentNickname = opponentNicknameRef.current;

      const snap = snapshotRef.current;
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (phase === "error") {
        ctx.fillStyle = "#f38ba8";
        ctx.font = "28px monospace";
        const msg = connectionError || "Connection error.";
        const w = ctx.measureText(msg).width;
        ctx.fillText(msg, (canvas.width - w) / 2, canvas.height / 2);
        return;
      }

      if (!snap) {
        // no state yet
        ctx.fillStyle = "#cdd6f4";
        ctx.font = "28px monospace";
        const msg =
          phase === "searching"
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
        0,
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
        60,
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
          centered(`vs ${openentNickname}`, canvas.height / 2 + 100, 24);
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
  }, []);

  // Handler for finding a new match
  const handleFindMatch = () => {
    setShowGameOverPopup(false);
    setGameOverData(null);
    snapshotRef.current = null;
    setUiPhase("searching");
    setOpponent(UNKNOWN_PLAYER);
    setSide(null);

    //Reset stats
    setMyStats(undefined);
    setOpponentStats(undefined);
    setLoadingStats(true);
    // Reconnect and join matchmaking again
    const socket = socketRef.current;
    if (socket) {
      socket.emit("match.join");
    }
  };

  // Handler for leaving to games page
  const handleLeave = () => {
    setShowGameOverPopup(false);
    navigate("/games");
  };

  // --- UI --- //
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      {/* Top bar with controls */}
      <div className="flex items-center justify-end px-4 py-2 mb-4">
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="bg-gray-800/80 hover:bg-gray-700 text-white p-2.5 rounded-lg transition-all border border-gray-700/50"
            title={soundOn ? "Mute" : "Unmute"}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {onReturn && (
            <button
              onClick={() => {
                const socket = socketRef.current;
                if (socket && uiPhase === "inMatch") {
                  socket.emit("match.surrender");
                } else if (socket) {
                  socket.emit("match.leave");
                }
                onReturn();
              }}
              className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all border border-red-500/50"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Main game area with HUD */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <OnlinePongHUD
          mySide={side}
          showPlayers={!!side}
          leftPlayer={leftPlayer}
          rightPlayer={rightPlayer}
          leftStatus={leftStatus}
          rightStatus={rightStatus}
          leftStats={leftStats}
          rightStats={rightStats}
          loadingLeft={loadingStats}
          loadingRight={loadingStats}
        >
          {/* CANVAS */}
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="border-4 border-gray-700 rounded-lg shadow-2xl"
            style={{ imageRendering: "pixelated" }}
          />

          {/* Searching overlay (on top of canvas) */}
          {!side && (
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-3 text-gray-400 bg-black/30 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                <span>Waiting for an opponent to join...</span>
              </div>
            </div>
          )}
        </OnlinePongHUD>
      </div>

      {/* Game Over Popup */}
      {side && gameOverData && (
        <GameOverPopup
          isOpen={showGameOverPopup}
          isWinner={gameOverData.isWinner}
          myScore={gameOverData.myScore}
          opponentScore={gameOverData.opponentScore}
          myNickname={myPlayer?.nickname ?? "You"}
          opponentNickname={opponent.nickname}
          mySide={side}
          winReason={gameOverData.winReason}
          onFindMatch={handleFindMatch}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
};

export default OnlinePong;
