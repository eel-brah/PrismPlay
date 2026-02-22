import React, { useState } from "react";
import { Palette } from "lucide-react";
import type { AiPos } from "@/game/pong/types";
import type { GameColors, PlayerProfile } from "@/game/pong/models";
import { BALL_COLORS, THEMES } from "@/game/pong/visuals";
import PlayerSetupCard from "../components/PlayerSetupCard";
import { useEffect } from "react";

export default function SetupScreen({
  isSingle,
  aiPos,
  leftPlayer,
  setLeftPlayer,
  rightPlayer,
  setRightPlayer,
  gameColors,
  setGameColors,
  onBack,
  onStart,
}: {
  isSingle: boolean;
  aiPos: AiPos;

  leftPlayer: PlayerProfile;
  setLeftPlayer: React.Dispatch<React.SetStateAction<PlayerProfile>>;
  rightPlayer: PlayerProfile;
  setRightPlayer: React.Dispatch<React.SetStateAction<PlayerProfile>>;

  gameColors: GameColors;
  setGameColors: React.Dispatch<React.SetStateAction<GameColors>>;

  onBack: () => void;
  onStart: () => void;
}) {
  const [showBallColors, setShowBallColors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leftNameValid = leftPlayer?.name?.trim().length > 0;
  const rightNameValid = rightPlayer?.name?.trim().length > 0;
  const canStart =
    (!isSingle && leftNameValid && rightNameValid) ||
    (isSingle &&
      ((aiPos === "right" && leftNameValid) ||
        (aiPos === "left" && rightNameValid)));

  useEffect(() => {
    if (!canStart) {
      setError("Please enter a name for each player.");
    } else {
      setError(null);
    }
  }, [leftPlayer.name, rightPlayer.name, canStart]);

  const handleStart = () => {
    if (!canStart) return;
    setError(null);
    onStart();
  };

  return (
    <div className="h-full min-h-0 w-full max-w-6xl mx-auto px-6 flex flex-col justify-center text-white">
      <div className="text-center mb-10">
        <div className="text-sm tracking-widest text-purple-300 mb-1">
          MATCH CONFIGURATION
        </div>

        <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Player Setup
        </h2>

        <p className="text-gray-400 mt-2 text-sm">
          Customize players and arena before starting
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-10 items-start">
        <div className="flex flex-wrap justify-center gap-6">
          {(!isSingle || aiPos === "right") && (
            <PlayerSetupCard
              side="left"
              player={leftPlayer}
              setPlayer={setLeftPlayer}
            />
          )}

          {(!isSingle || aiPos === "left") && (
            <PlayerSetupCard
              side="right"
              player={rightPlayer}
              setPlayer={setRightPlayer}
            />
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-xl p-5 space-y-6">
          <div>
            <div className="text-[11px] text-gray-500 mb-2 tracking-wide">
              MAP THEME
            </div>

            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((theme) => {
                const active = gameColors.theme === theme.id;

                return (
                  <button
                    key={theme.id}
                    onClick={() =>
                      setGameColors({ ...gameColors, theme: theme.id })
                    }
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-all
                      ${
                        active
                          ? "border-purple-400/60 bg-purple-500/15 text-white"
                          : "border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]"
                      }
                    `}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.centerLine }}
                    />
                    {theme.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-2 tracking-wide">
              BALL COLOR
            </div>

            <div className="relative">
              <button
                onClick={() => setShowBallColors(!showBallColors)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] text-gray-300 transition"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/30"
                    style={{ backgroundColor: gameColors.ballColor }}
                  />
                  Select Color
                </div>
                <Palette size={14} />
              </button>

              {showBallColors && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-white/10 bg-[#0f101f] backdrop-blur-xl p-3 shadow-2xl">
                  <div className="grid grid-cols-5 gap-2">
                    {BALL_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => {
                          setGameColors({
                            ...gameColors,
                            ballColor: color.value,
                          });
                          setShowBallColors(false);
                        }}
                        className={`w-7 h-7 rounded-full transition ${
                          gameColors.ballColor === color.value
                            ? "ring-2 ring-white scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            <button
              onClick={onBack}
              className="py-2 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-gray-300 hover:text-white transition"
            >
              ← Back
            </button>

            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`py-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-medium shadow-lg transition
                ${!canStart ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              Start Match
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
