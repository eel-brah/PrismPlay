import React from "react";

type Props = {
  onContinue: (mode: "login" | "guest") => void;
};

export default function LoginPage({ onContinue }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        Welcome
      </h1>
      <p className="text-gray-300 mb-8">Choose how you want to start</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Login option */}
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
          <h2 className="text-xl font-semibold text-blue-400 mb-2">Log In</h2>
          <p className="text-gray-300 mb-4">Proceed with Account</p>
          <ul className="text-sm text-gray-400 mb-6 space-y-1">
            <li>• have an identity</li>
            <li>• Data saved</li>
          </ul>
          <button
            onClick={() => onContinue("login")}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Continue
          </button>
        </div>

        {/* Guest option */}
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
          <h2 className="text-xl font-semibold text-green-400 mb-2">Enter as Guest</h2>
          <p className="text-gray-300 mb-4">Play without signing in</p>
          <ul className="text-sm text-gray-400 mb-6 space-y-1">
            <li>• Quick start</li>
            <li>• No data stored</li>
          </ul>
          <button
            onClick={() => onContinue("guest")}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

