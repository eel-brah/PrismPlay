// App.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import Pong from "./component/pong/pong";
import LoginForm from "./component/LoginForm";
import RegisterForm from "./component/RegisterForm";
import HomePage from "./component/HomePage";
import SocialHub from "./component/SocialHub";
import GamePage from "./component/GamePage";
import ErrorPage from "./component/ErrorPage";
import axios from "axios";
import PlayerProfile, { PublicPlayerProfile } from "./component/PlayerProfile";
import {
  Route,
  Routes,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Agario from "./component/Agario";
import OnlinePong from "./component/OnlinePong";
import {
  apiGetMe,
  apiLogin,
  apiLogout,
  apiRegister,
  getStoredToken,
  storeToken,
  clearToken,
  apiPingMe,
  TOKEN_KEY,
} from "./api";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  // const [sessionMode, setSessionMode] = useState<"guest" | "user">("guest");
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [bootingAuth, setBootingAuth] = useState(true);
  const [user, setUser] = useState<{
    id: number;
    username: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);

  //CHECK TOKEN IF VALID
  const isAuthed = !bootingAuth && !!token;

  function saveProfileDataForPlayerProfile(user: {
    username: string;
    email: string;
    avatarUrl?: string | null;
  }) {
    const raw = localStorage.getItem("profile_data");
    let previous: any = {};
    try {
      previous = raw ? JSON.parse(raw) : {};
    } catch {}

    const next = {
      ...previous,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? previous.avatarUrl ?? "",
    };

    localStorage.setItem("profile_data", JSON.stringify(next));
  }

  useEffect(() => {
    if (!token) return;

    const ping = async () => {
      try {
        await apiPingMe(token);
      } catch {}
    };

    ping();

    const id = window.setInterval(ping, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    window.addEventListener("focus", ping);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", ping);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  useEffect(() => {
    async function boot() {
      const saved = getStoredToken();

      if (!saved) {
        setBootingAuth(false);
        return;
      }

      try {
        const me = await apiGetMe(saved);
        setToken(saved);
        setUser(me); // Store user data
        saveProfileDataForPlayerProfile(me);
      } catch (e: any) {
        // token expired/invalid
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        if (status === 401 || status === 403) {
          clearToken();
          setToken(null);
          setUser(null);
        }
        // clearToken();
        // setToken(null);
        // console.log("has been caled ", e);

        // setSessionMode("guest");
      } finally {
        setBootingAuth(false);
      }
    }

    boot();
  }, []);

  async function handleLogin(email: string, password: string) {
    const data = await apiLogin(email, password);

    storeToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    // setSessionMode("user");
    saveProfileDataForPlayerProfile(data.user);

    navigate("/games");
  }

  async function handleRegister(
    username: string,
    email: string,
    password: string,
  ) {
    await apiRegister(username, email, password);
    await handleLogin(email, password); // auto login
  }

  async function handleLogout() {
    const current = token ?? getStoredToken();

    if (current) {
      try {
        await apiLogout(current);
      } catch {}
    }

    clearToken();
    setToken(null);
    setUser(null);
    // setSessionMode("guest");
    navigate("/home");
  }

  const hideTopBar =
    location.pathname === "/register" ||
    location.pathname.startsWith("/login") ||
    location.pathname === "/agario" ||
    location.pathname === "/offline" ||
    location.pathname === "/online";
  const showTopBar = !hideTopBar;
  const topPaddingClass = showTopBar ? "pt-16" : "";
  const minimalTopBar =
    location.pathname === "/offline" || location.pathname === "/online";
  const activeSection =
    location.pathname === "/home"
      ? "home"
      : location.pathname === "/games" ||
          location.pathname === "/landing" ||
          location.pathname === "/guest" ||
          location.pathname === "/offline" ||
          location.pathname === "/online" ||
          location.pathname === "/agario"
        ? "games"
        : location.pathname.startsWith("/social")
          ? "social"
          : location.pathname.startsWith("/profile")
            ? "profile"
            : "none";
  const isHome = location.pathname === "/home";
  const returnLabel = isHome ? (isAuthed ? "Log Out" : "Log In") : "Return";

  const handleReturnClick = () => {
    if (isHome) {
      if (isAuthed) {
        void handleLogout();
      } else {
        navigate("/login/form");
      }
      return;
    }
    handleReturn();
  };

  const handleReturn = () => {
    if (globalThis.history.length > 1) {
      if (
        location.pathname.startsWith("/login") ||
        location.pathname === "/register"
      ) {
        navigate("/home", { replace: true });
        return;
      }
      navigate(-1);
      return;
    }
    navigate("/games");
  };

  return (
    <>
      {showTopBar && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <div className="bg-gray-950/50 backdrop-blur-md border-b border-white/10">
            <div className="mx-auto max-w-6xl px-4">
              <div className="h-16 flex items-center justify-between">
                <div className="w-24" />
                <div className="flex-1 flex items-center justify-center gap-2">
                  {!minimalTopBar && (
                    <>
                      <button
                        onClick={() => navigate("/home")}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                          activeSection === "home"
                            ? "text-green-400 bg-white/5"
                            : "text-gray-200 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Home
                      </button>
                      <button
                        onClick={() => navigate("/games")}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                          activeSection === "games"
                            ? "text-green-400 bg-white/5"
                            : "text-gray-200 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Games
                      </button>
                      {isAuthed && (
                        <button
                          onClick={() => navigate("/social")}
                          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                            activeSection === "social"
                              ? "text-green-400 bg-white/5"
                              : "text-gray-200 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Social
                        </button>
                      )}
                      {isAuthed && (
                        <button
                          onClick={() => navigate("/profile")}
                          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                            activeSection === "profile"
                              ? "text-green-400 bg-white/5"
                              : "text-gray-200 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Profile
                        </button>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={handleReturnClick}
                  className="px-4 py-2 rounded-md text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {returnLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/home"
          element={
            <div
              className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${topPaddingClass} flex items-center justify-center`}
            >
              <HomePage
                onPlay={() => navigate("/games")}
                onLogin={() => navigate("/login/form")}
                onLogout={() => void handleLogout()}
                loggedIn={isAuthed}
              />
            </div>
          }
        />
        <Route
          path="/agario"
          element={
            <div className={`${topPaddingClass} min-h-screen overflow-y-auto`}>
              <Agario />
            </div>
          }
        />

        <Route path="/login" element={<Navigate to="/login/form" replace />} />
        <Route
          path="/login/form"
          element={
            <div className="relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
              <LoginForm
                onSubmit={handleLogin}
                onRegister={() => navigate("/register")}
              />
            </div>
          }
        />
        <Route
          path="/register"
          element={
            <div className="relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
              <RegisterForm onSubmit={handleRegister} />
            </div>
          }
        />
        <Route
          path="/games"
          element={
            <div
              className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center ${topPaddingClass}`}
            >
              <div className="flex flex-col items-center justify-center p-8">
                <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Choose Your Game
                </h1>
                <p className="text-gray-300 mb-8">
                  Select which game you want to play
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-purple-700/40 border border-purple-500/50 flex items-center justify-center">
                        <span className="text-2xl">🏓</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-purple-400">
                          PingPong Craft
                        </h2>
                        <p className="text-gray-300">
                          Classic arcade ping pong
                        </p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-400 mb-6 space-y-1">
                      <li>• Multiple game modes</li>
                      <li>• Character customization</li>
                      <li>• Real-time gameplay</li>
                      <li>• Track your stats</li>
                    </ul>
                    <button
                      onClick={() =>
                        navigate(!isAuthed ? "/guest" : "/landing")
                      }
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                    >
                      Play Pong
                    </button>
                  </div>
                  <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-blue-700/40 border border-blue-500/50 flex items-center justify-center">
                        <span className="text-2xl">🔵</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-blue-400">
                          Agar.io Style
                        </h2>
                        <p className="text-gray-300">
                          Eat to grow, avoid being eaten!
                        </p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-400 mb-6 space-y-1">
                      <li>• Grow by eating pellets</li>
                      <li>• Avoid larger players</li>
                      <li>• Split mechanics</li>
                      <li>• Compete for high score</li>
                    </ul>
                    <Link
                      to="/agario"
                      className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg text-center"
                    >
                      Play Agar.io
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="/landing"
          element={
            isAuthed ? (
              <div
                className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center ${topPaddingClass}`}
              >
                <div className="flex flex-col items-center justify-center p-8">
                  <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Select Game Mode
                  </h1>
                  <p className="text-gray-300 mb-8">
                    Choose how you want to play
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                      <h2 className="text-xl font-semibold text-green-400 mb-2">
                        Offline Mode
                      </h2>
                      <p className="text-gray-300 mb-4">
                        Play against AI opponent
                      </p>
                      <ul className="text-sm text-gray-400 mb-6 space-y-1">
                        <li>• Practice your skills</li>
                        <li>• Adjustable AI difficulty</li>
                        <li>• No internet required</li>
                      </ul>
                      <button
                        onClick={() => navigate("/offline")}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                      >
                        Play Offline
                      </button>
                    </div>
                    <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                      <h2 className="text-xl font-semibold text-blue-400 mb-2">
                        Online Mode
                      </h2>
                      <p className="text-gray-300 mb-4">
                        1v1 against random players
                      </p>
                      <ul className="text-sm text-gray-400 mb-6 space-y-1">
                        <li>• Quick matchmaking</li>
                        <li>• Competitive ranking</li>
                        <li>• Real-time gameplay</li>
                      </ul>
                      <button
                        onClick={() => navigate("/online")}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                      >
                        Play Online
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/guest" replace />
            )
          }
        />
        <Route
          path="/social"
          element={
            bootingAuth ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                Loading...
              </div>
            ) : isAuthed ? (
              <div
                className={`relative h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${topPaddingClass}`}
              >
                <SocialHub />
              </div>
            ) : (
              <Navigate to="/login/form" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            bootingAuth ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                Loading...
              </div>
            ) : isAuthed ? (
              <div
                className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${topPaddingClass}`}
              >
                <PlayerProfile />
              </div>
            ) : (
              <Navigate to="/login/form" replace />
            )
          }
        />
        <Route
          path="/profile/:username"
          element={
            bootingAuth ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                Loading...
              </div>
            ) : isAuthed ? (
              <div
                className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${topPaddingClass}`}
              >
                <PublicPlayerProfile />
              </div>
            ) : (
              <Navigate to="/login/form" replace />
            )
          }
        />
        <Route
          path="/guest"
          element={
            <div
              className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center ${topPaddingClass}`}
            >
              <div className="flex flex-col items-center justify-center p-8">
                <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Guest Mode
                </h1>
                <p className="text-gray-300 mb-8">
                  Only offline mode is available
                </p>
                <div className="grid grid-cols-1 gap-6 w-full max-w-3xl">
                  <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                    <h2 className="text-xl font-semibold text-green-400 mb-2">
                      Offline Mode
                    </h2>
                    <p className="text-gray-300 mb-4">
                      Play against AI opponent
                    </p>
                    <ul className="text-sm text-gray-400 mb-6 space-y-1">
                      <li>• Practice your skills</li>
                      <li>• Adjustable AI difficulty</li>
                      <li>• No internet required</li>
                    </ul>
                    <button
                      onClick={() => navigate("/offline")}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                    >
                      Play Offline
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="/offline"
          element={
            <div
              className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8 ${topPaddingClass}`}
            >
              <Pong onReturn={handleReturn} />
            </div>
          }
        />
        <Route
          path="/online"
          element={
            bootingAuth ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                Loading...
              </div>
            ) : isAuthed && user && token ? (
              <div
                className={`relative min-h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8 ${topPaddingClass}`}
              >
                <OnlinePong token={token} onReturn={handleReturn} />
              </div>
            ) : (
              <Navigate to="/login/form" replace />
            )
          }
        />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route
          path="*"
          element={<ErrorPage code = {404} title="Not Found" message="That page doesn't exist." />}
        />
      </Routes>
    </>
  );
}
