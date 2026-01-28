/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, User2, Gamepad2, BarChart3 } from "lucide-react";
import {
  apiGetMatchHistory,
  apiGetMe,
  getStoredToken,
  apiUpdateMe,
  apiUploadAvatar,
  type MatchHistoryItem,
  type User,
} from "../api";

type Tab = "profile" | "achievements" | "history";

type AgarPlayerHistoryRow = {
  id: number;
  name: string;
  durationMs: number;
  kills: number;
  maxMass: number;
  rank: number;
  roomId: number;
  roomName: string;
};

type AgarRoomHistorySummary = {
  id: number;
  name: string;
  visibility: "public" | "private";
  isDefault: boolean;
  maxPlayers: number;
  maxDurationMin: number;
  startedAt: string | null;
  endedAt: string | null;
  playersCount: number;
  winner?: {
    name: string;
    kills: number;
    maxMass: number;
    durationMs: number;
    rank: number;
  } | null;
  leaderboard: Array<{
    id: string | number;
    type: "user" | "guest";
    trueName: string | null;
    name: string;
    kills: number;
    maxMass: number;
    durationMs: number;
    rank: number;
  }>;
};

function msToMinSec(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

const initialAgarPlayers: AgarPlayerHistoryRow[] = [
  {
    id: 1,
    name: "Alice",
    durationMs: 215000,
    kills: 3,
    maxMass: 180,
    rank: 2,
    roomId: 101,
    roomName: "ffa",
  },
  {
    id: 2,
    name: "Bob",
    durationMs: 412000,
    kills: 6,
    maxMass: 320,
    rank: 1,
    roomId: 101,
    roomName: "ffa",
  },
  {
    id: 3,
    name: "Guest-42",
    durationMs: 99000,
    kills: 1,
    maxMass: 95,
    rank: 4,
    roomId: 102,
    roomName: "room-123",
  },
];

const initialAgarRooms: AgarRoomHistorySummary[] = [
  {
    id: 101,
    name: "ffa",
    visibility: "public",
    isDefault: true,
    maxPlayers: 30,
    maxDurationMin: 10,
    startedAt: new Date().toISOString(),
    endedAt: new Date(Date.now() + 60000).toISOString(),
    playersCount: 18,
    winner: {
      name: "Bob",
      kills: 6,
      maxMass: 320,
      durationMs: 412000,
      rank: 1,
    },
    leaderboard: [
      {
        id: 10,
        type: "user",
        trueName: "Bob",
        name: "Bob",
        kills: 6,
        maxMass: 320,
        durationMs: 412000,
        rank: 1,
      },
      {
        id: 11,
        type: "user",
        trueName: "Alice",
        name: "Alice",
        kills: 3,
        maxMass: 180,
        durationMs: 215000,
        rank: 2,
      },
      {
        id: "guest-42",
        type: "guest",
        trueName: null,
        name: "Guest-42",
        kills: 1,
        maxMass: 95,
        durationMs: 99000,
        rank: 4,
      },
    ],
  },
  {
    id: 102,
    name: "room-123",
    visibility: "private",
    isDefault: false,
    maxPlayers: 12,
    maxDurationMin: 5,
    startedAt: new Date().toISOString(),
    endedAt: null,
    playersCount: 7,
    winner: null,
    leaderboard: [
      {
        id: "guest-7",
        type: "guest",
        trueName: null,
        name: "Guest-7",
        kills: 2,
        maxMass: 140,
        durationMs: 165000,
        rank: 1,
      },
      {
        id: "guest-42",
        type: "guest",
        trueName: null,
        name: "Guest-42",
        kills: 1,
        maxMass: 95,
        durationMs: 99000,
        rank: 3,
      },
    ],
  },
];

export default function PlayerProfile() {
  const [tab, setTab] = useState<Tab>("profile");
  // const [user, setUser] = useState(localStorage.getItem("profile_data"));
  const [user, setUser] = useState<User | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState("");
  // const [user, setUser] = useState(() => {
  //   // const raw = localStorage.getItem("profile_data");
  //   const base = {
  //     username: "ht",
  //     email: "ht@example.com",
  //     level: 9,
  //     xp: 80,
  //     xpMax: 100,
  //     memberSince: new Date().toLocaleDateString(),
  //     wins: 46,
  //     losses: 37,
  //     avatarUrl: "",
  //   };
  //   try {
  //     return raw ? { ...base, ...JSON.parse(raw) } : base;
  //   } catch {
  //     return base;
  //   }
  // });
  const [isEditing, setIsEditing] = useState(false);
  // const [editName, setEditName] = useState(user.username);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editError, setEditError] = useState<string>("");
  const [editErrorForm, setEditErrorForm] = useState<string>("");
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyFetched, setHistoryFetched] = useState(false);
  const [historyMode, setHistoryMode] = useState<"pong" | "agario">("pong");
  const [selectedAgarPlayerId, setSelectedAgarPlayerId] = useState<
    number | null
  >(null);
  const [showAgarLeaderboard, setShowAgarLeaderboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // add real data
  const wins = 0;
  const losses = 0;
  const xpPct = 5.55;
  const level = 9.99;
  const gamesPlayed = wins + losses;
  const winRate = gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0;

  // const gamesPlayed = user.wins + user.losses;
  // const winRate = Math.round((user.wins / Math.max(1, gamesPlayed)) * 100);
  // const xpPct = Math.min(100, Math.round((user.xp / user.xpMax) * 100));
  const selectedAgarPlayer = useMemo(
    () => initialAgarPlayers.find((p) => p.id === selectedAgarPlayerId) ?? null,
    [selectedAgarPlayerId],
  );
  const selectedAgarRoom = useMemo(
    () =>
      selectedAgarPlayer
        ? (initialAgarRooms.find((r) => r.id === selectedAgarPlayer.roomId) ??
          null)
        : null,
    [selectedAgarPlayer],
  );
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

    const preview = URL.createObjectURL(file);
    setEditAvatarFile(file);
    setEditAvatarPreview(preview);
    setEditError("");
    // const reader = new FileReader();
    // reader.onload = () => {
    //   const url = typeof reader.result === "string" ? reader.result : "";
    //   setEditAvatar(url);
    //   setEditError("");
    // };
    // reader.readAsDataURL(file);
  };
  const saveProfile = async () => {
    // const next = { ...user, username: editName, email: editEmail, avatarUrl: editAvatar || user.avatarUrl };
    // setUser(next);
    // localStorage.setItem("profile_data", JSON.stringify(next));
    // setIsEditing(false);
    setEditErrorForm("");
    const token = getStoredToken();
    if (!token) return;
    if (!user) return;
    const data: { username?: string; email?: string; password?: string } = {};
    if (editName.trim() && editName.trim() != user.username)
      data.username = editName.trim();
    if (editEmail.trim() && editEmail.trim() != user.email)
      data.email = editEmail.trim();
    if (editPassword) data.password = editPassword;
    if (Object.keys(data).length > 0) {
      try {
        await apiUpdateMe(token, data);
      } catch (e: any) {
        setEditErrorForm(e.message ?? "Update failed");
        setIsEditing(true);
        return;
      }
    }
    if (editAvatarFile) {
      try {
        await apiUploadAvatar(token, editAvatarFile);
      } catch (e: any) {
        setEditError(e.message ?? "Update failed");
        setIsEditing(true);
        return;
      }
    }
    const fresh = await apiGetMe(token);
    setUser(fresh);
    setIsEditing(false);
  };
  const cancelEdit = () => {
    if (user) {
      setEditName(user.username);
      setEditEmail(user.email);
      setEditAvatarPreview(user.avatarUrl ?? "");
    }
    setEditPassword("");
    setEditAvatarFile(null);
    setEditError("");
    setIsEditing(false);
  };

  useEffect(() => {
    if (tab !== "history") return;
    if (historyFetched) return;
    if (!user) return;

    let cancelled = false;
    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) {
            setHistory([]);
            setHistoryError("Not authenticated");
          }
          return;
        }
        const data = await apiGetMatchHistory(token, user.id);
        if (!cancelled) {
          setHistory(data.history ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setHistoryError(
            err instanceof Error ? err.message : "Failed to load match history",
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
          setHistoryFetched(true);
        }
      }
    };
    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [tab, historyFetched]);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      setMeLoading(true);
      setMeError("");

      try {
        const token = getStoredToken();
        if (!token) throw new Error("Not authenticated");

        const me = await apiGetMe(token);
        if (!cancelled) setUser(me);
      } catch (e) {
        if (!cancelled)
          setMeError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    };

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);
  if (meLoading) return <div>Loading...</div>;
  if (meError) return <div>{meError}</div>;
  if (!user) return null;
  return (
    <div className="w-full h-full text-white">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Player Profile
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage your account and view your progress
          </p>
        </div>
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            {(["profile", "achievements", "history"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1 rounded-full text-sm transition-colors ${
                  tab === t
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
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
                  <img
                    src={user.avatarUrl}
                    alt="avatar"
                    className="mx-auto w-24 h-24 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 mb-4" />
                )}
                <div className="text-center font-medium">{user.username}</div>
                <div className="text-center text-sm text-gray-400 mb-3">
                  {user.email}
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800/80">
                    Level {level}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-1">Level Progress</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${xpPct}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                  />
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Member since: {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <button
                  className="mt-4 w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (!user) return;
                    setEditEmail(user.email);
                    setEditName(user.username);
                    setEditPassword("");
                    setEditAvatarPreview(user.avatarUrl ?? "");
                    setEditAvatarFile(null);
                    setEditError("");
                    setEditErrorForm("");
                    setIsEditing(true);
                  }}
                >
                  Edit Profile
                </button>
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
                    <div className="text-lg font-semibold text-green-400">
                      {wins}
                    </div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Win Rate</div>
                    <div className="text-lg font-semibold text-blue-400">
                      {winRate}%
                    </div>
                  </div>
                  <div className="rounded-md bg-gray-800/40 p-4">
                    <div className="text-xs text-gray-400">Current Level</div>
                    <div className="text-lg font-semibold">{level}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <User2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    Profile Information
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Name</div>
                    <div className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700">
                      {user.username}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Email</div>
                    <div className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <Gamepad2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    Performance Summary
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {wins}
                    </div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400">
                      {losses}
                    </div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {winRate}%
                    </div>
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
            <div className="text-lg font-semibold text-gray-100 mb-4">
              Edit Profile
            </div>
            <div className="flex items-center gap-4 mb-4">
              {editAvatarPreview ? (
                <img
                  src={editAvatarPreview}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
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
                {editError && (
                  <div className="text-xs text-red-400">{editError}</div>
                )}
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
              <div>
                <div className="text-xs text-gray-400 mb-1">Password</div>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700"
                />
              </div>
            </div>
            {editErrorForm && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {editErrorForm}
              </div>
            )}
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
                <div
                  key={i}
                  className={`rounded-lg p-4 border ${a.unlocked ? "border-blue-500/40 bg-blue-900/20" : "border-gray-700 bg-gray-800/40"}`}
                >
                  <div
                    className={`text-sm ${a.unlocked ? "text-blue-300" : "text-gray-300"}`}
                  >
                    {a.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {a.unlocked ? "Unlocked" : "Locked"}
                  </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex rounded-full bg-gray-800/60 p-1">
                <button
                  onClick={() => setHistoryMode("pong")}
                  className={`px-4 py-1 rounded-full text-sm transition-colors ${
                    historyMode === "pong"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  Pong
                </button>
                <button
                  onClick={() => setHistoryMode("agario")}
                  className={`px-4 py-1 rounded-full text-sm transition-colors ${
                    historyMode === "agario"
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  Agar.io
                </button>
              </div>
            </div>
            {historyMode === "pong" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="px-3 py-2">Opponent</th>
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {historyLoading && (
                      <tr className="text-gray-400">
                        <td className="px-3 py-3" colSpan={4}>
                          Loading history...
                        </td>
                      </tr>
                    )}
                    {!historyLoading && historyError && (
                      <tr className="text-red-300">
                        <td className="px-3 py-3" colSpan={4}>
                          {historyError}
                        </td>
                      </tr>
                    )}
                    {!historyLoading &&
                      !historyError &&
                      history.length === 0 && (
                        <tr className="text-gray-400">
                          <td className="px-3 py-3" colSpan={4}>
                            No matches yet
                          </td>
                        </tr>
                      )}
                    {!historyLoading &&
                      !historyError &&
                      history.map((row) => {
                        const resultText =
                          row.result === "win" ? "Win" : "Loss";
                        const resultClass =
                          row.result === "win"
                            ? "bg-green-600/30 text-green-300"
                            : "bg-red-600/30 text-red-300";
                        return (
                          <tr key={row.id} className="text-gray-200">
                            <td className="px-3 py-2">{row.opponentName}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-1 rounded ${resultClass}`}
                              >
                                {resultText}
                              </span>
                            </td>
                            <td className="px-3 py-2">{row.score}</td>
                            <td className="px-3 py-2">
                              {new Date(row.date).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
            {historyMode === "agario" && (
              <div>
                <div className="text-xs font-semibold text-gray-300 mb-3">
                  Player History
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Kills</th>
                        <th className="px-3 py-2">Max Mass</th>
                        <th className="px-3 py-2">Rank</th>
                        <th className="px-3 py-2">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialAgarPlayers.map((p) => {
                        const isSelected = selectedAgarPlayerId === p.id;
                        const isLeaderboardOpen =
                          isSelected && showAgarLeaderboard;
                        return (
                          <React.Fragment key={p.id}>
                            <tr
                              className={`text-gray-200 cursor-pointer hover:bg-white/5 border-b border-gray-800 ${isSelected ? "bg-white/10" : ""}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAgarPlayerId(null);
                                  setShowAgarLeaderboard(false);
                                  return;
                                }
                                setSelectedAgarPlayerId(p.id);
                                setShowAgarLeaderboard(false);
                              }}
                            >
                              <td className="px-3 py-2">{p.name}</td>
                              <td className="px-3 py-2">
                                {msToMinSec(p.durationMs)}
                              </td>
                              <td className="px-3 py-2">{p.kills}</td>
                              <td className="px-3 py-2">{p.maxMass}</td>
                              <td className="px-3 py-2">{p.rank}</td>
                              <td className="px-3 py-2">{p.roomName}</td>
                            </tr>
                            <tr
                              className={
                                isSelected
                                  ? "bg-white/5 border-b border-gray-800"
                                  : ""
                              }
                            >
                              <td
                                className={`px-3 ${isSelected ? "py-4" : "py-0"}`}
                                colSpan={6}
                              >
                                <div
                                  className={`overflow-hidden transition-all duration-300 ease-out ${isSelected ? "max-h-[1200px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"}`}
                                >
                                  {selectedAgarRoom && (
                                    <div>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="text-xs font-semibold text-gray-300">
                                          Room history
                                        </div>
                                        <button
                                          onClick={() =>
                                            setShowAgarLeaderboard(
                                              (prev) => !prev,
                                            )
                                          }
                                          className="px-3 py-1 rounded text-xs bg-white/10 text-gray-200 hover:text-white"
                                        >
                                          Leaderboard
                                        </button>
                                      </div>
                                      <div className="text-gray-300 mb-3">
                                        <span className="font-semibold text-white">
                                          {selectedAgarRoom.name}
                                        </span>
                                        <span className="ml-2 text-xs px-2 py-1 rounded bg-white/5">
                                          {selectedAgarRoom.visibility}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-400 mb-4">
                                        Winner:{" "}
                                        {selectedAgarRoom.winner
                                          ? `${selectedAgarRoom.winner.name} • ${selectedAgarRoom.winner.kills} kills • ${selectedAgarRoom.winner.maxMass} max mass • ${msToMinSec(selectedAgarRoom.winner.durationMs)} • rank ${selectedAgarRoom.winner.rank}`
                                          : "—"}
                                      </div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="text-left text-gray-400">
                                              <th className="px-3 py-2">
                                                Name
                                              </th>
                                              <th className="px-3 py-2">
                                                Visibility
                                              </th>
                                              <th className="px-3 py-2">
                                                Default
                                              </th>
                                              <th className="px-3 py-2">
                                                Players
                                              </th>
                                              <th className="px-3 py-2">
                                                Duration
                                              </th>
                                              <th className="px-3 py-2">
                                                Started
                                              </th>
                                              <th className="px-3 py-2">
                                                Ended
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-800">
                                            <tr className="text-gray-200">
                                              <td className="px-3 py-2">
                                                {selectedAgarRoom.name}
                                              </td>
                                              <td className="px-3 py-2">
                                                {selectedAgarRoom.visibility}
                                              </td>
                                              <td className="px-3 py-2">
                                                {selectedAgarRoom.isDefault
                                                  ? "Yes"
                                                  : "No"}
                                              </td>
                                              <td className="px-3 py-2">
                                                {selectedAgarRoom.playersCount}/
                                                {selectedAgarRoom.maxPlayers}
                                              </td>
                                              <td className="px-3 py-2">
                                                {
                                                  selectedAgarRoom.maxDurationMin
                                                }
                                                m
                                              </td>
                                              <td className="px-3 py-2">
                                                {formatDate(
                                                  selectedAgarRoom.startedAt,
                                                )}
                                              </td>
                                              <td className="px-3 py-2">
                                                {formatDate(
                                                  selectedAgarRoom.endedAt,
                                                )}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                      <div
                                        className={`mt-6 overflow-hidden transition-all duration-300 ease-out ${isLeaderboardOpen ? "max-h-[900px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"}`}
                                      >
                                        <div className="text-xs font-semibold text-gray-300 mb-3">
                                          Leaderboard
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="text-left text-gray-400">
                                                <th className="px-3 py-2">
                                                  Name
                                                </th>
                                                <th className="px-3 py-2">
                                                  In-Game Name
                                                </th>
                                                <th className="px-3 py-2">
                                                  Kills
                                                </th>
                                                <th className="px-3 py-2">
                                                  Max Mass
                                                </th>
                                                <th className="px-3 py-2">
                                                  Duration
                                                </th>
                                                <th className="px-3 py-2">
                                                  Rank
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                              {selectedAgarRoom.leaderboard.map(
                                                (p) => (
                                                  <tr
                                                    key={p.id}
                                                    className="text-gray-200"
                                                  >
                                                    <td className="px-3 py-2">
                                                      {p.trueName ?? "—"}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {p.name}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {p.kills}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {p.maxMass}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {msToMinSec(p.durationMs)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {p.rank}
                                                    </td>
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
