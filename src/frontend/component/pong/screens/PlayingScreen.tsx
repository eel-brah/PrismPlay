import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { AiPos } from "@/game/pong/types";
import type { PlayerProfile } from "@/game/pong/models";
import PlayerDashboard from "../components/PlayerDashboard";

export default function PlayingScreen({
  canvasRef,
  leftPlayer,
  rightPlayer,
  isAI,
  isSingle,
  aiPos,
  soundOn,
  setSoundOn,
  onReturnToMenu,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  leftPlayer: PlayerProfile;
  rightPlayer: PlayerProfile;

  isAI: boolean;
  isSingle: boolean;
  aiPos: AiPos;

  soundOn: boolean;
  setSoundOn: (v: boolean) => void;

  onReturnToMenu: () => void;
}) {
  const leftIsAI = isAI && (isSingle ? aiPos === "left" : true);
  const rightIsAI = isAI && (isSingle ? aiPos === "right" : true);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">

      <div className="absolute top-4 right-4 flex gap-2 z-50">

        <button
          onClick={() => setSoundOn(!soundOn)}
          className="
          p-3 rounded-lg
          bg-white/[0.05] hover:bg-white/[0.08]
          border border-white/10
          text-gray-200 hover:text-white
          transition-all
        "
        >
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        <button
          onClick={onReturnToMenu}
          className="
          px-4 py-3 rounded-lg
          bg-red-500/15 hover:bg-red-500/25
          border border-red-400/30
          text-red-300 hover:text-red-200
          transition-all
        "
        >
          Return
        </button>
      </div>

      <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-[1200px]">

        <PlayerDashboard
          side="left"
          player={leftPlayer}
          isAIForThisSide={leftIsAI}
          displayName={leftIsAI ? "AI Bot" : leftPlayer.name}
          controls={
            <div className="flex gap-1">
              <kbd className="bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[10px]">W</kbd>
              <kbd className="bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[10px]">S</kbd>
            </div>
          }
        />

        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="w-full max-w-[810px] aspect-[810/600]">

            <div className="
            relative rounded-xl p-[6px]
            bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-purple-500/30
          ">
              <div className="rounded-lg bg-black/70 backdrop-blur-sm">

                <canvas
                  ref={canvasRef}
                  width={810}
                  height={600}
                  className="w-full h-full rounded-lg shadow-[0_0_40px_rgba(120,80,255,0.25)]"
                  style={{ imageRendering: "auto" }}
                />

              </div>
            </div>

          </div>
        </div>

        <PlayerDashboard
          side="right"
          player={rightPlayer}
          isAIForThisSide={rightIsAI}
          displayName={rightIsAI ? "AI Bot" : rightPlayer.name}
          controls={
            <div className="flex gap-1">
              <kbd className="bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[10px]">↑</kbd>
              <kbd className="bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[10px]">↓</kbd>
            </div>
          }
        />

      </div>
    </div>
  );
}
