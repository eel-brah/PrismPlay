// App.tsx
import React, { useState } from "react";
import Pong from "./component/Pong";
import MyImage from "/pics/start.png";

export default function App() {
  const [page, setPage] = useState<"landing" | "offline" | "online" | "tournament">(
    "landing",
  );
  const isLanding = page === "landing";
  const isOffline = page === "offline";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Landing View */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center p-8 page-transition ${
          isLanding ? "page-shown pointer-events-auto" : "page-hidden"
        }`}
        aria-hidden={!isLanding}
      >
        <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Select Game Mode
        </h1>
        <p className="text-gray-300 mb-8">Choose how you want to play</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {/* Offline Mode */}
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-semibold text-green-400 mb-2">Offline Mode</h2>
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
            <h2 className="text-xl font-semibold text-blue-400 mb-2">Online Mode</h2>
            <p className="text-gray-300 mb-4">1v1 against random players</p>
            <ul className="text-sm text-gray-400 mb-6 space-y-1">
              <li>• Quick matchmaking</li>
              <li>• Competitive ranking</li>
              <li>• Real-time gameplay</li>
            </ul>
            <button
              disabled
              className="w-full bg-gray-700 text-gray-400 py-3 rounded-lg font-semibold cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          {/* Tournament */}
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-semibold text-purple-400 mb-2">Tournament</h2>
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

      {/* Offline View */}
      <div
        className={`absolute inset-0 flex page-transition ${
          isOffline ? "page-shown pointer-events-auto" : "page-hidden"
        }`}
        aria-hidden={!isOffline}
      >
        {/* Left 60% – image */}
        <div className="w-3/5 flex items-center justify-center p-4">
          <img
            src={MyImage}
            alt="Start screen"
            className="object-contain max-w-full max-h-full"
          />
        </div>

        {/* Right 40% – Pong component (handles its own full-screen mode) */}
        <div className="w-2/5 flex items-center justify-center p-4">
          <Pong onReturn={() => setPage("landing")} />
        </div>
      </div>
    </div>
  );
}
