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
    <div className="h-full w-full flex flex-col bg-gray-900/95 text-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Player Profile</h2>
          <p className="text-xs text-gray-400">Manage your account and view progress</p>
        </div>
        <button onClick={onClose} className="px-3 py-1 rounded-md bg-gray-800/80 hover:bg-gray-800 transition-colors">Close</button>
      </div>

      <div className="flex gap-2 p-3 border-b border-gray-700">
        {(["profile", "achievements", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-md transition-colors ${tab === t ? "bg-blue-600 text-white" : "bg-gray-800/80 text-gray-300 hover:bg-gray-800"}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/40">
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 mb-3" />
              <div className="text-center font-medium">{user.username}</div>
              <div className="text-center text-sm text-gray-400 mb-3">{user.email}</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800/80">Level {user.level}</span>
              </div>
              <div className="text-xs text-gray-400 mb-1">Level Progress</div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div style={{ width: `${xpPct}%` }} className="h-full bg-blue-500" />
              </div>
              <div className="text-xs text-gray-400 mt-2">Member since: {user.memberSince}</div>
              <button className="mt-4 w-full px-3 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800">Edit Profile</button>
              <div className="mt-4 border-t border-gray-700 pt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-gray-800/40 p-3">
                  <div className="text-xs text-gray-400">Games Played</div>
                  <div className="text-lg font-semibold">{user.wins + user.losses}</div>
                </div>
                <div className="rounded-md bg-gray-800/40 p-3">
                  <div className="text-xs text-gray-400">Current Level</div>
                  <div className="text-lg font-semibold">{user.level}</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/40">
                <div className="text-sm font-semibold mb-3">Profile Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Username</div>
                    <input value={user.username} readOnly className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Email</div>
                    <input value={user.email} readOnly className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700" />
                  </div>
                </div>
              </div>

              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/40">
                <div className="text-sm font-semibold mb-3">Performance Summary</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-green-400 text-2xl font-bold">{user.wins}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 text-2xl font-bold">{user.losses}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 text-2xl font-bold">{winRate}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "achievements" && (
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/40">No achievements yet</div>
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {["Win vs AI", "Loss vs Player", "Win vs Player"].map((h, i) => (
              <div key={i} className="border border-gray-700 rounded-lg p-3 bg-gray-800/40">
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

