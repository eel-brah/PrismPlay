import React, { useState } from "react";
import { Shuffle, Palette } from "lucide-react";
import type { PlayerProfile } from "@/game/pong/models";
import { PADDLE_COLORS } from "@/game/pong/visuals";
import { avatarOptions, generateRandomSeed, getAvatarUrl } from "../pongUtils";

export default function PlayerSetupCard({
  side,
  player,
  setPlayer,
}: {
  side: "left" | "right";
  player: PlayerProfile;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerProfile>>;
}) {
  const [showAvatars, setShowAvatars] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const isLeft = side === "left";
  const borderClass = isLeft ? "border-purple-500/30" : "border-pink-500/30";
  const badgeClass = isLeft ? "text-purple-400" : "text-pink-400";
  const avatarBg = isLeft
    ? "from-purple-500 to-blue-500"
    : "from-pink-500 to-purple-500";
  const shuffleBg = isLeft
    ? "bg-purple-600 hover:bg-purple-700"
    : "bg-pink-600 hover:bg-pink-700";
  const focusBorder = isLeft ? "focus:border-purple-500" : "focus:border-pink-500";
  const ringClass = isLeft ? "ring-purple-500" : "ring-pink-500";

  return (
    <div className={`w-80 bg-gray-800/60 backdrop-blur-sm rounded-xl border ${borderClass} p-6`}>
      <div className="text-center mb-4">
        <span className={`${badgeClass} font-bold text-lg`}>
          {isLeft ? "LEFT PLAYER" : "RIGHT PLAYER"}
        </span>
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative">
          <img
            src={getAvatarUrl(player.avatar)}
            alt={`${side} player avatar`}
            className={`w-32 h-32 rounded-lg bg-gradient-to-br ${avatarBg} p-1 cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => setShowAvatars(!showAvatars)}
          />
          <button
            onClick={() => setPlayer({ ...player, avatar: generateRandomSeed() })}
            className={`absolute -bottom-2 -right-2 ${shuffleBg} text-white p-2 rounded-full transition-all shadow-lg`}
            title="Random avatar"
          >
            <Shuffle size={16} />
          </button>
        </div>
      </div>

      {showAvatars && (
        <div className="mb-4 bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-300 text-xs mb-2 text-center">Choose an avatar:</p>
          <div className="grid grid-cols-4 gap-2">
            {avatarOptions.map((seed) => (
              <img
                key={seed}
                src={getAvatarUrl(seed)}
                alt={seed}
                className={`w-14 h-14 rounded-lg cursor-pointer transition-all ${
                  player.avatar === seed
                    ? `ring-2 ${ringClass} scale-105`
                    : "hover:scale-110 opacity-70 hover:opacity-100"
                }`}
                onClick={() => {
                  setPlayer({ ...player, avatar: seed });
                  setShowAvatars(false);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-2">Player Name</label>
          <input
            type="text"
            value={player.name}
            onChange={(e) => setPlayer({ ...player, name: e.target.value })}
            maxLength={15}
            className={`w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none ${focusBorder}`}
            placeholder="Enter name..."
          />
        </div>

        <div className="relative">
          <label className="block text-gray-300 text-sm mb-2">Paddle Color</label>
          <button
            onClick={() => setShowColors(!showColors)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: player.paddleColor }} />
              <span className="text-gray-300">
                {PADDLE_COLORS.find((c) => c.value === player.paddleColor)?.name || "Custom"}
              </span>
            </div>
            <Palette size={16} className="text-gray-400" />
          </button>

          {showColors && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg p-3 shadow-xl z-10">
              <div className="grid grid-cols-5 gap-2">
                {PADDLE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setPlayer({ ...player, paddleColor: color.value });
                      setShowColors(false);
                    }}
                    className={`w-8 h-8 rounded transition-all ${
                      player.paddleColor === color.value
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

        <div className="bg-gray-700/30 rounded-lg p-3 text-sm text-gray-300">
          <p className="font-semibold mb-1">Controls:</p>
          {isLeft ? (
            <>
              <p>W - Move Up</p>
              <p>S - Move Down</p>
            </>
          ) : (
            <>
              <p>↑ - Move Up</p>
              <p>↓ - Move Down</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
