import React from "react";
import type { Side } from "../../shared/pong/gameTypes";

export type Status = "connected" | "disconnected";

export type OnlinePlayerLite = {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
};

export type OnlinePongStats = {
  wins: number;
  losses: number;
  winrate: number;
};

interface PlayerStackProps {
  side: Side;
  displayName: string;
  avatarUrl?: string | null;
  status: Status;
  stats?: OnlinePongStats;
  loading?: boolean;
  controls?: React.ReactNode;
  isMe?: boolean;
}

function PlayerStack({
  side,
  displayName,
  avatarUrl,
  status,
  stats,
  loading,
  controls,
  isMe,
}: PlayerStackProps) {
  const isLeft = side === "left";

  const avatarBg = isLeft
    ? "from-purple-500 to-blue-500 shadow-purple-500/30"
    : "from-pink-500 to-purple-500 shadow-pink-500/30";
  const nameColor = isLeft ? "text-purple-400" : "text-pink-400";
  const sideLabelColor = isLeft ? "text-blue-400" : "text-pink-400";
  const sideLabel = isLeft ? "LEFT" : "RIGHT";
  const statusColor = status === "connected" ? "bg-green-500" : "bg-red-500";
  const statusText = status === "connected" ? "Online" : "Disconnected";

  return (
    <div className="flex flex-col items-center gap-3 w-[120px] shrink-0">
      {/* Side indicator */}
      <div
        className={`${sideLabelColor} text-xs font-bold tracking-widest uppercase bg-gray-800/60 px-3 py-1 rounded-full border border-gray-700/50`}
      >
        {sideLabel}
      </div>

      {/* Avatar */}
      <div className="relative">
        <img
          src={avatarUrl ?? "/default-avatar.png"}
          alt={displayName}
          className={`w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br ${avatarBg} p-0.5 shadow-lg object-cover`}
        />
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} rounded-full border-2 border-gray-900`}
        />
      </div>

      {/* Name + (You) badge */}
      <div className="flex flex-col items-center gap-1">
        <span className={`font-semibold text-sm truncate max-w-[100px] ${nameColor}`}>
          {displayName}
        </span>
        {isMe && (
          <span className="text-[10px] bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded-full">
            You
          </span>
        )}
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className={`w-2 h-2 ${statusColor} rounded-full`} />
        <span>{statusText}</span>
      </div>

      {/* Stats box (W/L + Winrate) */}
      <div className="w-full text-xs bg-gray-800/50 rounded-lg px-3 py-2 text-gray-300 border border-gray-700/40">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : stats ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">W/L</span>
              <span className="font-semibold text-white">
                {stats.wins}-{stats.losses}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-400">Win%</span>
              <span className={`font-semibold ${stats.winrate >= 50 ? "text-green-400" : "text-red-400"}`}>
                {stats.winrate}%
              </span>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">No stats</div>
        )}
      </div>

      {/* Optional controls */}
      {controls && <div className="w-full">{controls}</div>}
    </div>
  );
}

interface OnlinePongHUDProps {
  mySide: Side;
  leftPlayer: OnlinePlayerLite;
  rightPlayer: OnlinePlayerLite;
  leftStatus: Status;
  rightStatus: Status;
  leftStats?: OnlinePongStats;
  rightStats?: OnlinePongStats;
  loadingLeft?: boolean;
  loadingRight?: boolean;
  children: React.ReactNode;
}

export function OnlinePongHUD({
  mySide,
  leftPlayer,
  rightPlayer,
  leftStatus,
  rightStatus,
  leftStats,
  rightStats,
  loadingLeft = false,
  loadingRight = false,
  children,
}: OnlinePongHUDProps) {
  return (
    <div className="flex items-center justify-center gap-4 md:gap-8 p-4">
      {/* Left Player Stack */}
      <PlayerStack
        side="left"
        displayName={leftPlayer.nickname}
        avatarUrl={leftPlayer.avatarUrl}
        status={leftStatus}
        stats={leftStats}
        loading={loadingLeft}
        isMe={mySide === "left"}
      />

      {/* Center: Game Canvas only (no score) */}
      <div className="relative">
        {children}
      </div>

      {/* Right Player Stack */}
      <PlayerStack
        side="right"
        displayName={rightPlayer.nickname}
        avatarUrl={rightPlayer.avatarUrl}
        status={rightStatus}
        stats={rightStats}
        loading={loadingRight}
        isMe={mySide === "right"}
      />
    </div>
  );
}

export default OnlinePongHUD;