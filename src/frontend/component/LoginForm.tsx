import React, { useState } from "react";

type Props = {
  onSubmit: (username: string, password: string) => void;
  onReturn?: () => void;
  onRegister?: () => void;
};

export default function LoginForm({ onSubmit, onReturn, onRegister }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col items-center justify-center w-full p-8">
      <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700 w-full max-w-md">
        {onReturn && (
          <button
            onClick={onReturn}
            className="absolute top-3 right-3 bg-gray-700/80 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Return
          </button>
        )}

        <h2 className="text-2xl font-semibold text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Log In
        </h2>
        <p className="text-gray-300 text-center mb-6">Enter your credentials to log in</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter password"
            />
          </div>

          <button
            onClick={() => onSubmit(username, password)}
            className="w-full mt-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Login
          </button>
          <div className="text-sm text-gray-400 mt-3 text-center">
            Don’t have an account? {" "}
            <button
              type="button"
              onClick={onRegister}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
