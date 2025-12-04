import React, { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { io } from "socket.io-client";

const socket = io("https://localhost:9443", {});

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat message", (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("chat message");
    };
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit("chat message", input);
      setInput("");
    }
  };

  const toggleConnection = () => {
    if (connected) {
      socket.disconnect();
    } else {
      socket.connect();
    }
  };

  const toggleOpen = () => setOpen(!open);

  return (
    <>
      {/* Floating Chat Button (when closed) */}
      {!open && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg z-50 flex items-center justify-center transition-transform transform hover:scale-105"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window (when open) */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-gray-800 text-gray-100 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center px-3 py-2 bg-gray-900 border-b border-gray-700">
            <span className="font-semibold text-sm">💬 Test Chat</span>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleConnection}
                className={`text-xs px-2 py-1 rounded ${connected ? "bg-red-500" : "bg-green-600"
                  }`}
              >
                {connected ? "Disconnect" : "Connect"}
              </button>
              <button
                onClick={toggleOpen}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ul className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {messages.map((msg, i) => (
              <li
                key={i}
                className="bg-gray-700 px-2 py-1 rounded-md text-sm break-words"
              >
                {msg}
              </li>
            ))}
          </ul>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex p-2 border-t border-gray-700"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-l-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-r-md text-sm"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
