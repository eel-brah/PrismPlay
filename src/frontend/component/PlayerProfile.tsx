import React, { useMemo, useState, useRef } from "react";
import { Trophy, User2, Gamepad2, BarChart3 } from "lucide-react";

type Tab = "profile" | "achievements" | "history";

export default function PlayerProfile() {
  const [tab, setTab] = useState<Tab>("profile");
  // const [user, setUser] = useState(localStorage.getItem("profile_data"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("profile_data");
    const base = {
      username: "ht",
      email: "ht@example.com",
      level: 9,
      xp: 80,
      xpMax: 100,
      memberSince: new Date().toLocaleDateString(),
      wins: 46,
      losses: 37,
      avatarUrl: "",
    };
    try {
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch {
      return base;
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.username);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editAvatar, setEditAvatar] = useState(user.avatarUrl || "");
  const [editError, setEditError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gamesPlayed = user.wins + user.losses;
  const winRate = Math.round((user.wins / Math.max(1, gamesPlayed)) * 100);
  const xpPct = Math.min(100, Math.round((user.xp / user.xpMax) * 100));
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEditError("Please select a valid image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setEditError("Image too large (max 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      setEditAvatar(url);
      setEditError("");
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = () => {
    const next = { ...user, username: editName, email: editEmail, avatarUrl: editAvatar || user.avatarUrl };
    setUser(next);
    localStorage.setItem("profile_data", JSON.stringify(next));
    setIsEditing(false);
  };
  const cancelEdit = () => {
    setEditName(user.username);
    setEditEmail(user.email);
    setEditAvatar(user.avatarUrl || "");
    setIsEditing(false);
  };
  return (
    <div className="w-full h-full text-white">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Player Profile
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage your account and view your progress</p>
        </div>
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            {(["profile", "achievements", "history"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1 rounded-full text-sm transition-colors ${
                  tab === t ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {tab === "profile" && (
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="mx-auto w-24 h-24 rounded-full object-cover mb-4" />
                ) : (
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 mb-4" />
                )}
                <div className="text-center font-medium">{user.username}</div>
                <div className="text-center text-sm text-gray-400 mb-3">{user.email}</div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800/80">Level {user.level}</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">Level Progress</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div style={{ width: `${xpPct}%` }} className="h-full bg-gradient-to-r from-blue-500 to-purple-600" />
                </div>
                <div className="text-xs text-gray-400 mt-2">Member since: {user.memberSince}</div>
                <button className="mt-4 w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700" onClick={() => setIsEditing(true)}>Edit Profile</button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Quick Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Games Played</div>
                    <div className="text-lg font-semibold">{gamesPlayed}</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Total Wins</div>
                    <div className="text-lg font-semibold text-green-400">{user.wins}</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Win Rate</div>
                    <div className="text-lg font-semibold text-blue-400">{winRate}%</div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Current Level</div>
                    <div className="text-lg font-semibold">{user.level}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <User2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Profile Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Name</div>
                    <div className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700">{user.username}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Email</div>
                    <div className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700">{user.email}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <Gamepad2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Performance Summary</span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{user.wins}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">{user.losses}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{winRate}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900/95 p-6 shadow-2xl">
            <div className="text-lg font-semibold text-gray-100 mb-4">Edit Profile</div>
            <div className="flex items-center gap-4 mb-4">
              {editAvatar ? (
                <img src={editAvatar} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
              )}
              <div className="flex-1 grid grid-cols-1 gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  Upload Avatar
                </button>
                {editError && <div className="text-xs text-red-400">{editError}</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Name</div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Email</div>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={!!editError}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "achievements" && (
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-200">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-semibold">Achievements</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "First Win", unlocked: true },
                { name: "Hot Streak", unlocked: false },
                { name: "Precision", unlocked: false },
                { name: "Veteran", unlocked: false },
              ].map((a, i) => (
                <div key={i} className={`rounded-lg p-4 border ${a.unlocked ? "border-blue-500/40 bg-blue-900/20" : "border-gray-700 bg-gray-800/40"}`}>
                  <div className={`text-sm ${a.unlocked ? "text-blue-300" : "text-gray-300"}`}>{a.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{a.unlocked ? "Unlocked" : "Locked"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === "history" && (
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-200">
              <Gamepad2 className="w-5 h-5" />
              <span className="text-sm font-semibold">Game History</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="px-3 py-2">Opponent</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { opponent: "AI", result: "Win", mode: "Offline", date: new Date().toLocaleDateString() },
                    { opponent: "Player123", result: "Loss", mode: "Online", date: new Date().toLocaleDateString() },
                    { opponent: "Player456", result: "Win", mode: "Online", date: new Date().toLocaleDateString() },
                  ].map((row, i) => (
                    <tr key={i} className="text-gray-200">
                      <td className="px-3 py-2">{row.opponent}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded ${row.result === "Win" ? "bg-green-600/30 text-green-300" : "bg-red-600/30 text-red-300"}`}>
                          {row.result}
                        </span>
                      </td>
                      <td className="px-3 py-2">{row.mode}</td>
                      <td className="px-3 py-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
