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

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  console.log("has been called ")
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

export function apiUpdateMe(
  token: string,
  body: { username?: string; email?: string; password?: string }
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
