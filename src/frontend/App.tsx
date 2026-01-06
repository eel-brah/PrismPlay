// App.tsx
import React, { useState } from "react";
import Pong from "./component/Pong";
import LoginPage from "./component/LoginPage";
import LoginForm from "./component/LoginForm";
import RegisterForm from "./component/RegisterForm";
import SocialHub from "./component/SocialHub";
import PlayerProfile from "./component/PlayerProfile";
import { Route, Routes, Link } from "react-router-dom";
import Agario from "./component/Agario";
import OnlinePong from "./component/OnlinePong";

export default function App() {
  const [page, setPage] = useState<
    | "login"
    | "loginForm"
    | "register"
    | "gameSelect"
    | "landing"
    | "landingGuest"
    | "offline"
    | "online"
    | "tournament"
  >("login");
  const [sessionMode, setSessionMode] = useState<"guest" | "user" | null>(null);
  const isLogin = page === "login";
  const isLoginForm = page === "loginForm";
  const isRegister = page === "register";
  const isGameSelect = page === "gameSelect";
  const isLanding = page === "landing";
  const isLandingGuest = page === "landingGuest";
  const isOffline = page === "offline";
  const isOnline = page === "online";
  const [showSocial, setShowSocial] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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

  return (
    <Routes>
      <Route path="/agario" element={<Agario />} />

      <Route
        path="/"
        element={
          <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Login View */}
            <div
              className={`absolute inset-0 flex items-center justify-center page-transition ${
                isLogin ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isLogin}
            >
              <LoginPage
                onContinue={(mode) => {
                  if (mode === "login") {
                    setSessionMode(null);
                    setPage("loginForm");
                  } else {
                    setSessionMode("guest");
                    setPage("gameSelect");
                  }
                }}
              />
            </div>

            {/* Login Form View */}
            <div
              className={`absolute inset-0 flex items-center justify-center page-transition ${
                isLoginForm ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isLoginForm}
            >
              <LoginForm
                onSubmit={() => {
                  // Frontend-only: after "login" just go to landing
                  setSessionMode("user");
                  setPage("gameSelect");
                }}
                onReturn={() => setPage("login")}
                onRegister={() => setPage("register")}
              />
            </div>

            {/* Register View */}
            <div
              className={`absolute inset-0 flex items-center justify-center page-transition ${
                isRegister ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isRegister}
            >
              <RegisterForm
                onSubmit={() => {
                  // Frontend-only: after "register" go to landing
                  setSessionMode("user");
                  setPage("gameSelect");
                }}
                onReturn={() => setPage("loginForm")}
              />
            </div>

            <div
              className={`absolute inset-0 flex flex-col items-center justify-center p-8 page-transition ${
                isGameSelect ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isGameSelect}
            >
              <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button
                  onClick={() => setPage("login")}
                  className="bg-gray-800/80 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Return
                </button>
              </div>
              <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Choose Your Game
              </h1>
              <p className="text-gray-300 mb-8">Select which game you want to play</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-700/40 border border-purple-500/50 flex items-center justify-center">
                      <span className="text-2xl">🏓</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-purple-400">PingPong Craft</h2>
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
                    onClick={() => setPage(sessionMode === "guest" ? "landingGuest" : "landing")}
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
                      <h2 className="text-xl font-semibold text-blue-400">Agar.io Style</h2>
                      <p className="text-gray-300">Eat to grow, avoid being eaten!</p>
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

            {/* Landing View */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center p-8 page-transition ${
                isLanding ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isLanding}
            >
              {/* Top-right controls */}
              <div className="absolute top-4 right-4 z-50 flex gap-2">
                {sessionMode === "user" && (
                  <button
                    onClick={() => {
                      setShowSocial(true);
                      setShowProfile(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    Social
                  </button>
                )}
                {sessionMode === "user" && (
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setShowSocial(false);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    Profile
                  </button>
                )}
                <button
                  onClick={() => setPage("login")}
                  className="bg-gray-800/80 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Return
                </button>
              </div>
              <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Select Game Mode
              </h1>
              <p className="text-gray-300 mb-8">Choose how you want to play</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                {/* Offline Mode */}
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
                    onClick={() => setPage("offline")}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                  >
                    Play Offline
                  </button>
                </div>

                {/* Online Mode */}
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
                    onClick={() => setPage("online")}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                  >
                    Play Online
                  </button>
                </div>

                {/* Tournament */}
                <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                  <h2 className="text-xl font-semibold text-purple-400 mb-2">
                    Tournament
                  </h2>
                  <p className="text-gray-300 mb-4">Bracketed competition</p>
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

            {/* Social Hub Overlay – only for logged-in users */}
            {sessionMode === "user" && (
              <div
                className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[clamp(520px,40vw,900px)] border-l border-gray-700 shadow-2xl page-transition ${
                  showSocial ? "page-shown pointer-events-auto" : "page-hidden"
                }`}
                aria-hidden={!showSocial}
              >
                <SocialHub onClose={() => setShowSocial(false)} />
              </div>
            )}

            {sessionMode === "user" && (
              <div
                className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[clamp(520px,40vw,900px)] border-l border-gray-700 shadow-2xl page-transition ${
                  showProfile ? "page-shown pointer-events-auto" : "page-hidden"
                }`}
                aria-hidden={!showProfile}
              >
                <PlayerProfile onClose={() => setShowProfile(false)} />
              </div>
            )}

            {/* Guest Landing View (Offline-only) */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center p-8 page-transition ${
                isLandingGuest
                  ? "page-shown pointer-events-auto"
                  : "page-hidden"
              }`}
              aria-hidden={!isLandingGuest}
            >
              {/* Return to Login */}
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setPage("login")}
                  className="bg-gray-800/80 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Return
                </button>
              </div>
              <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Guest Mode
              </h1>
              <p className="text-gray-300 mb-8">
                Only offline mode is available
              </p>

              <div className="grid grid-cols-1 gap-6 w-full max-w-3xl">
                {/* Offline Mode Only */}
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
                    onClick={() => setPage("offline")}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                  >
                    Play Offline
                  </button>
                </div>
              </div>
            </div>

            {/* Offline View */}
            <div
              className={`absolute inset-0 flex items-center justify-center p-8 page-transition ${
                isOffline ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isOffline}
            >
              <Pong
                onReturn={() =>
                  setPage(sessionMode === "guest" ? "landingGuest" : "landing")
                }
              />
            </div>
            {/* Online View */}
            <div
              className={`absolute inset-0 flex items-center justify-center p-8 page-transition ${
                isOnline ? "page-shown pointer-events-auto" : "page-hidden"
              }`}
              aria-hidden={!isOnline}
            >
              {isOnline && (
                <OnlinePong
                  profile={onlineProfile}
                  onReturn={() =>
                    setPage(
                      sessionMode === "guest" ? "landingGuest" : "landing"
                    )
                  }
                />
              )}
            </div>
          </div>
        }
      />
    </Routes>
  );
}
