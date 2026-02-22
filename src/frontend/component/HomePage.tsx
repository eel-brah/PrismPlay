import React from "react";

type HomePageProps = {
  onPlay: () => void;
  onLogin: () => void;
  onRegester: () => void;
  loggedIn: boolean;
  onPong: () => void;
  onAgar: () => void;
  onSocial: () => void;
};

export default function HomePage({
  onPlay,
  onLogin,
  onRegester,
  loggedIn,
  onPong,
  onAgar,
  onSocial,
}: HomePageProps) {
  const cardBtn =
    "group w-full text-left rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-md shadow-xl p-4 sm:p-6 transition-all hover:scale-[1.02] hover:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-purple-500/60";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12 min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 items-center">

        <div className="text-center">

          {loggedIn && (
            <div className="mb-3 text-sm text-gray-300">
              Welcome back — continue your progress
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-gray-900/50 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-200">
            {loggedIn ? (
              <>
                <span className="text-green-400 font-semibold">Player Mode</span>
                <span className="text-gray-400">Profile Active</span>
              </>
            ) : (
              <>
                <span className="text-blue-400 font-semibold">Guest Mode</span>
                <span className="text-gray-400">Limited Features</span>
              </>
            )}
          </div>

          <h1 className="mt-5 text-2xl sm:text-3xl md:text-5xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            {loggedIn
              ? "Continue Your Competitive Journey"
              : "PrismPlay is Competitive Arcade Platform"}
          </h1>

          <p className="mt-4 text-gray-300 text-base sm:text-lg">
            {loggedIn
              ? "Your stats are being tracked. Improve your ranking and challenge players."
              : "Play instantly as a guest or create an account to unlock more futures."}
          </p>

          <p className="mt-2 text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
            {loggedIn
              ? "Multiplayer, leaderboard tracking, and social systems are fully available."
              : "Guest mode allows gameplay only. Accounts unlock social features, history, and rankings."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onPlay}
              className="px-6 sm:px-8 w-full sm:w-auto py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg transition-all transform hover:scale-[1.02]"
            >
              {loggedIn ? "Continue Playing" : "Play as Guest"}
            </button>

            {!loggedIn ? (
              <button
                onClick={onRegester}
                className="px-6 sm:px-8 w-full sm:w-auto py-3 rounded-xl border border-green-400/40 text-green-300 hover:bg-green-500/10 transition"
              >
                Create Account (Unlock Features)
              </button>
            ) : (
              <button
                onClick={onSocial}
                className="px-6 sm:px-8 w-full sm:w-auto py-3 rounded-xl border border-blue-400/40 text-blue-300 hover:bg-blue-500/10 transition"
              >
                Open Social Hub
              </button>
            )}
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className={`${loggedIn ? "bg-white/5" : "bg-white/15"} rounded-lg py-3 px-3`}>
              <div className="text-green-400 font-semibold">Gameplay</div>
              <div className="text-gray-400 text-xs">Always available</div>
            </div>

            <div className="bg-white/5 rounded-lg py-3 px-3">
              <div className={`${loggedIn ? "text-blue-400" : "text-gray-500"} font-semibold`}>
                Progression
              </div>
              <div className="text-gray-400 text-xs">
                {loggedIn ? "Stats saved" : "Login required"}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg py-3 px-3">
              <div className={`${loggedIn ? "text-purple-400" : "text-gray-500"} font-semibold`}>
                Leaderboard
              </div>
              <div className="text-gray-400 text-xs">
                {loggedIn ? "Ranking enabled" : "Login required"}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg py-3 px-3">
              <div className={`${loggedIn ? "text-yellow-400" : "text-gray-500"} font-semibold`}>
                Social
              </div>
              <div className="text-gray-400 text-xs">
                {loggedIn ? "Friends & chat" : "Login required"}
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-400">
            {loggedIn
              ? "Your progress is saved automatically."
              : "Create an account to save progress and compete globally."}
          </div>
        </div>

        <div className="space-y-4">

          <div className="text-left mb-2">
            <div className="text-xl font-semibold text-white">
              Choose your activity
            </div>
          </div>

          <button onClick={onPong} className={cardBtn}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-700/30 border border-purple-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                🏓
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-100 group-hover:text-purple-300">
                  Pong
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Precision paddle combat. Control angles, outplay opponents, and win rallies.
                  Available offline for practice or online for ranked matches.
                </div>
              </div>
            </div>
          </button>

          <button onClick={onAgar} className={cardBtn}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-700/30 border border-blue-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                🔵
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-100 group-hover:text-blue-300">
                  Agar.io
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Mass survival arena. Grow, split, chase, escape — every decision matters.
                  Compete for the global leaderboard.
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={loggedIn ? onSocial : onLogin}
            className={`${cardBtn} ${!loggedIn ? "opacity-70 hover:opacity-100" : ""}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-700/20 border border-green-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                👥
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-100 group-hover:text-green-300">
                  Social & Profile
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  {loggedIn
                    ? "Manage your profile, view match history, and connect with players."
                    : "Create your identity, track your career stats, and interact with other players. Login required."}
                </div>
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
