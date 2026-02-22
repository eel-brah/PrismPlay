/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";

type Props = {
  onSubmit: (email: string, password: string) => Promise<void>;
  onRegister?: () => void;
};

export default function LoginForm({ onSubmit, onRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoginClick() {
    setError(null);

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (e: any) {
      setError(e.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full p-8">
      <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Log In
        </h2>
        <p className="text-gray-300 text-center mb-6">
          Enter your credentials to log in
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleLoginClick();
          }}
        >
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Email"
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
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {error && (
            <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>
          )}
          <div className="flex items-center gap-3 my-2">
            <div className="h-px flex-1 bg-gray-700" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gray-700" />
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/google";
            }}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 py-2.5 rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.52 0 6.72 1.3 9.22 3.44l6.9-6.9C35.56 2.56 29.98 0 24 0 14.62 0 6.4 5.38 2.5 13.2l8.04 6.24C12.63 13.37 17.9 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.56-.14-3.06-.41-4.5H24v9h12.7c-.55 2.96-2.21 5.46-4.7 7.14l7.22 5.61C43.55 37.83 46.5 31.66 46.5 24.5z"
              />
              <path
                fill="#FBBC05"
                d="M10.54 19.44L2.5 13.2C0.9 16.27 0 19.74 0 23.5c0 3.68.88 7.1 2.43 10.14l8.27-6.42c-.64-1.9-.99-3.93-.99-6.28 0-1.06.1-2.12.33-3.5z"
              />
              <path
                fill="#34A853"
                d="M24 47c6.5 0 12-2.14 16.25-5.75l-7.22-5.61c-2.02 1.38-4.62 2.18-7.53 2.18-6.07 0-11.22-3.86-13.09-9.21l-8.27 6.42C6.35 42.87 14.52 47 24 47z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Continue with Google
          </button>
          <div className="text-sm text-gray-400 mt-3 text-center">
            Don’t have an account?{" "}
            <button
              type="button"
              onClick={onRegister}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
