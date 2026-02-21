import React from "react";
import type { Side } from "../../../../shared/pong/gameTypes";

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
  side: Side | null;
  showPlayer: boolean;
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
  const borderColor = isLeft ? "border-purple-500/30" : "border-pink-500/30";
  const headerBg = isLeft ? "bg-purple-900/20" : "bg-pink-900/20";
  const sideLabel = isLeft ? "LEFT" : "RIGHT";
  const statusColor = status === "connected" ? "bg-green-500" : "bg-red-500";
  const statusText = status === "connected" ? "Online" : "Disconnected";

  return (
    <div
      className={`w-full max-w-[280px] md:w-[160px] md:max-w-none bg-gray-900/80 backdrop-blur-sm rounded-lg border-2 ${borderColor} overflow-hidden shrink-0 flex md:block items-center md:items-stretch`}
    >
      {/* Header with side indicator */}
      <div
        className={`${headerBg} ${sideLabelColor} text-[10px] md:text-xs font-bold tracking-widest uppercase px-2 md:px-4 py-1.5 md:py-2 text-center border-r md:border-r-0 md:border-b ${borderColor} w-16 md:w-auto flex items-center justify-center shrink-0 h-full md:h-auto`}
      >
        <span className="md:inline hidden">{sideLabel} PLAYER</span>
        <span className="md:hidden inline">{sideLabel[0]}</span>
      </div>

      {/* Player Info Section */}
      <div className="flex-1 p-2 md:p-4 flex md:block items-center gap-3 md:gap-0 min-w-0">
        {/* Avatar */}
        <div className="flex justify-center shrink-0">
          <div className="relative">
            <img
              src={avatarUrl ?? "/default.png"}
              alt={displayName}
              className={`w-10 h-10 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-gradient-to-br ${avatarBg} p-0.5 shadow-lg object-cover`}
            />
          </div>
        </div>

        {/* Name + (You) badge */}
        <div className="flex-1 md:text-center space-y-0.5 md:space-y-1 min-w-0 md:mt-3">
          <div className={`font-semibold text-xs md:text-sm truncate ${nameColor}`}>
            {displayName}
          </div>
          {isMe && (
            <span className="inline-block text-[10px] md:text-xs bg-gray-700/60 text-gray-300 px-1.5 md:px-2 py-0.5 rounded-full">
              You
            </span>
          )}
          {/* Mobile Status */}
          <div className="md:hidden flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-1.5 h-1.5 ${statusColor} rounded-full`} />
            <span>{statusText}</span>
          </div>
        </div>

        {/* Desktop Connection status */}
        <div className="hidden md:flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-3 border-b border-gray-700/50 mt-3 mb-3">
          <span className={`w-2 h-2 ${statusColor} rounded-full`} />
          <span>{statusText}</span>
        </div>

        {/* Stats Table */}
        <div className="hidden md:block bg-gray-800/50 rounded-lg border border-gray-700/40 overflow-hidden">
          <div className="px-3 py-1.5 bg-gray-800/80 border-b border-gray-700/40">
            <div className="text-xs font-semibold text-gray-400 text-center">
              STATISTICS
            </div>
          </div>
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-gray-500">
              Loading...
            </div>
          ) : stats ? (
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Wins</span>
                <span className="font-semibold text-green-400">
                  {stats.wins}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Losses</span>
                <span className="font-semibold text-red-400">
                  {stats.losses}
                </span>
              </div>
              <div className="pt-1 border-t border-gray-700/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Win Rate</span>
                  <span
                    className={`font-bold ${stats.winrate >= 50 ? "text-green-400" : "text-red-400"}`}
                  >
                    {stats.winrate}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-xs text-gray-500">
              No stats
            </div>
          )}
        </div>

        {/* Optional controls */}
        {controls && <div className="pt-2 md:pt-2">{controls}</div>}
      </div>
    </div>
  );
}

interface OnlinePongHUDProps {
  mySide: Side | null;
  showPlayers?: boolean;
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
  showPlayers = true,
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
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-[1200px] p-4">
      {/* Left */}
      {showPlayers ? (
        <PlayerStack
          side="left"
          showPlayer={showPlayers}
          displayName={leftPlayer.nickname}
          avatarUrl={leftPlayer.avatarUrl}
          status={leftStatus}
          stats={leftStats}
          loading={loadingLeft}
          isMe={mySide === "left"}
        />
      ) : (
        <div className="w-[160px] shrink-0 hidden md:block" />
      )}

      {/* Center */}
      <div className="flex-1 min-w-0 flex items-center justify-center w-full">
        {children}
      </div>

      {/* Right */}
      {showPlayers ? (
        <PlayerStack
          side="right"
          showPlayer={showPlayers}
          displayName={rightPlayer.nickname}
          avatarUrl={rightPlayer.avatarUrl}
          status={rightStatus}
          stats={rightStats}
          loading={loadingRight}
          isMe={mySide === "right"}
        />
      ) : (
        <div className="w-[160px] shrink-0 hidden md:block" />
      )}
    </div>
  );
}

export default OnlinePongHUD;
