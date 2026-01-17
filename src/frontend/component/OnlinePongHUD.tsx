import React from "react";

export type Side = "left" | "right";
export type Status = "connected" | "disconnected";

export type OnlinePlayerLite = {
  id: number;
  nickname: string;
  avatarUrl?: string | null;
};

export type OnlinePongStats = {
  wins: number;
  losses: number;
  winRate: number; // 0..1
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function StatusPill({ side, status }: { side: Side; status: Status }) {
  const isLeft = side === "left";
  const dotCls = status === "disconnected" ? "bg-gray-500" : "bg-green-500";
  const text = status === "disconnected" ? "Disconnected" : "Connected";

  const pillBg = isLeft
    ? "bg-blue-600/20 border-blue-500/30"
    : "bg-pink-600/20 border-pink-500/30";

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border ${pillBg} text-[11px] text-gray-200/90`}
      title={text}
    >
      <span className={`w-2 h-2 rounded-full ${dotCls}`} />
      <span className="uppercase tracking-wider">{text}</span>
    </div>
  );
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
}: {
  side: Side;
  displayName: string;
  avatarUrl?: string | null;
  status: Status;
  stats?: OnlinePongStats;
  loading?: boolean;
  controls?: React.ReactNode;
  isMe?: boolean;
}) {
  const isLeft = side === "left";

  const avatarBg = isLeft
    ? "from-purple-500 to-blue-500 shadow-purple-500/30"
    : "from-pink-500 to-purple-500 shadow-pink-500/30";

  const nameColor = isLeft ? "text-purple-400" : "text-pink-400";
  const sideBadge = isLeft ? "bg-blue-600" : "bg-pink-600";
  const sideLabel = isLeft ? "LEFT" : "RIGHT";
  const sideLabelColor = isLeft ? "text-blue-400" : "text-pink-400";

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

        {/* Side badge */}
        <div
          className={`absolute -top-2 -left-2 ${sideBadge} text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold`}
          title={isLeft ? "Left" : "Right"}
        >
          {isLeft ? "L" : "R"}
        </div>

        {/* Me badge */}
        {isMe && (
          <div className="absolute -bottom-2 -left-2 bg-gray-900/90 border border-gray-700/60 text-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            YOU
          </div>
        )}
      </div>

      {/* Name + status */}
      <div className="text-center">
        <p className={`${nameColor} font-bold text-sm truncate max-w-[110px]`}>
          {displayName}
        </p>
        <div className="mt-2">
          <StatusPill side={side} status={status} />
        </div>
      </div>

      {/* Stats box (W/L + %) */}
      <div className="w-full text-xs bg-gray-800/50 rounded-lg px-3 py-2 text-gray-300 border border-gray-700/40">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">W/L</span>
          <span className="font-semibold">
            {loading ? "…" : stats ? `${stats.wins}-${stats.losses}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-gray-400">%</span>
          <span className="font-semibold">
            {loading ? "…" : stats ? pct(stats.winRate) : "—"}
          </span>
        </div>
      </div>

      {/* Controls box (tall) */}
      {controls && (
        <div className="w-full bg-gray-800/50 rounded-lg px-3 py-3 text-gray-300 border border-gray-700/40">
          <div className="text-center text-gray-400 text-[10px] uppercase tracking-wider">
            Controls
          </div>
          <div className="mt-2 flex flex-col items-center gap-1 text-xs font-semibold">
            {controls}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * OnlinePongHUD
 * Layout: left stack + center (children) + right stack
 * - Shows (W/L + %) stats and status
 * - Controls shown only for the local player side by default
 */
export function OnlinePongHUD({
  mySide,
  leftPlayer,
  rightPlayer,
  leftStatus,
  rightStatus,
  leftStats,
  rightStats,
  loadingLeft,
  loadingRight,
  showYouControls = true,
  children,
}: {
  mySide: Side;
  leftPlayer: OnlinePlayerLite;
  rightPlayer: OnlinePlayerLite;

  leftStatus: Status;
  rightStatus: Status;

  leftStats?: OnlinePongStats;
  rightStats?: OnlinePongStats;

  loadingLeft?: boolean;
  loadingRight?: boolean;

  showYouControls?: boolean;

  /** Put your real <canvas /> here */
  children: React.ReactNode;
}) {
  // Controls mimic your sketch: stacked keys.
  const leftControls =
    showYouControls && mySide === "left" ? (
      <>
        <span className="px-2 py-1 rounded-md bg-gray-900/60 border border-gray-700/60 w-full text-center">
          W
        </span>
        <span className="px-2 py-1 rounded-md bg-gray-900/60 border border-gray-700/60 w-full text-center">
          S
        </span>
      </>
    ) : undefined;

  const rightControls =
    showYouControls && mySide === "right" ? (
      <>
        <span className="px-2 py-1 rounded-md bg-gray-900/60 border border-gray-700/60 w-full text-center">
          ↑
        </span>
        <span className="px-2 py-1 rounded-md bg-gray-900/60 border border-gray-700/60 w-full text-center">
          ↓
        </span>
      </>
    ) : undefined;

  return (
    <div className="inline-flex items-center justify-center gap-5">
      {/* Left stack */}
      <PlayerStack
        side="left"
        displayName={leftPlayer.nickname}
        avatarUrl={leftPlayer.avatarUrl}
        status={leftStatus}
        stats={leftStats}
        loading={loadingLeft}
        controls={leftControls}
        isMe={mySide === "left"}
      />

      {/* Center (your real canvas) */}
      <div className="flex items-center justify-center">{children}</div>

      {/* Right stack */}
      <PlayerStack
        side="right"
        displayName={rightPlayer.nickname}
        avatarUrl={rightPlayer.avatarUrl}
        status={rightStatus}
        stats={rightStats}
        loading={loadingRight}
        controls={rightControls}
        isMe={mySide === "right"}
      />
    </div>
  );
}