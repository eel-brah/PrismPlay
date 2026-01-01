import React, { useMemo, useState } from "react";

type TabKey = "friends" | "chat" | "groups";

interface SocialHubProps {
  onClose: () => void;
}

export default function SocialHub({ onClose }: SocialHubProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

  // Friends state (frontend-only mock)
  const [friends, setFriends] = useState<
    {
      id: string;
      name: string;
      status: "online" | "offline" | "busy" | "ingame";
      gamesPlayed: number;
      winRate: number;
      mutualFriends: number;
      lastActive: string;
    }[]
  >([
    { id: "1", name: "Alice", status: "online", gamesPlayed: 45, winRate: 78, mutualFriends: 3, lastActive: "Online now" },
    { id: "2", name: "Bob", status: "ingame", gamesPlayed: 67, winRate: 65, mutualFriends: 5, lastActive: "Playing now" },
    { id: "3", name: "Charlie", status: "busy", gamesPlayed: 23, winRate: 52, mutualFriends: 1, lastActive: "2 hours ago" },
    { id: "4", name: "Diana", status: "offline", gamesPlayed: 89, winRate: 82, mutualFriends: 7, lastActive: "1 day ago" },
  ]);
  const [friendName, setFriendName] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [friendsSection, setFriendsSection] = useState<"friends" | "requests" | "suggestions">("friends");
  const [friendRequests] = useState<
    { id: string; name: string; mutualFriends: number }[]
  >([{ id: "rq1", name: "Eve", mutualFriends: 2 }, { id: "rq2", name: "Frank", mutualFriends: 1 }]);
  const [friendSuggestions] = useState<
    { id: string; name: string; mutualFriends: number }[]
  >([{ id: "sg1", name: "Grace", mutualFriends: 4 }, { id: "sg2", name: "Hank", mutualFriends: 3 }]);

  // Chat state (frontend-only mock)
  type Message = { id: string; author: string; text: string; ts: number };
  const channels = useMemo(() => ["general", "lobby", "support"], []);
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]);
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    general: [
      { id: "m1", author: "System", text: "Welcome to PingPong Pro chat! 🏓", ts: Date.now() - 60_000 },
    ],
    lobby: [
      { id: "m2", author: "System", text: "Chat with players in the lobby.", ts: Date.now() - 120_000 },
    ],
    support: [
      { id: "m3", author: "System", text: "Need help? Ask here.", ts: Date.now() - 240_000 },
    ],
  });
  const [messagesByDM, setMessagesByDM] = useState<Record<string, Message[]>>({});
  const [chatInput, setChatInput] = useState("");

  // Groups state (frontend-only mock)
  const [groups, setGroups] = useState<
    { id: string; name: string; members: number; joined: boolean }[]
  >([
    { id: "g1", name: "Casual Players", members: 42, joined: true },
    { id: "g2", name: "Ranked Grind", members: 18, joined: false },
    { id: "g3", name: "Weekend Warriors", members: 27, joined: false },
  ]);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>("g1");
  const [messagesByGroup, setMessagesByGroup] = useState<Record<string, Message[]>>({
    g1: [{ id: "gmsg1", author: "System", text: "Welcome to Casual Players", ts: Date.now() - 180_000 }],
    g2: [{ id: "gmsg2", author: "System", text: "Welcome to Ranked Grind", ts: Date.now() - 180_000 }],
    g3: [{ id: "gmsg3", author: "System", text: "Welcome to Weekend Warriors", ts: Date.now() - 180_000 }],
  });
  const [groupChatInput, setGroupChatInput] = useState("");

  const addFriend = () => {
    const name = friendName.trim();
    if (!name) return;
    setFriends((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        name,
        status: "offline",
        gamesPlayed: 0,
        winRate: 0,
        mutualFriends: 0,
        lastActive: "just now",
      },
    ]);
    setFriendName("");
  };

  const removeFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    if (selectedFriendId === id && chatMode === "dm") {
      setSelectedFriendId(null);
      setChatMode("channel");
    }
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    if (chatMode === "channel") {
      setMessagesByChannel((prev) => ({
        ...prev,
        [selectedChannel]: [
          ...prev[selectedChannel],
          { id: Math.random().toString(36).slice(2), author: "You", text, ts: Date.now() },
        ],
      }));
    } else if (chatMode === "dm" && selectedFriendId) {
      setMessagesByDM((prev) => ({
        ...prev,
        [selectedFriendId]: [
          ...(prev[selectedFriendId] || []),
          { id: Math.random().toString(36).slice(2), author: "You", text, ts: Date.now() },
        ],
      }));
    }
    setChatInput("");
  };

  const toggleJoinGroup = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, joined: !g.joined } : g)));
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = Math.random().toString(36).slice(2);
    setGroups((prev) => [
      ...prev,
      { id, name, members: 1, joined: true },
    ]);
    setMessagesByGroup((prev) => ({
      ...prev,
      [id]: [{ id: Math.random().toString(36).slice(2), author: "System", text: `Welcome to ${name}`, ts: Date.now() }],
    }));
    setSelectedGroupId(id);
    setNewGroupName("");
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900/95 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Social Hub
          </h2>
          <p className="text-xs text-gray-400">Friends, chat, and groups (frontend-only)</p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-md bg-gray-800/80 hover:bg-gray-800 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-3 border-b border-gray-700">
        {(["friends", "chat", "groups"] as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === key
                ? "bg-blue-600 text-white"
                : "bg-gray-800/80 text-gray-300 hover:bg-gray-800"
            }`}
          >
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "friends" && (
          <div className="space-y-6">
            <div className="max-w-3xl mx-auto">
              <input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Search friends..."
                className="w-full px-4 py-2 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-center">
              <div className="inline-flex rounded-full bg-gray-800/70 border border-gray-700 overflow-hidden">
                {(["friends", "requests", "suggestions"] as const).map((key, i) => (
                  <button
                    key={key}
                    onClick={() => setFriendsSection(key)}
                    className={`px-5 py-2 text-sm transition-colors ${friendsSection === key ? "bg-gray-700 text-white" : "text-gray-300 hover:text-white"} ${i !== 0 ? "border-l border-gray-700" : ""}`}
                  >
                    {key === "friends" && `Friends (${friends.length})`}
                    {key === "requests" && `Requests (${friendRequests.length})`}
                    {key === "suggestions" && `Suggestions (${friendSuggestions.length})`}
                  </button>
                ))}
              </div>
            </div>
            {friendsSection === "friends" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friends
                  .filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase()))
                  .map((f) => {
                    const label =
                      f.status === "ingame"
                        ? "In Game"
                        : f.status === "online"
                        ? "Online"
                        : f.status === "busy"
                        ? "Away"
                        : "Offline";
                    const pill =
                      f.status === "ingame"
                        ? "bg-blue-600/90"
                        : f.status === "online"
                        ? "bg-green-600/90"
                        : f.status === "busy"
                        ? "bg-yellow-600/90"
                        : "bg-gray-600/90";
                    return (
                      <div key={f.id} className="border border-gray-700 rounded-xl bg-gray-800/60 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 relative">
                            <span
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${f.status === "online" || f.status === "ingame" ? "bg-green-400" : f.status === "busy" ? "bg-yellow-400" : "bg-gray-500"}`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{f.name}</div>
                            <div className="text-xs text-gray-400">{f.lastActive}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${pill}`}>{label}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="text-gray-300">Games played:</div>
                          <div className="text-right">{f.gamesPlayed}</div>
                          <div className="text-gray-300">Win rate:</div>
                          <div className="text-right">{f.winRate}%</div>
                          <div className="text-gray-300">Mutual friends:</div>
                          <div className="text-right">{f.mutualFriends}</div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedFriendId(f.id);
                              setChatMode("dm");
                            }}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Chat
                          </button>
                          <button className="px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-white">
                            Play
                          </button>
                          <button
                            onClick={() => removeFriend(f.id)}
                            className="px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-white"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            {friendsSection === "requests" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friendRequests.map((r) => (
                  <div key={r.id} className="border border-gray-700 rounded-xl bg-gray-800/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                      <div className="flex-1">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-gray-400">Mutual friends: {r.mutualFriends}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/90 text-white">Request</span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white">Accept</button>
                      <button className="px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-white">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {friendsSection === "suggestions" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friendSuggestions.map((s) => (
                  <div key={s.id} className="border border-gray-700 rounded-xl bg-gray-800/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                      <div className="flex-1">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-gray-400">Mutual friends: {s.mutualFriends}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/90 text-white">Suggested</span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white">Add</button>
                      <button className="px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-white">View</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-6">
              <div className="border border-gray-700 rounded-xl bg-gray-800/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">Private Chats</div>
                  <button
                    onClick={() => setChatMode("dm")}
                    className="px-2 py-1 rounded-md bg-gray-800/80 hover:bg-gray-800 text-xs"
                  >
                    +
                  </button>
                </div>
                <ul className="space-y-3">
                  {friends.map((f) => {
                    const last = (messagesByDM[f.id] || []).slice(-1)[0];
                    const preview = last ? last.text.slice(0, 24) + (last.text.length > 24 ? "…" : "") : "No messages yet";
                    const minutes = last ? Math.max(1, Math.floor((Date.now() - last.ts) / 60000)) : 1;
                    const unread = (messagesByDM[f.id] || []).length > 1 ? Math.min(9, (messagesByDM[f.id] || []).length - 1) : 0;
                    return (
                      <li key={f.id}>
                        <button
                          onClick={() => {
                            setSelectedFriendId(f.id);
                            setChatMode("dm");
                          }}
                          className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800/70"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{f.name}</span>
                              <span className="text-xs text-gray-400">{minutes}m</span>
                            </div>
                            <div className="text-xs text-gray-400 truncate">{preview}</div>
                          </div>
                          {unread > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">{unread}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border border-gray-700 rounded-xl bg-gray-800/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Online Now</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {friends.filter((f) => f.status === "online").length} online
                  </span>
                </div>
                <ul className="space-y-2">
                  {friends.map((f) => {
                    const statusLabel = f.status === "online" ? "Online" : f.status === "busy" ? "Away" : "Offline";
                    const statusClass =
                      f.status === "online"
                        ? "bg-green-600/90"
                        : f.status === "busy"
                        ? "bg-yellow-600/90"
                        : "bg-gray-600/90";
                    return (
                      <li key={f.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                        <div className="flex-1">{f.name}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusClass}`}>{statusLabel}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="border border-gray-700 rounded-xl bg-gray-800/60 flex flex-col">
              <div className="px-4 py-3 text-sm font-semibold border-b border-gray-700 flex items-center justify-between">
                <div>
                  {chatMode === "channel" ? "General Chat" : `Chat with ${friends.find((x) => x.id === selectedFriendId)?.name || ""}`}
                  <div className="text-xs text-gray-400">
                    {(chatMode === "channel" ? (messagesByChannel[selectedChannel] || []) : (messagesByDM[selectedFriendId || ""] || [])).length} messages • {friends.filter((f) => f.status === "online").length} online
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                <div className="w-full text-center">
                  <div className="inline-block px-4 py-2 rounded-lg bg-gray-700/70 text-gray-300 text-sm">
                    Welcome to PingPong Pro chat! 🏓
                  </div>
                </div>
                {(chatMode === "channel"
                  ? (messagesByChannel[selectedChannel] || [])
                  : selectedFriendId
                  ? (messagesByDM[selectedFriendId] || [])
                  : ([] as Message[])
                ).map((m) => (
                  <div key={m.id} className="max-w-2xl">
                    <div className="text-sm text-gray-300 mb-1">
                      <span className="text-blue-300 font-semibold mr-2">{m.author}</span>
                      <span className="text-xs text-gray-400">{Math.max(1, Math.floor((Date.now() - m.ts) / 60000))}m</span>
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-gray-700/70 text-gray-200">
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-700 flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                  disabled={chatMode === "dm" && !selectedFriendId}
                />
                <button
                  onClick={sendMessage}
                  className="px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white"
                  disabled={chatMode === "dm" && !selectedFriendId}
                >
                  ✈
                </button>
              </div>
            </div>

            <div className="md:col-span-2 border border-gray-700 rounded-xl bg-gray-800/60 p-4">
              <div className="text-sm font-semibold mb-3">Quick Actions</div>
              <div className="flex items-center gap-6 text-sm">
                <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                  <span className="text-lg">+</span>
                  Start New Chat
                </button>
                <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                  Challenge Someone
                </button>
                <button className="flex items-center gap-2 text-gray-300 hover:text-white">
                  Create Group Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-4">
            {/* Left: Groups list & create */}
            <div className="border border-gray-700 rounded-lg flex flex-col">
              <div className="p-3 border-b border-gray-700">
                <div className="flex gap-2">
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Create a new group"
                    className="flex-1 min-w-0 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={createGroup}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shrink-0 whitespace-nowrap"
                  >
                    Create
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-gray-700 flex-1 overflow-y-auto">
                {groups.map((g) => (
                  <li key={g.id} className="">
                    <div className={`px-3 py-2 flex items-center justify-between ${selectedGroupId === g.id ? "bg-blue-600/40" : "hover:bg-gray-800/60"}`}>
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className="text-left flex-1"
                      >
                        <div className="font-medium">{g.name}</div>
                        <div className="text-xs text-gray-400">{g.members} members</div>
                      </button>
                      <button
                        onClick={() => toggleJoinGroup(g.id)}
                        className={`px-3 py-1 rounded-md ml-2 ${
                          g.joined
                            ? "bg-gray-800/80 hover:bg-gray-800"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {g.joined ? "Leave" : "Join"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Group chat */}
            <div className="border border-gray-700 rounded-lg flex flex-col">
              <div className="bg-gray-800/60 px-3 py-2 text-sm font-semibold border-b border-gray-700">
                {selectedGroupId ? groups.find((g) => g.id === selectedGroupId)?.name : "Select a group"}
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {(selectedGroupId ? (messagesByGroup[selectedGroupId] || []) : ([] as Message[])).map((m) => (
                  <div key={m.id} className="">
                    <span className="text-blue-300 font-semibold mr-2">{m.author}</span>
                    <span className="text-gray-200">{m.text}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(m.ts).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-700 flex gap-2">
                <input
                  value={groupChatInput}
                  onChange={(e) => setGroupChatInput(e.target.value)}
                  placeholder={selectedGroupId ? `Message ${groups.find((g) => g.id === selectedGroupId)?.name}` : "Select a group to chat"}
                  className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                  disabled={!selectedGroupId || !groups.find((g) => g.id === selectedGroupId)?.joined}
                />
                <button
                  onClick={() => {
                    const text = groupChatInput.trim();
                    if (!text || !selectedGroupId) return;
                    setMessagesByGroup((prev) => ({
                      ...prev,
                      [selectedGroupId]: [
                        ...(prev[selectedGroupId] || []),
                        { id: Math.random().toString(36).slice(2), author: "You", text, ts: Date.now() },
                      ],
                    }));
                    setGroupChatInput("");
                  }}
                  className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50"
                  disabled={!selectedGroupId || !groups.find((g) => g.id === selectedGroupId)?.joined}
                >
                  Send
                </button>
              </div>
              {!selectedGroupId && (
                <div className="p-3 text-sm text-gray-400">Select a group from the list to view chat.</div>
              )}
              {selectedGroupId && !groups.find((g) => g.id === selectedGroupId)?.joined && (
                <div className="p-3 text-sm text-yellow-400">Join the group to send messages.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
