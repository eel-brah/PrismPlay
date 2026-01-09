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
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
        >
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button
          onClick={onReturnToMenu}
          className="bg-gray-800/80 hover:bg-gray-800 text-white p-3 rounded-lg transition-all"
        >
          Return
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-[1200px]">
        <PlayerDashboard
          side="left"
          player={leftPlayer}
          isAIForThisSide={leftIsAI}
          displayName={leftIsAI ? "AI Bot" : leftPlayer.name}
          controls={
            <div className="flex gap-1">
              <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
                W
              </kbd>
              <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
                S
              </kbd>
            </div>
          }
        />

        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="w-full max-w-[810px] aspect-[810/600]">
            <canvas
              ref={canvasRef}
              width={810}
              height={600}
              className="w-full h-full border-4 border-gray-700 rounded-lg shadow-2xl"
              style={{ imageRendering: "auto" }}
            />
          </div>
        </div>

        <PlayerDashboard
          side="right"
          player={rightPlayer}
          isAIForThisSide={rightIsAI}
          displayName={rightIsAI ? "AI Bot" : rightPlayer.name}
          controls={
            <div className="flex gap-1">
              <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
                ↑
              </kbd>
              <kbd className="bg-gray-700 px-2 py-0.5 rounded text-[10px]">
                ↓
              </kbd>
            </div>
          }
        />
      </div>
    </div>
  );
}
