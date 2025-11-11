// App.tsx
import React from "react";
import Pong from "./component/Pong";
import MyImage from "/pics/start.png";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex">
      {/* Left 60% – image (visible only in menu) */}
      <div className="w-3/5 flex items-center justify-center p-4">
        <img
          src={MyImage}
          alt="Start screen"
          className="object-contain max-w-full max-h-full"
        />
      </div>

      {/* Right 40% – Pong component (handles its own full-screen mode) */}
      <div className="w-2/5 flex items-center justify-center p-4">
        <Pong />
      </div>
    </div>
  );
}