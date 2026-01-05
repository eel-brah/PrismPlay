import React, { useMemo, useState } from "react";

type TabKey = "friends" | "chat" | "groups";

interface SocialHubProps {
  onClose: () => void;
}

export default function SocialHub({ onClose }: SocialHubProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

  // Friends state (frontend-only mock)
  const [friends, setFriends] = useState<
    { id: string; name: string; status: "online" | "offline" | "busy" }[]
  >([
    { id: "1", name: "Aria", status: "online" },
    { id: "2", name: "Kai", status: "busy" },
    { id: "3", name: "Nova", status: "offline" },
  ]);
  const [friendName, setFriendName] = useState("");

  // Chat state (frontend-only mock)
  type Message = { id: string; author: string; text: string; ts: number };
  const channels = useMemo(() => ["general", "lobby", "support"], []);
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]);
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    general: [
      { id: "m1", author: "System", text: "Welcome to General!", ts: Date.now() - 60_000 },
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
      { id: Math.random().toString(36).slice(2), name, status: "offline" },
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
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Add friend by name"
                className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
              />
              <button
                onClick={addFriend}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                Add
              </button>
            </div>
            <ul className="divide-y divide-gray-700">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        f.status === "online"
                          ? "bg-green-400"
                          : f.status === "busy"
                          ? "bg-yellow-400"
                          : "bg-gray-500"
                      }`}
                    />
                    <span className="font-medium">{f.name}</span>
                    <span className="text-xs text-gray-400">{f.status}</span>
                  </div>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className="px-3 py-1 rounded-md bg-gray-800/80 hover:bg-gray-800"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="grid grid-cols-3 gap-4">
            {/* Left: Channels + Friends */}
            <div className="col-span-1 border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-800/60 px-3 py-2 text-sm font-semibold">Channels</div>
              <ul className="divide-y divide-gray-700">
                {channels.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => {
                        setSelectedChannel(c);
                        setChatMode("channel");
                        setSelectedFriendId(null);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        chatMode === "channel" && selectedChannel === c ? "bg-blue-600/40" : "hover:bg-gray-800/60"
                      }`}
                    >
                      #{c}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="bg-gray-800/60 px-3 py-2 text-sm font-semibold border-t border-gray-700">Friends</div>
              <ul className="divide-y divide-gray-700">
                {friends.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => {
                        setSelectedFriendId(f.id);
                        setChatMode("dm");
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                        chatMode === "dm" && selectedFriendId === f.id ? "bg-blue-600/40" : "hover:bg-gray-800/60"
                      }`}
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          f.status === "online"
                            ? "bg-green-400"
                            : f.status === "busy"
                            ? "bg-yellow-400"
                            : "bg-gray-500"
                        }`}
                      />
                      <span>{f.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Messages */}
            <div className="col-span-2 border border-gray-700 rounded-lg flex flex-col">
              <div className="bg-gray-800/60 px-3 py-2 text-sm font-semibold border-b border-gray-700">
                {chatMode === "channel" ? `#${selectedChannel}` : `@${friends.find((x) => x.id === selectedFriendId)?.name || "Select a friend"}`}
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {(chatMode === "channel"
                  ? (messagesByChannel[selectedChannel] || [])
                  : selectedFriendId
                  ? (messagesByDM[selectedFriendId] || [])
                  : ([] as Message[])
                ).map((m) => (
                  <div key={m.id} className="">
                    <span className="text-blue-300 font-semibold mr-2">{m.author}</span>
                    <span className="text-gray-200">{m.text}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(m.ts).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-700 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={chatMode === "channel" ? `Message #${selectedChannel}` : `Message @${friends.find((x) => x.id === selectedFriendId)?.name || "friend"}`}
                  className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                  disabled={chatMode === "dm" && !selectedFriendId}
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50"
                  disabled={chatMode === "dm" && !selectedFriendId}
                >
                  Send
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
