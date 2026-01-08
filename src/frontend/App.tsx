// App.tsx
import React, { useState } from "react";
import Pong from "./component/Pong";
import LoginForm from "./component/LoginForm";
import RegisterForm from "./component/RegisterForm";
import HomePage from "./component/HomePage";
import SocialHub from "./component/SocialHub";
import PlayerProfile from "./component/PlayerProfile";
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

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionMode, setSessionMode] = useState<"guest" | "user">("guest");
  const getUUID = () =>
    globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

  const [profileId] = useState(() => {
    const key = "pong_profile_id";
    const id = sessionStorage.getItem(key) ?? getUUID();
    sessionStorage.setItem(key, id);
    return id;
  });

  const onlineProfile = {
    id: profileId,
    nickname:
      sessionMode === "user"
        ? `User-${profileId.slice(0, 4)}`
        : `Guest-${profileId.slice(0, 4)}`,
  };

  const hideTopBar =
    location.pathname === "/register" || location.pathname.startsWith("/login");
  const showTopBar = !hideTopBar;
  const topPaddingClass = showTopBar ? "pt-16" : "";
  const activeSection = location.pathname === "/home"
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

  const handleReturn = () => {
    if (globalThis.history.length > 1) {
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
                  {sessionMode === "user" && (
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
                  {sessionMode === "user" && (
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
                </div>
                <button
                  onClick={handleReturn}
                  className="px-4 py-2 rounded-md text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Return
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
              className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${topPaddingClass} flex items-center justify-center`}
            >
              <HomePage
                onPlay={() => navigate("/games")}
                onLogin={() => navigate("/login/form")}
                onLogout={() => {
                  setSessionMode("guest");
                  navigate("/home");
                }}
                loggedIn={sessionMode === "user"}
              />
            </div>
          }
        />
        <Route
          path="/agario"
          element={
            <div className={topPaddingClass}>
              <Agario />
            </div>
          }
        />

        <Route path="/login" element={<Navigate to="/login/form" replace />} />
        <Route
          path="/login/form"
          element={
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
              <LoginForm
                onSubmit={() => {
                  setSessionMode("user");
                  navigate("/games");
                }}
                onRegister={() => navigate("/register")}
              />
            </div>
          }
        />
        <Route
          path="/register"
          element={
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
              <RegisterForm
                onSubmit={() => {
                  setSessionMode("user");
                  navigate("/games");
                }}
              />
            </div>
          }
        />
        <Route
          path="/games"
          element={
            <div
              className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center ${topPaddingClass}`}
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
                        <p className="text-gray-300">Classic arcade ping pong</p>
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
                        navigate(sessionMode === "guest" ? "/guest" : "/landing")
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
            sessionMode === "user" ? (
              <div
                className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center ${topPaddingClass}`}
              >
                <div className="flex flex-col items-center justify-center p-8">
                  <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Select Game Mode
                  </h1>
                  <p className="text-gray-300 mb-8">
                    Choose how you want to play
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
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
                    <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                      <h2 className="text-xl font-semibold text-purple-400 mb-2">
                        Tournament
                      </h2>
                      <p className="text-gray-300 mb-4">
                        Bracketed competition
                      </p>
                      <ul className="text-sm text-gray-400 mb-6 space-y-1">
                        <li>• Private rooms</li>
                        <li>• Custom settings</li>
                        <li>• Spectator mode</li>
                      </ul>
                      <button
                        disabled
                        className="w-full bg-gray-700 text-gray-400 py-3 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Coming Soon
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
            sessionMode === "user" ? (
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
            sessionMode === "user" ? (
              <div
                className={`relative h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${topPaddingClass}`}
              >
                <PlayerProfile />
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
              className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center ${topPaddingClass}`}
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
                    <p className="text-gray-300 mb-4">Play against AI opponent</p>
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
              className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8 ${topPaddingClass}`}
            >
              <Pong />
            </div>
          }
        />
        <Route
          path="/online"
          element={
            sessionMode === "user" ? (
              <div
                className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8 ${topPaddingClass}`}
              >
                <OnlinePong profile={onlineProfile} />
              </div>
            ) : (
              <Navigate to="/guest" replace />
            )
          }
        />
      </Routes>
    </>
  );
}
