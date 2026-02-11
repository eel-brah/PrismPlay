/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Trophy, Gamepad2, BarChart3 } from "lucide-react";
import NotFound from "./NotFound";
import {
  apiGetAchievements,
  apiGetAgarioPlayerHistory,
  apiGetAgarioRoomHistory,
  apiGetAgarioRoomLeaderboard,
  apiGetMatchHistory,
  apiGetMe,
  apiGetPlayerStats,
  apiGetUserByUsername,
  getStoredToken,
  apiUpdateMe,
  apiUploadAvatar,
  apiListFriends,
  apiAddFriend,
  apiRemoveFriend,
  apiIsFrienddPending,
  apiIncomingRequests,
  type Achievement,
  type AgarioPlayerHistoryRecord,
  type AgarioRoomHistory,
  type AgarioRoomLeaderboardEntry,
  type MatchHistoryItem,
  type PlayerStats,
  type PublicUser,
  type User,
  apiAcceptFriend,
  apiDeclineFriend,
} from "../api";

type Tab = "profile" | "history";

type AgarPlayerHistoryRow = {
  id: number;
  name: string;
  durationMs: number;
  kills: number;
  maxMass: number;
  rank: number | null;
  roomId: number;
  roomName: string;
};

type AgarRoomHistorySummary = {
  id: number;
  name: string;
  visibility: "public" | "private";
  isDefault: boolean;
  maxPlayers: number | null;
  maxDurationMin: number | null;
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

function mapAgarPlayerRows(
  records: AgarioPlayerHistoryRecord[],
): AgarPlayerHistoryRow[] {
  return records.map((row) => ({
    id: row.id,
    name: row.name,
    durationMs: row.durationMs,
    kills: row.kills,
    maxMass: row.maxMass,
    rank: row.rank,
    roomId: row.roomId,
    roomName: row.room?.name ?? "—",
  }));
}

function mapRoomHistoryToSummary(
  room: AgarioRoomHistory,
): AgarRoomHistorySummary {
  const leaderboard = room.leaderboard.map((entry) => ({
    id: entry.id,
    type: entry.type,
    trueName: entry.trueName,
    name: entry.name,
    kills: entry.kills,
    maxMass: entry.maxMass,
    durationMs: entry.durationMs,
    rank: entry.rank,
  }));
  const winner =
    room.leaderboard.find((entry) => entry.isWinner) ?? leaderboard[0] ?? null;
  return {
    id: room.id,
    name: room.name,
    visibility: room.visibility === "private" ? "private" : "public",
    isDefault: room.isDefault,
    maxPlayers: null,
    maxDurationMin: null,
    startedAt: room.startedAt ?? null,
    endedAt: room.endedAt ?? null,
    playersCount: leaderboard.length,
    winner: winner
      ? {
          name: winner.trueName ?? winner.name,
          kills: winner.kills,
          maxMass: winner.maxMass,
          durationMs: winner.durationMs,
          rank: winner.rank,
        }
      : null,
    leaderboard,
  };
}

function mapLeaderboardEntries(
  entries: AgarioRoomLeaderboardEntry[],
  roomLeaderboard?: AgarRoomHistorySummary["leaderboard"],
) {
  return entries.map((entry) => {
    const rawId =
      entry.id.startsWith("user-") || entry.id.startsWith("guest-")
        ? entry.id.split("-").slice(1).join("-")
        : entry.id;
    const match =
      roomLeaderboard?.find((p) => String(p.id) === String(rawId)) ?? null;
    const type = entry.id.startsWith("guest-") ? "guest" : "user";
    return {
      id: rawId,
      type: match?.type ?? type,
      trueName: match?.trueName ?? null,
      name: entry.name,
      kills: entry.kills,
      maxMass: entry.maxMass,
      durationMs: match?.durationMs ?? 0,
      rank: entry.rank,
    };
  });
}

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
  const [agarPlayers, setAgarPlayers] = useState<AgarPlayerHistoryRow[]>([]);
  const [agarPlayersLoading, setAgarPlayersLoading] = useState(false);
  const [agarPlayersError, setAgarPlayersError] = useState("");
  const [agarPlayersFetched, setAgarPlayersFetched] = useState(false);
  const [agarRoomsById, setAgarRoomsById] = useState<
    Record<number, AgarRoomHistorySummary>
  >({});
  const [agarRoomLoading, setAgarRoomLoading] = useState(false);
  const [agarRoomError, setAgarRoomError] = useState("");
  const [agarLeaderboardByRoomId, setAgarLeaderboardByRoomId] = useState<
    Record<number, AgarRoomHistorySummary["leaderboard"]>
  >({});
  const [agarLeaderboardLoading, setAgarLeaderboardLoading] = useState(false);
  const [agarLeaderboardError, setAgarLeaderboardError] = useState("");
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsError, setAchievementsError] = useState("");
  const [selectedAgarPlayerId, setSelectedAgarPlayerId] = useState<
    number | null
  >(null);
  const [showAgarLeaderboard, setShowAgarLeaderboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedAgarPlayer = useMemo(
    () => agarPlayers.find((p) => p.id === selectedAgarPlayerId) ?? null,
    [agarPlayers, selectedAgarPlayerId],
  );
  const selectedAgarRoom = useMemo(
    () =>
      selectedAgarPlayer
        ? (agarRoomsById[selectedAgarPlayer.roomId] ?? null)
        : null,
    [agarRoomsById, selectedAgarPlayer],
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
    if (tab !== "history") return;
    if (historyMode !== "agario") return;
    if (agarPlayersFetched) return;
    if (!user) return;

    let cancelled = false;
    const loadAgarPlayers = async () => {
      setAgarPlayersLoading(true);
      setAgarPlayersError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) {
            setAgarPlayers([]);
            setAgarPlayersError("Not authenticated");
          }
          return;
        }
        const data = await apiGetAgarioPlayerHistory(token, user.id);
        if (!cancelled) {
          setAgarPlayers(mapAgarPlayerRows(data));
        }
      } catch (err) {
        if (!cancelled) {
          setAgarPlayersError(
            err instanceof Error ? err.message : "Failed to load agar history",
          );
        }
      } finally {
        if (!cancelled) {
          setAgarPlayersLoading(false);
          setAgarPlayersFetched(true);
        }
      }
    };
    void loadAgarPlayers();

    return () => {
      cancelled = true;
    };
  }, [tab, historyMode, agarPlayersFetched, user]);

  useEffect(() => {
    if (!selectedAgarPlayer || historyMode !== "agario") return;
    const roomId = selectedAgarPlayer.roomId;
    if (agarRoomsById[roomId]) return;

    let cancelled = false;
    const loadRoomHistory = async () => {
      setAgarRoomLoading(true);
      setAgarRoomError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) setAgarRoomError("Not authenticated");
          return;
        }
        const room = await apiGetAgarioRoomHistory(token, roomId);
        if (!cancelled) {
          setAgarRoomsById((prev) => ({
            ...prev,
            [roomId]: mapRoomHistoryToSummary(room),
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setAgarRoomError(
            err instanceof Error ? err.message : "Failed to load room history",
          );
        }
      } finally {
        if (!cancelled) setAgarRoomLoading(false);
      }
    };
    void loadRoomHistory();

    return () => {
      cancelled = true;
    };
  }, [agarRoomsById, historyMode, selectedAgarPlayer]);

  useEffect(() => {
    if (!showAgarLeaderboard || !selectedAgarPlayer) return;
    if (historyMode !== "agario") return;
    const roomId = selectedAgarPlayer.roomId;
    if (agarLeaderboardByRoomId[roomId]) return;

    let cancelled = false;
    const loadLeaderboard = async () => {
      setAgarLeaderboardLoading(true);
      setAgarLeaderboardError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) setAgarLeaderboardError("Not authenticated");
          return;
        }
        const data = await apiGetAgarioRoomLeaderboard(token, roomId);
        if (cancelled) return;
        const summary =
          agarRoomsById[roomId] ?? mapRoomHistoryToSummary(data.room);
        const leaderboard = mapLeaderboardEntries(
          data.leaderboard,
          summary.leaderboard,
        );
        setAgarRoomsById((prev) => ({
          ...prev,
          [roomId]: summary,
        }));
        setAgarLeaderboardByRoomId((prev) => ({
          ...prev,
          [roomId]: leaderboard,
        }));
      } catch (err) {
        if (!cancelled) {
          setAgarLeaderboardError(
            err instanceof Error ? err.message : "Failed to load leaderboard",
          );
        }
      } finally {
        if (!cancelled) setAgarLeaderboardLoading(false);
      }
    };
    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [
    agarLeaderboardByRoomId,
    agarRoomsById,
    historyMode,
    selectedAgarPlayer,
    showAgarLeaderboard,
  ]);

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
  useEffect(() => {
    if (!user) return;
    setAgarPlayers([]);
    setAgarPlayersError("");
    setAgarPlayersFetched(false);
    setAgarRoomsById({});
    setAgarRoomError("");
    setAgarLeaderboardByRoomId({});
    setAgarLeaderboardError("");
    setSelectedAgarPlayerId(null);
    setShowAgarLeaderboard(false);
  }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadStats = async () => {
      setStatsError("");
      setStats(null);
      try {
        const token = getStoredToken();
        if (!token) throw new Error("Not authenticated");

        const data = await apiGetPlayerStats(token, user.id);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) {
          setStatsError(
            e instanceof Error ? e.message : "Failed to load stats",
          );
        }
      }
    };

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [user]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadAchievements = async () => {
      setAchievementsError("");
      setAchievements([]);
      try {
        const token = getStoredToken();
        if (!token) throw new Error("Not authenticated");

        const data = await apiGetAchievements(token, user.id);
        if (!cancelled) setAchievements(data.achievements ?? []);
      } catch (e) {
        if (!cancelled) {
          setAchievementsError(
            e instanceof Error ? e.message : "Failed to load achievements",
          );
        }
      }
    };

    void loadAchievements();
    return () => {
      cancelled = true;
    };
  }, [user]);
  if (meLoading) return <div>Loading...</div>;
  if (meError) return <div>{meError}</div>;
  if (!user) return null;
  const gamesPlayed = stats?.totalGames ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winRate = stats?.winrate ?? 0;
  const xpTotal = wins * 3 + losses;
  const xpMax = 100;
  const level = Math.max(1, Math.floor(xpTotal / xpMax) + 1);
  const xpCurrent = xpTotal % xpMax;
  const xpPercent = Math.min(100, Math.round((xpCurrent / xpMax) * 100));
  const lastLoginAt = user.lastLogin
    ? new Date(user.lastLogin).getTime()
    : null;
  const isOnline =
    lastLoginAt !== null && Date.now() - lastLoginAt < 5 * 60 * 1000;
  const statusPill = isOnline
    ? { text: "Online", cls: "bg-green-600 text-white" }
    : { text: "Offline", cls: "bg-gray-600 text-white" };
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
            {(["profile", "history"] as Tab[]).map((t) => (
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
                <div className="text-xs text-gray-400 mt-2">
                  Member since: {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${statusPill.cls}`}
                  >
                    {statusPill.text}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Level {level}</span>
                    <span>
                      {xpCurrent}/{xpMax} XP
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-800/70">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
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
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-semibold">Achievements</span>
                </div>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`rounded-lg p-4 border ${achievement.unlocked ? "border-blue-500/40 bg-blue-900/20" : "border-gray-700 bg-gray-800/40"}`}
                      >
                        <div
                          className={`text-sm ${achievement.unlocked ? "text-blue-300" : "text-gray-300"}`}
                        >
                          {achievement.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {achievement.unlocked ? "Unlocked" : "Locked"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {achievementsError || "No achievements to show yet"}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-200">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-sm font-semibold">Quick Stats</span>
                  </div>
                </div>
                {stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Games
                      </div>
                      <div className="text-lg font-semibold text-gray-100">
                        {gamesPlayed}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Wins
                      </div>
                      <div className="text-lg font-semibold text-green-400">
                        {wins}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Losses
                      </div>
                      <div className="text-lg font-semibold text-red-400">
                        {losses}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Win Rate
                      </div>
                      <div className="text-lg font-semibold text-blue-400">
                        {winRate}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {statsError || "No stats available"}
                  </div>
                )}
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
                      {agarPlayersLoading && (
                        <tr className="text-gray-400">
                          <td className="px-3 py-3" colSpan={6}>
                            Loading history...
                          </td>
                        </tr>
                      )}
                      {!agarPlayersLoading && agarPlayersError && (
                        <tr className="text-red-300">
                          <td className="px-3 py-3" colSpan={6}>
                            {agarPlayersError}
                          </td>
                        </tr>
                      )}
                      {!agarPlayersLoading &&
                        !agarPlayersError &&
                        agarPlayers.length === 0 && (
                          <tr className="text-gray-400">
                            <td className="px-3 py-3" colSpan={6}>
                              No matches yet
                            </td>
                          </tr>
                        )}
                      {!agarPlayersLoading &&
                        !agarPlayersError &&
                        agarPlayers.map((p) => {
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
                                    {agarRoomLoading && (
                                      <div className="text-sm text-gray-400">
                                        Loading room history...
                                      </div>
                                    )}
                                    {!agarRoomLoading && agarRoomError && (
                                      <div className="text-sm text-red-300">
                                        {agarRoomError}
                                      </div>
                                    )}
                                    {!agarRoomLoading &&
                                      !agarRoomError &&
                                      selectedAgarRoom && (
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
                                                    {
                                                      selectedAgarRoom.visibility
                                                    }
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {selectedAgarRoom.isDefault
                                                      ? "Yes"
                                                      : "No"}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {
                                                      selectedAgarRoom.playersCount
                                                    }
                                                    /
                                                    {selectedAgarRoom.maxPlayers ??
                                                      "—"}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {selectedAgarRoom.maxDurationMin ===
                                                    null
                                                      ? "—"
                                                      : `${selectedAgarRoom.maxDurationMin}m`}
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
                                            {agarLeaderboardLoading && (
                                              <div className="text-sm text-gray-400 mb-3">
                                                Loading leaderboard...
                                              </div>
                                            )}
                                            {!agarLeaderboardLoading &&
                                              agarLeaderboardError && (
                                                <div className="text-sm text-red-300 mb-3">
                                                  {agarLeaderboardError}
                                                </div>
                                              )}
                                            {!agarLeaderboardLoading &&
                                              !agarLeaderboardError && (
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
                                                              {p.trueName ??
                                                                "—"}
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
                                                              {msToMinSec(
                                                                p.durationMs,
                                                              )}
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
                                              )}
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

export function PublicPlayerProfile() {
  const { username } = useParams();
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsError, setAchievementsError] = useState("");
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyFetched, setHistoryFetched] = useState(false);
  const [historyMode, setHistoryMode] = useState<"pong" | "agario">("pong");
  const [agarPlayers, setAgarPlayers] = useState<AgarPlayerHistoryRow[]>([]);
  const [agarPlayersLoading, setAgarPlayersLoading] = useState(false);
  const [agarPlayersError, setAgarPlayersError] = useState("");
  const [agarPlayersFetched, setAgarPlayersFetched] = useState(false);
  const [agarRoomsById, setAgarRoomsById] = useState<
    Record<number, AgarRoomHistorySummary>
  >({});
  const [agarRoomLoading, setAgarRoomLoading] = useState(false);
  const [agarRoomError, setAgarRoomError] = useState("");
  const [agarLeaderboardByRoomId, setAgarLeaderboardByRoomId] = useState<
    Record<number, AgarRoomHistorySummary["leaderboard"]>
  >({});
  const [agarLeaderboardLoading, setAgarLeaderboardLoading] = useState(false);
  const [agarLeaderboardError, setAgarLeaderboardError] = useState("");
  const [selectedAgarPlayerId, setSelectedAgarPlayerId] = useState<
    number | null
  >(null);
  const [showAgarLeaderboard, setShowAgarLeaderboard] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [incomingRequestId, setIncomingRequestId] = useState<number | null>(
    null,
  );
  const [friendPending, setFriendPending] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState("");

  const handleAccept = async () => {
    if (!incomingRequestId || friendLoading) return;
    const token = getStoredToken();
    if (!token) return;

    setFriendLoading(true);
    setFriendError("");
    try {
      await apiAcceptFriend(token, String(incomingRequestId));
      setIncomingRequestId(null);
      setIsFriend(true);
      setFriendPending(false);
    } catch (e) {
      setFriendError(
        e instanceof Error ? e.message : "Failed to accept request",
      );
    } finally {
      setFriendLoading(false);
    }
  };
  const handleDecline = async () => {
    if (!incomingRequestId || friendLoading) return;
    const token = getStoredToken();
    if (!token) return;
    setFriendLoading(true);
    setFriendError("");
    try {
      await apiDeclineFriend(token, String(incomingRequestId));
      setIncomingRequestId(null);
      setIsFriend(false);
      setFriendPending(false);
    } catch (e) {
      setFriendError(
        e instanceof Error ? e.message : "Failed to decline request",
      );
    } finally {
      setFriendLoading(false);
    }
  };

  const selectedAgarPlayer = useMemo(
    () => agarPlayers.find((p) => p.id === selectedAgarPlayerId) ?? null,
    [agarPlayers, selectedAgarPlayerId],
  );
  const selectedAgarRoom = useMemo(
    () =>
      selectedAgarPlayer
        ? (agarRoomsById[selectedAgarPlayer.roomId] ?? null)
        : null,
    [agarRoomsById, selectedAgarPlayer],
  );

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      setNotFound(false);
      setError("");
      setStatsError("");
      setStats(null);
      setAchievementsError("");
      setAchievements([]);

      const token = getStoredToken();
      if (!token) {
        if (!cancelled) {
          setError("Not authenticated");
          setLoading(false);
        }
        return;
      }

      if (!username) {
        if (!cancelled) {
          setError("Missing username");
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await apiGetUserByUsername(token, username);
        if (!cancelled) setUser(profile);
        try {
          const nextStats = await apiGetPlayerStats(token, profile.id);
          if (!cancelled) setStats(nextStats);
        } catch (e) {
          if (!cancelled) {
            setStatsError(
              e instanceof Error ? e.message : "Failed to load stats",
            );
          }
        }
        try {
          const nextAchievements = await apiGetAchievements(token, profile.id);
          if (!cancelled) setAchievements(nextAchievements.achievements ?? []);
        } catch (e) {
          if (!cancelled) {
            setAchievementsError(
              e instanceof Error ? e.message : "Failed to load achievements",
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          const status = e?.response?.status; // axios puts status here
          if (status === 404) {
            setNotFound(true);
            setError("");
            setUser(null);
          } else {
            setError(e instanceof Error ? e.message : "Failed to load profile");
          }
          // setError(e instanceof Error ? e.message : "Failed to load profile");
        }
      }

      if (!cancelled) setLoading(false);
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    setHistory([]);
    setHistoryError("");
    setHistoryFetched(false);
    setHistoryMode("pong");
    setAgarPlayers([]);
    setAgarPlayersError("");
    setAgarPlayersFetched(false);
    setAgarRoomsById({});
    setAgarRoomError("");
    setAgarLeaderboardByRoomId({});
    setAgarLeaderboardError("");
    setSelectedAgarPlayerId(null);
    setShowAgarLeaderboard(false);
  }, [username]);

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
  }, [tab, historyFetched, user]);

  useEffect(() => {
    if (tab !== "history") return;
    if (historyMode !== "agario") return;
    if (agarPlayersFetched) return;
    if (!user) return;

    let cancelled = false;
    const loadAgarPlayers = async () => {
      setAgarPlayersLoading(true);
      setAgarPlayersError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) {
            setAgarPlayers([]);
            setAgarPlayersError("Not authenticated");
          }
          return;
        }
        const data = await apiGetAgarioPlayerHistory(token, user.id);
        if (!cancelled) {
          setAgarPlayers(mapAgarPlayerRows(data));
        }
      } catch (err) {
        if (!cancelled) {
          setAgarPlayersError(
            err instanceof Error ? err.message : "Failed to load agar history",
          );
        }
      } finally {
        if (!cancelled) {
          setAgarPlayersLoading(false);
          setAgarPlayersFetched(true);
        }
      }
    };
    void loadAgarPlayers();

    return () => {
      cancelled = true;
    };
  }, [tab, historyMode, agarPlayersFetched, user]);

  useEffect(() => {
    if (!selectedAgarPlayer || historyMode !== "agario") return;
    const roomId = selectedAgarPlayer.roomId;
    if (agarRoomsById[roomId]) return;

    let cancelled = false;
    const loadRoomHistory = async () => {
      setAgarRoomLoading(true);
      setAgarRoomError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) setAgarRoomError("Not authenticated");
          return;
        }
        const room = await apiGetAgarioRoomHistory(token, roomId);
        if (!cancelled) {
          setAgarRoomsById((prev) => ({
            ...prev,
            [roomId]: mapRoomHistoryToSummary(room),
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setAgarRoomError(
            err instanceof Error ? err.message : "Failed to load room history",
          );
        }
      } finally {
        if (!cancelled) setAgarRoomLoading(false);
      }
    };
    void loadRoomHistory();

    return () => {
      cancelled = true;
    };
  }, [agarRoomsById, historyMode, selectedAgarPlayer]);

  useEffect(() => {
    if (!showAgarLeaderboard || !selectedAgarPlayer) return;
    if (historyMode !== "agario") return;
    const roomId = selectedAgarPlayer.roomId;
    if (agarLeaderboardByRoomId[roomId]) return;

    let cancelled = false;
    const loadLeaderboard = async () => {
      setAgarLeaderboardLoading(true);
      setAgarLeaderboardError("");
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) setAgarLeaderboardError("Not authenticated");
          return;
        }
        const data = await apiGetAgarioRoomLeaderboard(token, roomId);
        if (cancelled) return;
        const summary =
          agarRoomsById[roomId] ?? mapRoomHistoryToSummary(data.room);
        const leaderboard = mapLeaderboardEntries(
          data.leaderboard,
          summary.leaderboard,
        );
        setAgarRoomsById((prev) => ({
          ...prev,
          [roomId]: summary,
        }));
        setAgarLeaderboardByRoomId((prev) => ({
          ...prev,
          [roomId]: leaderboard,
        }));
      } catch (err) {
        if (!cancelled) {
          setAgarLeaderboardError(
            err instanceof Error ? err.message : "Failed to load leaderboard",
          );
        }
      } finally {
        if (!cancelled) setAgarLeaderboardLoading(false);
      }
    };
    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [
    agarLeaderboardByRoomId,
    agarRoomsById,
    historyMode,
    selectedAgarPlayer,
    showAgarLeaderboard,
  ]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadFriendStatus = async () => {
      setFriendLoading(true);
      setFriendError("");
      try {
        const token = getStoredToken();
        if (!token) throw new Error("Not authenticated");
        const [me, friends, incoming] = await Promise.all([
          apiGetMe(token),
          apiListFriends(token),
          apiIncomingRequests(token),
        ]);
        if (cancelled) return;
        setMyUserId(me.id);
        const friendIds = new Set(friends.map((f) => f.friend.id));
        const isFriend = friendIds.has(user.id);
        setIsFriend(isFriend);
        if (isFriend) {
          setFriendPending(false);
          setIncomingRequestId(null);
          return;
        }
        const inc = incoming.find((r) => r.fromUser.id === user.id);
        if (inc) {
          setIncomingRequestId(inc.id);
          setFriendPending(false);
          return;
        }
        const pending = await apiIsFrienddPending(token, user.id);
        if (!cancelled) setFriendPending(pending);
      } catch (e) {
        if (!cancelled) {
          setFriendError(
            e instanceof Error ? e.message : "Failed to load friend status",
          );
        }
      } finally {
        if (!cancelled) setFriendLoading(false);
      }
    };
    void loadFriendStatus();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (notFound) return <NotFound message={`User "${username ?? ""}" was not found.`} />;
  if (error) return <div>{error}</div>;
  if (!user) return <NotFound message={`User "${username ?? ""}" was not found.`} />;

  const gamesPlayed = stats?.totalGames ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winRate = stats?.winrate ?? 0;
  const xpTotal = wins * 3 + losses;
  const xpMax = 100;
  const level = Math.max(1, Math.floor(xpTotal / xpMax) + 1);
  const xpCurrent = xpTotal % xpMax;
  const xpPercent = Math.min(100, Math.round((xpCurrent / xpMax) * 100));
  const lastLoginAt = user.lastLogin
    ? new Date(user.lastLogin).getTime()
    : null;
  const isOnline =
    lastLoginAt !== null && Date.now() - lastLoginAt < 5 * 60 * 1000;
  const statusPill = isOnline
    ? { text: "Online", cls: "bg-green-600 text-white" }
    : { text: "Offline", cls: "bg-gray-600 text-white" };
  const showFriendAction = myUserId !== null && user.id !== myUserId;
  const friendButtonLabel = friendPending
    ? "Pending..."
    : isFriend
      ? "Remove Friend"
      : "Add Friend";
  const friendButtonClass = friendPending
    ? "bg-gray-600 text-white"
    : isFriend
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  const handleFriendAction = async () => {
    if (friendLoading || friendPending) return;
    const token = getStoredToken();
    if (!token) return;
    setFriendLoading(true);
    setFriendError("");
    try {
      if (isFriend) {
        await apiRemoveFriend(token, String(user.id));
        setIsFriend(false);
        setFriendPending(false);
      } else {
        await apiAddFriend(token, user.username);
        setFriendPending(true);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update friend status";
      if (message.toLowerCase().includes("exist")) {
        setFriendPending(true);
        return;
      }
      setFriendError(message);
    } finally {
      setFriendLoading(false);
    }
  };

  return (
    <div className="w-full h-full text-white">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Player Profile
          </h2>
          <p className="text-sm text-gray-400 mt-1">Viewing player profile</p>
        </div>
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            {(["profile", "history"] as Tab[]).map((t) => (
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
                    alt={user.username}
                    className="mx-auto w-24 h-24 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 mb-4" />
                )}
                <div className="text-center font-medium">{user.username}</div>
                <div className="text-center text-sm text-gray-400 mb-3">
                  Member since: {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${statusPill.cls}`}
                  >
                    {statusPill.text}
                  </span>
                </div>
                {showFriendAction && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {incomingRequestId ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={friendLoading}
                          className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                        >
                          {friendLoading ? "Updating..." : "Accept"}
                        </button>

                        <button
                          type="button"
                          onClick={handleDecline}
                          disabled={friendLoading}
                          className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                        >
                          {friendLoading ? "Updating..." : "Decline"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFriendAction}
                        disabled={friendLoading || friendPending}
                        className={`px-4 py-2 rounded-md ${friendButtonClass} disabled:opacity-60`}
                      >
                        {friendLoading ? "Updating..." : friendButtonLabel}
                      </button>
                    )}

                    {friendError && (
                      <div className="text-xs text-red-300">{friendError}</div>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Level {level}</span>
                    <span>
                      {xpCurrent}/{xpMax} XP
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-800/70">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-200">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-semibold">Achievements</span>
                </div>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`rounded-lg p-4 border ${achievement.unlocked ? "border-blue-500/40 bg-blue-900/20" : "border-gray-700 bg-gray-800/40"}`}
                      >
                        <div
                          className={`text-sm ${achievement.unlocked ? "text-blue-300" : "text-gray-300"}`}
                        >
                          {achievement.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {achievement.unlocked ? "Unlocked" : "Locked"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {achievementsError || "No achievements to show yet"}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-200">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-sm font-semibold">Quick Stats</span>
                  </div>
                </div>
                {stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Games
                      </div>
                      <div className="text-lg font-semibold text-gray-100">
                        {gamesPlayed}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Wins
                      </div>
                      <div className="text-lg font-semibold text-green-400">
                        {wins}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Losses
                      </div>
                      <div className="text-lg font-semibold text-red-400">
                        {losses}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-gray-900/40 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400">
                        Win Rate
                      </div>
                      <div className="text-lg font-semibold text-blue-400">
                        {winRate}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {statsError || "No stats available"}
                  </div>
                )}
              </div>
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
                      {agarPlayersLoading && (
                        <tr className="text-gray-400">
                          <td className="px-3 py-3" colSpan={6}>
                            Loading history...
                          </td>
                        </tr>
                      )}
                      {!agarPlayersLoading && agarPlayersError && (
                        <tr className="text-red-300">
                          <td className="px-3 py-3" colSpan={6}>
                            {agarPlayersError}
                          </td>
                        </tr>
                      )}
                      {!agarPlayersLoading &&
                        !agarPlayersError &&
                        agarPlayers.length === 0 && (
                          <tr className="text-gray-400">
                            <td className="px-3 py-3" colSpan={6}>
                              No matches yet
                            </td>
                          </tr>
                        )}
                      {!agarPlayersLoading &&
                        !agarPlayersError &&
                        agarPlayers.map((p) => {
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
                                    {agarRoomLoading && (
                                      <div className="text-sm text-gray-400">
                                        Loading room history...
                                      </div>
                                    )}
                                    {!agarRoomLoading && agarRoomError && (
                                      <div className="text-sm text-red-300">
                                        {agarRoomError}
                                      </div>
                                    )}
                                    {!agarRoomLoading &&
                                      !agarRoomError &&
                                      selectedAgarRoom && (
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
                                              <tbody>
                                                <tr className="text-gray-200">
                                                  <td className="px-3 py-2">
                                                    {selectedAgarRoom.name}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {
                                                      selectedAgarRoom.visibility
                                                    }
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {selectedAgarRoom.isDefault
                                                      ? "Yes"
                                                      : "No"}
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {
                                                      selectedAgarRoom.playersCount
                                                    }
                                                  </td>
                                                  <td className="px-3 py-2">
                                                    {selectedAgarRoom.maxDurationMin ===
                                                    null
                                                      ? "—"
                                                      : `${selectedAgarRoom.maxDurationMin}m`}
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
                                            {agarLeaderboardLoading && (
                                              <div className="text-sm text-gray-400 mb-3">
                                                Loading leaderboard...
                                              </div>
                                            )}
                                            {!agarLeaderboardLoading &&
                                              agarLeaderboardError && (
                                                <div className="text-sm text-red-300 mb-3">
                                                  {agarLeaderboardError}
                                                </div>
                                              )}
                                            {!agarLeaderboardLoading &&
                                              !agarLeaderboardError && (
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
                                                          <tr key={p.id}>
                                                            <td className="px-3 py-2">
                                                              {p.type ===
                                                                "user" &&
                                                              p.trueName
                                                                ? p.trueName
                                                                : p.name}
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
                                                              {msToMinSec(
                                                                p.durationMs,
                                                              )}
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
                                              )}
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
