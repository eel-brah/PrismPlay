import React, { useState } from "react";

type Props = {
  onSubmit: (username: string, password: string) => void;
  onReturn?: () => void;
};

export default function RegisterForm({ onSubmit, onReturn }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRegister = () => {
    // Frontend-only validation for demo purposes
    if (!username || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    onSubmit(username, password);
  };

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

        <h2 className="text-2xl font-semibold text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Create Account
        </h2>
        <p className="text-gray-300 text-center mb-6">Register to create a new account</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Choose a username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Create a password"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            onClick={handleRegister}
            className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

