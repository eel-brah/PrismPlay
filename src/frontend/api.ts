/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { GUEST_ID } from "../shared/agario/config";
import {
  FinalLeaderboardEntry,
  GetRoomHistoryDbReturn,
  PlayerHistoryWithRoom,
} from "src/shared/agario/types";

const api = axios.create({
  baseURL: "/api",
  timeout: 10_000,
});

const withAuth = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const TOKEN_KEY = "accessToken";

export type User = {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  lastLogin: string | null;
  avatarUrl: string | null;
};

export type PublicUser = {
  id: number;
  username: string;
  createdAt: string;
  lastLogin: string | null;
  avatarUrl: string | null;
};

export type FriendRow = {
  createdAt: string;
  friend: User;
};

export type FriendRequest = {
  id: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  sentAt: string;
  fromUser: User;
  toUser: User;
};
export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type MatchHistoryItem = {
  id: number;
  opponentName: string;
  result: "win" | "lose";
  score: string;
  date: string;
};

export type MatchHistoryResponse = {
  history: MatchHistoryItem[];
};

export type PlayerStats = {
  wins: number;
  losses: number;
  totalGames: number;
  winrate: number;
};

export type Achievement = {
  id: string;
  name: string;
  unlocked: boolean;
};

export type AchievementsResponse = {
  achievements: Achievement[];
};

export type AgarioRoomLeaderboardResponse = {
  room: GetRoomHistoryDbReturn;
  leaderboard: FinalLeaderboardEntry[];
};

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  console.log("has been called ");
}

// AUTH
export async function apiRegister(
  username: string,
  email: string,
  password: string,
) {
  const guestId = localStorage.getItem(GUEST_ID);
  try {
    const res = await api.post<User>("/auth/sign_up", {
      username,
      email,
      password,
      guestId,
    });
    return res.data;
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      const serverMsg = (e.response?.data as any)?.message;
      throw new Error(serverMsg ?? e.message ?? "Register failed");
    }
    throw new Error("Register failed");
  }
}

export async function apiLogin(email: string, password: string) {
  try {
    const res = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return res.data;
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      const serverMsg = (e.response?.data as any)?.message;
      throw new Error(serverMsg ?? e.message ?? "Login failed");
    }
    throw new Error("Login failed");
  }
}

export async function apiLogout(token: string) {
  const res = await api.post<{ message: string }>(
    "/auth/logout",
    {},
    withAuth(token),
  );
  return res.data;
}

// USERS
export async function apiGetMe(token: string) {
  const res = await api.get<User>("/users/me", withAuth(token));
  return res.data;
}

export async function apiGetUserById(token: string, userId: string | number) {
  const res = await api.get<PublicUser>(`/users/${userId}`, withAuth(token));
  return res.data;
}

export async function apiGetUserByUsername(token: string, username: string) {
  const res = await api.get<PublicUser>(
    `/users/username/${encodeURIComponent(username)}`,
    withAuth(token),
  );
  return res.data;
}

export async function apiUpdateMe(
  token: string,
  body: { username?: string; email?: string; password?: string },
) {
  const res = await api.patch<User>("/users/me", body, withAuth(token));
  return res.data;
}

export async function apiUploadAvatar(token: string, file: File) {
  const form = new FormData();
  form.append("avatar", file);

  const res = await api.post("/users/avatar", form, withAuth(token));
  return res.data;
}

// PONG
export async function apiGetMatchHistory(token: string, playerId: number) {
  const res = await api.get<MatchHistoryResponse>(
    `/pong/matchs/history/${playerId}`,
    withAuth(token),
  );
  return res.data;
}

export async function apiGetPlayerStats(token: string, playerId: number) {
  const res = await api.get<PlayerStats>(
    `/pong/matchs/stats/${playerId}`,
    withAuth(token),
  );
  return res.data;
}

// ACHIEVEMENTS
export async function apiGetAchievements(token: string, playerId: number) {
  const res = await api.get<AchievementsResponse>(
    `/users/${playerId}/achievements`,
    withAuth(token),
  );
  return res.data;
}

// AGARIO
export async function apiGetAgarioPlayerHistory(
  token: string,
  userId: number,
  take?: number,
  skip?: number,
) {
  const params = new URLSearchParams({ userId: String(userId) });
  if (typeof take === "number") params.set("take", String(take));
  if (typeof skip === "number") params.set("skip", String(skip));

  const res = await api.get<PlayerHistoryWithRoom[]>(
    `/agario/history/players?${params.toString()}`,
    withAuth(token),
  );
  return res.data;
}

export async function apiGetAgarioRoomHistory(token: string, roomId: number) {
  const res = await api.get<GetRoomHistoryDbReturn>(
    `/agario/history/rooms/${roomId}`,
    withAuth(token),
  );
  return res.data;
}

export async function apiGetAgarioRoomLeaderboard(
  token: string,
  roomId: number,
) {
  const res = await api.get<AgarioRoomLeaderboardResponse>(
    `/agario/history/rooms/${roomId}/leaderboard`,
    withAuth(token),
  );
  return res.data;
}

// FRIENDS
export async function apiListFriends(token: string) {
  const res = await api.get<FriendRow[]>("/friend/", withAuth(token));
  return res.data;
}

export async function apiIncomingRequests(token: string) {
  const res = await api.get<FriendRequest[]>(
    "/friend/requests/incoming",
    withAuth(token),
  );
  return res.data;
}

export async function apiAcceptFriend(token: string, id: string) {
  const res = await api.post<FriendRequest[]>(
    `/friend/requests/${id}/accept`,
    {},
    withAuth(token),
  );
  return res.data;
}

export async function apiDeclineFriend(token: string, id: string) {
  const res = await api.post<FriendRequest[]>(
    `/friend/requests/${id}/decline`,
    {},
    withAuth(token),
  );
  return res.data;
}

export async function apiRemoveFriend(token: string, id: string) {
  const res = await api.delete<FriendRequest[]>(
    `/friend/${id}`,
    withAuth(token),
  );
  return res.data;
}

type PendingResponse = { pending: boolean };

export async function apiIsFrienddPending(token: string, id: number) {
  const res = await api.get<PendingResponse>(
    `/friend/requests/pending/${id}`,
    withAuth(token),
  );
  return !!res.data.pending;
}

export async function apiAddFriend(token: string, username: string) {
  const res = await api.post<FriendRequest[]>(
    "/friend/requests",
    { username },
    withAuth(token),
  );
  return res.data;
}

// PING
export async function apiPingMe(token: string) {
  const res = await api.post<{ ok: boolean; lastLogin: string | null }>(
    "/users/me/ping",
    {},
    withAuth(token),
  );
  return res.data;
}
