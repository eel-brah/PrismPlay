import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { AiPos, Difficulty } from "@/game/types";
import DifficultySlider from "./DifficultySlider";

export default function MenuScreen({
  onReturn,
  startGame,
  soundOn,
  setSoundOn,
  difficulty,
  setDifficulty,
  aiPos,
  setAiPos,
}: {
  onReturn?: () => void;
  startGame: (mode: "single" | "two" | "ai") => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  aiPos: AiPos;
  setAiPos: (p: AiPos) => void;
}) {
  return (
    <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl max-w-md w-full">
      <h1 className="text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        PinPon Game
      </h1>

      <div className="space-y-4 mb-6">
        <button
          onClick={() => startGame("single")}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
        >
          Single Player
        </button>
        <button
          onClick={() => startGame("two")}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
        >
          Two Players
        </button>
        <button
          onClick={() => startGame("ai")}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
        >
          AI vs AI
        </button>
        <button
          onClick={() => onReturn?.()}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg font-semibold transition-all shadow-lg"
        >
          Return
        </button>
      </div>

      <div className="border-t border-gray-700 pt-6 space-y-4">
        <div>
          <label className="block text-gray-300 mb-2 font-medium">
            AI Side (Single Player)
          </label>
          <div className="flex gap-2">
            {(["left", "right"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setAiPos(pos)}
                className={`flex-1 py-2 rounded-lg border transition-colors ${
                  aiPos === pos
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
  );
}
