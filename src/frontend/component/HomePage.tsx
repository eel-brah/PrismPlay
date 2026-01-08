import React from "react";

type HomePageProps = {
  onPlay: () => void;
  onLogin: () => void;
  onLogout: () => void;
  loggedIn: boolean;
};

export default function HomePage({
  onPlay,
  onLogin,
  onLogout,
  loggedIn,
}: HomePageProps) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-gray-900/50 px-4 py-2 text-sm text-gray-200">
            <span className="text-green-400 font-semibold">Welcome</span>
            <span className="text-gray-400">to ft_transcendence</span>
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Play, compete, and connect — all in one place
          </h1>
          <p className="mt-4 text-gray-300 text-lg">
            Choose a game, track your progress, and (when logged in) jump into social features like friends, chats, and groups.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onPlay}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg transition-all transform hover:scale-[1.02]"
            >
              Play
            </button>
            <button
              onClick={loggedIn ? onLogout : onLogin}
              className={`px-6 py-3 rounded-xl font-semibold border border-white/10 transition-colors ${
                loggedIn
                  ? "bg-gray-800/70 hover:bg-gray-800 text-gray-100"
                  : "bg-gray-800/70 hover:bg-gray-800 text-gray-100"
              }`}
            >
              {loggedIn ? "Log Out" : "Log In"}
            </button>
          </div>
          <div className="mt-6 text-sm text-gray-400">
            Tip: Social and Profile unlock after login.
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-md shadow-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-700/30 border border-purple-500/40 flex items-center justify-center text-2xl">
                🏓
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-100">Pong</div>
                <div className="text-gray-400 text-sm mt-1">
                  Play offline or online and test your reflexes.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-md shadow-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-700/30 border border-blue-500/40 flex items-center justify-center text-2xl">
                🔵
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-100">Agar.io</div>
                <div className="text-gray-400 text-sm mt-1">
                  Grow fast, dodge threats, and climb the leaderboard.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-md shadow-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-700/20 border border-green-500/30 flex items-center justify-center text-2xl">
                👥
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-100">Social & Profile</div>
                <div className="text-gray-400 text-sm mt-1">
                  Manage your profile and connect with others after login.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
