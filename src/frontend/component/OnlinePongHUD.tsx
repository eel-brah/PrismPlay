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
      className={`w-[160px] bg-gray-900/80 backdrop-blur-sm rounded-lg border-2 ${borderColor} overflow-hidden shrink-0`}
    >
      {/* Header with side indicator */}
      <div
        className={`${headerBg} ${sideLabelColor} text-xs font-bold tracking-widest uppercase px-4 py-2 text-center border-b ${borderColor}`}
      >
        {sideLabel} PLAYER
      </div>

      {/* Player Info Section */}
      <div className="p-4 space-y-3">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={avatarUrl ?? "/default-avatar.png"}
              alt={displayName}
              className={`w-20 h-20 rounded-xl bg-gradient-to-br ${avatarBg} p-0.5 shadow-lg object-cover`}
            />
            {/* <span
              className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} rounded-full border-2 border-gray-900`}
            /> */}
          </div>
        </div>

        {/* Name + (You) badge */}
        <div className="text-center space-y-1">
          <div className={`font-semibold text-sm truncate ${nameColor}`}>
            {displayName}
          </div>
          {isMe && (
            <span className="inline-block text-xs bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded-full">
              You
            </span>
          )}
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-3 border-b border-gray-700/50">
          <span className={`w-2 h-2 ${statusColor} rounded-full`} />
          <span>{statusText}</span>
        </div>

        {/* Stats Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700/40 overflow-hidden">
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
        {controls && <div className="pt-2">{controls}</div>}
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

// export function OnlinePongHUD({
//   mySide,
//   leftPlayer,
//   rightPlayer,
//   leftStatus,
//   rightStatus,
//   leftStats,
//   rightStats,
//   loadingLeft = false,
//   loadingRight = false,
//   children,
// }: OnlinePongHUDProps) {
//   return (
//     <div className="flex items-center justify-center gap-4 md:gap-8 p-4">
//       {/* Left Player Stack */}
//       <PlayerStack
//         side="left"
//         displayName={leftPlayer.nickname}
//         avatarUrl={leftPlayer.avatarUrl}
//         status={leftStatus}
//         stats={leftStats}
//         loading={loadingLeft}
//         isMe={mySide === "left"}
//       />

//       {/* Center: Game Canvas only (no score) */}
//       <div className="relative">
//         {children}
//       </div>

//       {/* Right Player Stack */}
//       <PlayerStack
//         side="right"
//         displayName={rightPlayer.nickname}
//         avatarUrl={rightPlayer.avatarUrl}
//         status={rightStatus}
//         stats={rightStats}
//         loading={loadingRight}
//         isMe={mySide === "right"}
//       />
//     </div>
//   );
// }

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
    <div className="flex items-center justify-center gap-4 md:gap-8 p-4">
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
        <div className="w-[160px] shrink-0" />
      )}

      {/* Center */}
      <div className="relative">{children}</div>

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
        <div className="w-[160px] shrink-0" />
      )}
    </div>
  );
}

export default OnlinePongHUD;
