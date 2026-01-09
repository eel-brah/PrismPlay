import React, { useState } from "react";
import { Palette } from "lucide-react";
import type { AiPos } from "@/game/pong/types";
import type { GameColors, PlayerProfile } from "@/game/pong/models";
import { BALL_COLORS, THEMES } from "@/game/pong/visuals";
import PlayerSetupCard from "../components/PlayerSetupCard";

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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 overflow-y-auto">
      <div className="max-w-4xl w-full py-8">
        <h2 className="text-4xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Setup Your Characters
        </h2>

        {/* Theme Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-300 text-center mb-3">
            Select Map Theme
          </h3>
          <div className="flex justify-center gap-3 flex-wrap">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() =>
                  setGameColors({ ...gameColors, theme: theme.id })
                }
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  gameColors.theme === theme.id
                    ? "border-purple-500 bg-purple-500/20 text-white"
                    : "border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.centerLine }}
                  />
                  {theme.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ball Color Selection */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <button
              onClick={() => setShowBallColors(!showBallColors)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 rounded-lg border border-gray-600 hover:border-gray-500 transition-all"
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white/30"
                style={{ backgroundColor: gameColors.ballColor }}
              />
              <span className="text-gray-300">Ball Color</span>
              <Palette size={16} className="text-gray-400" />
            </button>

            {showBallColors && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-800 rounded-lg p-3 shadow-xl z-10 min-w-[200px]">
                <div className="grid grid-cols-4 gap-2">
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
                      className={`w-8 h-8 rounded-full transition-all ${
                        gameColors.ballColor === color.value
                          ? "ring-2 ring-white scale-110"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6 justify-center">
          {/* Left Player Setup */}
          {(!isSingle || aiPos === "right") && (
            <PlayerSetupCard
              side="left"
              player={leftPlayer}
              setPlayer={setLeftPlayer}
            />
          )}

          {/* Right Player Setup */}
          {(!isSingle || aiPos === "left") && (
            <PlayerSetupCard
              side="right"
              player={rightPlayer}
              setPlayer={setRightPlayer}
            />
          )}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-all"
          >
            Back
          </button>
          <button
            onClick={onStart}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
