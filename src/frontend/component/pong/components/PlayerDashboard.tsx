import React from "react";
import type { PlayerProfile } from "@/game/pong/models";
import { getAvatarUrl } from "../pongUtils";

export default function PlayerDashboard({
  side,
  player,
  isAIForThisSide,
  displayName,
  controls,
}: {
  side: "left" | "right";
  player: PlayerProfile;
  isAIForThisSide: boolean;
  displayName: string;
  controls: React.ReactNode;
}) {
  const isLeft = side === "left";

  const avatarBg = isLeft
    ? "from-purple-500 to-blue-500 shadow-purple-500/30"
    : "from-pink-500 to-purple-500 shadow-pink-500/30";

  const nameColor = isLeft ? "text-purple-400" : "text-pink-400";
  const aiBadge = isLeft ? "bg-blue-600" : "bg-pink-600";

  return (
    <div className="flex flex-col items-center gap-3 w-[90px] sm:w-[110px] md:w-[120px] shrink-0">
      <div className="relative">
        <img
          src={getAvatarUrl(player.avatar)}
          alt={displayName}
          className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br ${avatarBg} p-0.5 shadow-lg`}
        />
        {isAIForThisSide && (
          <div className={`absolute -top-2 -right-2 ${aiBadge} text-white text-xs px-2 py-0.5 rounded-full font-bold`}>
            AI
          </div>
        )}
      </div>

      <div className="text-center">
        <p className={`${nameColor} font-bold text-xs sm:text-sm truncate max-w-[90px] sm:max-w-[100px]`}>{displayName}</p>
        <p className="text-gray-500 text-xs uppercase tracking-wider">
          {isLeft ? "Left" : "Right"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-1 text-gray-400 text-xs bg-gray-800/50 rounded-lg px-3 py-2">
        <span className="font-semibold text-gray-300">Controls</span>
        {controls}
      </div>
    </div>
  );
}
