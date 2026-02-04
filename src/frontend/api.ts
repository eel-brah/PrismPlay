/* eslint-disable @typescript-eslint/no-explicit-any */

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

export type AgarioPlayerHistoryRecord = {
  id: number;
  roomId: number;
  userId: number | null;
  guestId: string | null;
  name: string;
  durationMs: number;
  maxMass: number;
  kills: number;
  rank: number | null;
  isWinner: boolean;
  createdAt: string;
  room: {
    id: number;
    name: string;
    startedAt: string;
    endedAt: string | null;
    visibility: string;
    isDefault: boolean;
  };
};

export type AgarioRoomHistoryLeaderboardEntry = {
  id: string | number;
  type: "user" | "guest";
  trueName: string | null;
  name: string;
  kills: number;
  maxMass: number;
  durationMs: number;
  rank: number;
  isWinner: boolean;
};

export type AgarioRoomHistory = {
  id: number;
  name: string;
  visibility: string;
  isDefault: boolean;
  startedAt: string;
  endedAt: string | null;
  createdBy?: {
    id: number;
    username: string;
    avatarUrl: string | null;
  } | null;
  leaderboard: AgarioRoomHistoryLeaderboardEntry[];
};

export type AgarioRoomLeaderboardEntry = {
  id: string;
  name: string;
  rank: number;
  kills: number;
  maxMass: number;
};

export type AgarioRoomLeaderboardResponse = {
  room: AgarioRoomHistory;
  leaderboard: AgarioRoomLeaderboardEntry[];
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

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

async function requestJson<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  const data = await readJson(res);

  if (!res.ok) {
    throw new Error((data as any)?.message ?? "Request failed");
  }

  return data as T;
}

export function apiRegister(username: string, email: string, password: string) {
  return requestJson<User>("/api/auth/sign_up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
}

export function apiLogin(email: string, password: string) {
  return requestJson<LoginResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function apiGetMe(token: string) {
  return requestJson<User>("/api/users/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiGetUserById(token: string, userId: string | number) {
  return requestJson<PublicUser>(`/api/users/${userId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiGetUserByUsername(token: string, username: string) {
  return requestJson<PublicUser>(
    `/api/users/username/${encodeURIComponent(username)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function apiUpdateMe(
  token: string,
  body: { username?: string; email?: string; password?: string },
) {
  return requestJson<User>("/api/users/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export function apiLogout(token: string) {
  return requestJson<{ message: string }>("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiGetMatchHistory(token: string, playerId: number) {
  return requestJson<MatchHistoryResponse>(
    `/api/pong/matchs/history/${playerId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function apiGetPlayerStats(token: string, playerId: number) {
  return requestJson<PlayerStats>(`/api/pong/matchs/stats/${playerId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiGetAchievements(token: string, playerId: number) {
  return requestJson<AchievementsResponse>(
    `/api/users/${playerId}/achievements`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function apiGetAgarioPlayerHistory(
  token: string,
  userId: number,
  take?: number,
  skip?: number,
) {
  const params = new URLSearchParams({ userId: String(userId) });
  if (typeof take === "number") params.set("take", String(take));
  if (typeof skip === "number") params.set("skip", String(skip));
  return requestJson<AgarioPlayerHistoryRecord[]>(
    `/api/agario/history/players?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function apiGetAgarioRoomHistory(token: string, roomId: number) {
  return requestJson<AgarioRoomHistory>(
    `/api/agario/history/rooms/${roomId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function apiGetAgarioRoomLeaderboard(token: string, roomId: number) {
  return requestJson<AgarioRoomLeaderboardResponse>(
    `/api/agario/history/rooms/${roomId}/leaderboard`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function apiListFriends(token: string) {
  return requestJson<FriendRow[]>("/api/friend/", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiIncomingRequests(token: string) {
  return requestJson<FriendRequest[]>("/api/friend/requests/incoming", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export function apiAcceptFriend(token: string, id: string){
  return requestJson<FriendRequest[]>(`/api/friend/requests/${id}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function apiDeclineFriend(token: string, id: string){
  return requestJson<FriendRequest[]>(`/api/friend/requests/${id}/decline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function apiRemoveFriend(token: string, id: string){
  return requestJson<FriendRequest[]>(`/api/friend/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

type PendingResponse = { pending: boolean };

export async function apiIsFrienddPending(token: string, id: number){
   const res = await requestJson<PendingResponse>(`/api/friend/requests/pending/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return !!res.pending;
}

export function apiAddFriend(token: string, username: string){
  // const obj = {username : user};
  return requestJson<FriendRequest[]>(`/api/friend/requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({username})
  });
}
export function apiUploadAvatar(token: string, file: File) {
  const form = new FormData();
  form.append("avatar", file);
  return requestJson("/api/users/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
}

export function apiPingMe(token: string) {
  return requestJson<{ ok: boolean; lastLogin: string | null }>(
    "/api/users/me/ping",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

