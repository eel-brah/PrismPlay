import { Volume2, VolumeX } from "lucide-react";
import type { AiPos, Difficulty } from "@/game/pong/types";
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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-white">

      <div className="text-center mb-8 sm:mb-10">
        <div className="text-xs sm:text-sm tracking-widest text-purple-300 mb-1">
          PONG ARENA
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Game Setup
        </h1>

        <p className="text-gray-400 mt-2 text-xs sm:text-sm">
          Choose how you want to play
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 sm:gap-8 items-start">

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

          <button
            onClick={() => startGame("single")}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 text-left hover:border-blue-400/40 hover:scale-[1.02] transition-all"
          >
            <div className="text-blue-300 text-base sm:text-lg font-semibold mb-1">
              Single Player
            </div>

            <div className="text-gray-400 text-xs sm:text-sm mb-4">
              Play against AI opponent
            </div>

            <ul className="text-xs text-gray-400 space-y-1 mb-6">
              <li>• Adjustable difficulty</li>
              <li>• Practice mode</li>
              <li>• Instant start</li>
            </ul>

            <div className="flex justify-end">
              <span className="px-4 py-1.5 text-xs rounded-md bg-blue-500/80 group-hover:bg-blue-500 transition">
                Start
              </span>
            </div>
          </button>

          <button
            onClick={() => startGame("two")}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 text-left hover:border-purple-400/40 hover:scale-[1.02] transition-all"
          >
            <div className="text-purple-300 text-base sm:text-lg font-semibold mb-1">
              Two Players
            </div>

            <div className="text-gray-400 text-xs sm:text-sm mb-4">
              Local multiplayer match
            </div>

            <ul className="text-xs text-gray-400 space-y-1 mb-6">
              <li>• Same keyboard</li>
              <li>• Competitive play</li>
              <li>• Instant rounds</li>
            </ul>

            <div className="flex justify-end">
              <span className="px-4 py-1.5 text-xs rounded-md bg-purple-500/80 group-hover:bg-purple-500 transition">
                Start
              </span>
            </div>
          </button>

          <button
            onClick={() => startGame("ai")}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 text-left hover:border-cyan-400/40 hover:scale-[1.02] transition-all"
          >
            <div className="text-cyan-300 text-base sm:text-lg font-semibold mb-1">
              AI vs AI
            </div>

            <div className="text-gray-400 text-xs sm:text-sm mb-4">
              Watch bots battle
            </div>

            <ul className="text-xs text-gray-400 space-y-1 mb-6">
              <li>• Spectator mode</li>
              <li>• Learn strategies</li>
              <li>• Relax & observe</li>
            </ul>

            <div className="flex justify-end">
              <span className="px-4 py-1.5 text-xs rounded-md bg-cyan-500/80 group-hover:bg-cyan-500 transition">
                Start
              </span>
            </div>
          </button>

          {onReturn && (
            <button
              onClick={onReturn}
              className="sm:col-span-2 lg:col-span-3 mt-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] py-3 text-gray-300 hover:text-white transition"
            >
              ← Return
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl p-4 space-y-4">

          <div>
            <div className="text-[11px] text-gray-500 mb-1.5 tracking-wide">
              AI SIDE
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(["left", "right"] as const).map((pos) => {
                const active = aiPos === pos;
                return (
                  <button
                    key={pos}
                    onClick={() => setAiPos(pos)}
                    className={`
                      py-1.5 rounded-md text-xs border transition-all
                      ${active
                        ? "border-blue-400/60 bg-blue-500/15 text-white"
                        : "border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"
                      }
                    `}
                  >
                    {pos.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1.5 tracking-wide">
              DIFFICULTY
            </div>
            <div className="scale-[0.95] origin-left">
              <DifficultySlider
                difficulty={difficulty}
                setDifficulty={setDifficulty}
              />
            </div>
          </div>

          <button
            onClick={() => setSoundOn(!soundOn)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] text-gray-400 hover:text-white transition-all text-xs"
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            Sound {soundOn ? "On" : "Off"}
          </button>

          <div className="pt-2 border-t border-white/10 text-[11px] text-gray-500 space-y-0.5 leading-relaxed">
            <div className="text-gray-300 font-medium mb-1">Controls</div>
            <div>Left: W / S</div>
            <div>Right: ↑ / ↓</div>
            <div>Pause: P • Start: SPACE</div>
          </div>

        </div>

      </div>
    </div>
  );
}
