/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Trophy, Gamepad2, BarChart3 } from "lucide-react";
import ErrorPage from "./ErrorPage";
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
  type MatchHistoryItem,
  type PlayerStats,
  type PublicUser,
  type User,
  apiAcceptFriend,
  apiDeclineFriend,
} from "../api";
import {
  FinalLeaderboardEntry,
  GetRoomHistoryDbReturn,
  PlayerHistoryWithRoom,
  RoomHistoryItem,
  RoomLeaderboardEntry,
} from "src/shared/agario/types";
import ProfileHistorySection from "./GamesHistory";

type Tab = "profile" | "history";

export type AgarPlayerHistoryRow = {
  id: number;
  name: string;
  durationMs: number;
  kills: number;
  maxMass: number;
  rank: number | null;
  roomId: number;
  roomName: string;
};

function mapAgarPlayerRows(
  records: PlayerHistoryWithRoom[],
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
  room: GetRoomHistoryDbReturn,
): RoomHistoryItem {
  const leaderboard = room.leaderboard.map((entry) => ({
    id: entry.id,
    type: entry.type,
    trueName: entry.trueName,
    name: entry.name,
    rank: entry.rank,
    kills: entry.kills,
    maxMass: entry.maxMass,
    durationMs: entry.durationMs,
    isWinner: entry.isWinner,
    user: entry.user,
    guest: entry.guest,
    createdAt: entry.createdAt,
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
    startedAt: room.startedAt,
    endedAt: room.endedAt ?? null,
    playersCount: leaderboard.length,
    createdBy: room.createdBy,
    winner: winner
      ? {
        id: winner.id,
        type: winner.type,
        name: winner.name,
        trueName: winner.trueName,
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
  entries: FinalLeaderboardEntry[],
  roomLeaderboard?: RoomHistoryItem["leaderboard"],
): RoomLeaderboardEntry[] {
  return entries.flatMap((entry) => {
    const rawId = entry.id;
    const match = roomLeaderboard?.find((p) => String(p.id) === String(rawId));

    if (!match) return [];

    return [
      {
        id: rawId,
        type: match.type,
        trueName: match.trueName,
        name: entry.name,

        rank: entry.rank,
        kills: entry.kills,
        maxMass: entry.maxMass,
        durationMs: match.durationMs ?? 0,
        isWinner: match.isWinner ?? false,

        user: match.user ?? null,
        guest: match.guest ?? null,

        createdAt: match.createdAt,
      },
    ];
  });
}

function triggerToast(message: string) {
  window.dispatchEvent(new CustomEvent("app_toast", { detail: message }));
}

export default function PlayerProfile() {
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<User | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
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
  const [agarPlayersFetched, setAgarPlayersFetched] = useState(false);
  const [agarRoomsById, setAgarRoomsById] = useState<
    Record<number, RoomHistoryItem>
  >({});
  const [agarLeaderboardByRoomId, setAgarLeaderboardByRoomId] = useState<
    Record<number, RoomHistoryItem["leaderboard"]>
  >({});
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
  };
  const saveProfile = async () => {
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
        const message = e?.message ?? "Update failed";
        setEditErrorForm(message);
        triggerToast(message);
        setIsEditing(true);
        return;
      }
    }
    if (editAvatarFile) {
      try {
        await apiUploadAvatar(token, editAvatarFile);
      } catch (e: any) {
        const message = e?.message ?? "Update failed";
        setEditError(message);
        triggerToast(message);
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
          const message =
            err instanceof Error ? err.message : "Failed to load match history";
          setHistoryError(message);
          triggerToast(message);
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
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) {
            setAgarPlayers([]);
          }
          return;
        }
        const data = await apiGetAgarioPlayerHistory(token, user.id);
        if (!cancelled) {
          setAgarPlayers(mapAgarPlayerRows(data));
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load Agar.io match history";
        triggerToast(message);
      } finally {
        if (!cancelled) {
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
      try {
        const token = getStoredToken();
        if (!token) {
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
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load Agar.io room history";
        triggerToast(message);
      } finally {
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
      try {
        const token = getStoredToken();
        if (!token) {
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
        const message =
          err instanceof Error ? err.message : "Failed to load leaderboard";
        triggerToast(message);
      } finally {
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

      try {
        const token = getStoredToken();
        if (!token) throw new Error("Not authenticated");

        const me = await apiGetMe(token);
        if (!cancelled) setUser(me);
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Failed to load profile";
          triggerToast(message);
        }
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
    setAgarPlayersFetched(false);
    setAgarRoomsById({});
    setAgarLeaderboardByRoomId({});
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
          const message = e instanceof Error ? e.message : "Failed to load stats";
          setStatsError(message);
          triggerToast(message);
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
          const message =
            e instanceof Error ? e.message : "Failed to load achievements";
          setAchievementsError(message);
          triggerToast(message);
        }
      }
    };

    void loadAchievements();
    return () => {
      cancelled = true;
    };
  }, [user]);
  if (meLoading) return <div></div>;
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
                className={`px-4 py-1 rounded-full text-sm transition-colors ${tab === t
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
        <ProfileHistorySection
          historyMode={historyMode}
          setHistoryMode={setHistoryMode}

          history={history}
          loading={historyLoading}
          error={historyError}

          players={agarPlayers}
          selectedId={selectedAgarPlayerId}
          setSelectedId={setSelectedAgarPlayerId}
          selectedRoom={selectedAgarRoom}
          showLeaderboard={showAgarLeaderboard}
          setShowLeaderboard={setShowAgarLeaderboard}
        />
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
  const [agarPlayersFetched, setAgarPlayersFetched] = useState(false);
  const [agarRoomsById, setAgarRoomsById] = useState<
    Record<number, RoomHistoryItem>
  >({});
  const [agarLeaderboardByRoomId, setAgarLeaderboardByRoomId] = useState<
    Record<number, RoomHistoryItem["leaderboard"]>
  >({});
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
      const message =
        e instanceof Error ? e.message : "Failed to accept request";
      setFriendError(message);
      triggerToast(message);
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
      const message =
        e instanceof Error ? e.message : "Failed to decline request";
      setFriendError(message);
      triggerToast(message);
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
            const message =
              e instanceof Error ? e.message : "Failed to load stats";
            setStatsError(message);
            triggerToast(message);
          }
        }
        try {
          const nextAchievements = await apiGetAchievements(token, profile.id);
          if (!cancelled) setAchievements(nextAchievements.achievements ?? []);
        } catch (e) {
          if (!cancelled) {
            const message =
              e instanceof Error ? e.message : "Failed to load achievements";
            setAchievementsError(message);
            triggerToast(message);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const status = (e as any)?.response?.status;
          if (status === 404) {
            setNotFound(true);
            setError("");
            setUser(null);
          } else {
            const message =
              e instanceof Error ? e.message : "Failed to load profile";
            setError(message);
            triggerToast(message);
          }
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
    setAgarPlayersFetched(false);
    setAgarRoomsById({});
    setAgarLeaderboardByRoomId({});
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
          const message =
            err instanceof Error ? err.message : "Failed to load match history";
          setHistoryError(message);
          triggerToast(message);
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
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) {
            setAgarPlayers([]);
          }
          return;
        }
        const data = await apiGetAgarioPlayerHistory(token, user.id);
        if (!cancelled) {
          setAgarPlayers(mapAgarPlayerRows(data));
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load Agar.io match history";
        triggerToast(message);
      } finally {
        if (!cancelled) {
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
      try {
        const token = getStoredToken();
        if (!token) {
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
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load Agar.io room history";
        triggerToast(message);
      } finally {
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
      try {
        const token = getStoredToken();
        if (!token) {
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
        const message =
          err instanceof Error ? err.message : "Failed to load leaderboard";
        triggerToast(message);
      } finally {
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
          const message =
            e instanceof Error ? e.message : "Failed to load friend status";
          setFriendError(message);
          triggerToast(message);
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

  if (loading) return <div></div>;
  if (notFound)
    return <ErrorPage code={404} title="Not Found" message={`User "${username ?? ""}" was not found.`} />;
  if (error) return <div>{error}</div>;
  if (!user)
    return <ErrorPage code={404} title="Not Found" message={`User "${username ?? ""}" was not found.`} />;

  const gamesPlayed = stats?.totalGames ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winRate = stats?.winrate ?? 0;
  const xpTotal = wins * 3 + losses;
  const xpMax = 100;
  const level = Math.max(1, Math.floor(xpTotal / xpMax) + 1);
  const xpCurrent = xpTotal % xpMax;
  const xpPercent = Math.min(100, Math.round((xpCurrent / xpMax) * 100));
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
        triggerToast("Friend request already pending.");
        return;
      }
      setFriendError(message);
      triggerToast(message);
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
                className={`px-4 py-1 rounded-full text-sm transition-colors ${tab === t
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
        <ProfileHistorySection
          historyMode={historyMode}
          setHistoryMode={setHistoryMode}

          history={history}
          loading={historyLoading}
          error={historyError}

          players={agarPlayers}
          selectedId={selectedAgarPlayerId}
          setSelectedId={setSelectedAgarPlayerId}
          selectedRoom={selectedAgarRoom}
          showLeaderboard={showAgarLeaderboard}
          setShowLeaderboard={setShowAgarLeaderboard}
        />
      )}
    </div>
  );
}
