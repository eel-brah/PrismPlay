import React, { useMemo, useState } from "react";

type Tab = "profile" | "achievements" | "history";

interface PlayerProfileProps {
  onClose: () => void;
}

export default function PlayerProfile({ onClose }: PlayerProfileProps) {
  const [tab, setTab] = useState<Tab>("profile");

  const user = useMemo(
    () => ({
      username: "yyy",
      email: "yyy@example.com",
      level: 2,
      xp: 70,
      xpMax: 100,
      memberSince: new Date().toLocaleDateString(),
      wins: 21,
      losses: 17,
    }),
    [],
  );

  const winRate = Math.round((user.wins / Math.max(1, user.wins + user.losses)) * 100);
  const xpPct = Math.min(100, Math.round((user.xp / user.xpMax) * 100));

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-purple-900 to-gray-900 text-white">
      <div className="py-6 text-center">
        <div className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Player Profile</div>
        <div className="text-sm text-gray-300">Manage your account and view your progress</div>
      </div>

      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full bg-gray-800/70 border border-gray-700 overflow-hidden">
          {(["profile", "achievements", "history"] as Tab[]).map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm transition-colors ${tab === t ? "bg-gray-700 text-white" : "text-gray-300 hover:text-white"} ${i !== 0 ? "border-l border-gray-700" : ""}`}
            >
              {t === "history" ? "Game History" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/60">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 mb-3" />
                <div className="text-center font-semibold text-lg">{user.username}</div>
                <div className="text-center text-sm text-gray-300 mb-3">{user.email}</div>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-xs px-2 py-1 rounded bg-gray-800/90 border border-gray-700">Level {user.level}</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">Level Progress</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div style={{ width: `${xpPct}%` }} className="h-full bg-blue-500" />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{user.xp}/{user.xpMax} XP</span>
                  <span>Member since {user.memberSince}</span>
                </div>
                <button className="mt-4 w-full px-3 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 border border-gray-700">Edit Profile</button>
              </div>
              <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/60">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Games Played</div>
                    <div className="text-xl font-semibold">{user.wins + user.losses}</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Total Wins</div>
                    <div className="text-xl font-semibold">{user.wins}</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Win Rate</div>
                    <div className="text-xl font-semibold">{winRate}%</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Current Level</div>
                    <div className="text-xl font-semibold">{user.level}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/60">
                <div className="font-semibold mb-2">Profile Information</div>
                <div className="text-xs text-gray-400 mb-4">Your account information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md bg-gray-800/40 p-3">
                    <div className="text-xs text-gray-400 mb-1">Username</div>
                    <div className="text-gray-200">{user.username}</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-3">
                    <div className="text-xs text-gray-400 mb-1">Email</div>
                    <div className="text-gray-200">{user.email}</div>
                  </div>
                </div>
              </div>
              <div className="border border-gray-700 rounded-xl p-5 bg-gray-800/60">
                <div className="font-semibold mb-3">Performance Summary</div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-green-400 text-3xl font-bold">{user.wins}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 text-3xl font-bold">{user.losses}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 text-3xl font-bold">{winRate}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "achievements" && (
          <div className="max-w-6xl mx-auto border border-gray-700 rounded-xl p-6 bg-gray-800/60">No achievements yet</div>
        )}

        {tab === "history" && (
          <div className="max-w-6xl mx-auto space-y-2">
            {["Win vs AI", "Loss vs Player", "Win vs Player"].map((h, i) => (
              <div key={i} className="border border-gray-700 rounded-xl p-4 bg-gray-800/60">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{h}</div>
                  <div className="text-xs text-gray-400">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

