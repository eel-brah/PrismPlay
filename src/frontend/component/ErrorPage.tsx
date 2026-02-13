import React from "react";
import { useNavigate } from "react-router-dom";

interface NotFoundProps {
  code?: number;
  title? : string;
  message?: string;
}

export default function ErrorPage({ code, title, message }: NotFoundProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 px-4">
      <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-10 shadow-2xl border border-gray-700 text-center max-w-md w-full">
        <h1 className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 select-none">
          {code}
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-white">
          {title || "ERROR"}
        </h2>
        <p className="mt-2 text-gray-400 text-sm">
          {message ||
            "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl font-semibold border border-gray-600 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate("/home")}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg transition-all transform hover:scale-[1.02]"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}