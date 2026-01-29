import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  MessageCircle,
  Gamepad2,
  UserPlus,
  UserMinus,
  Search,
  Clock,
  Send,
  MessageSquarePlus,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import {
  apiGetMe,
  getStoredToken,
  apiListFriends,
  apiIncomingRequests,
  apiAcceptFriend,
  apiDeclineFriend,
  apiRemoveFriend,
} from "../api";

type TabKey = "friends" | "chat" | "groups";

export default function SocialHub() {
  const sendFriendRequestByUsername = async () => {
    setAddErr(null);
    setAddMsg("Friend request sent Success");
  };
  const [addUsername, setAddUsername] = useState("");
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("friends");
  const [friends, setFriends] = useState<
    {
      id: string;
      name: string;
      lastLogin: string | null;
      createdAt: string;
      avatarUrl?: string;
    }[]
  >([]);
  const [requests, setRequests] = useState<
    { id: string; name: string; avatarUrl?: string }[]
  >([]);
  const reload = async () => {
    const token = getStoredToken();
    if (!token) return;

    const [friendList, incomingRequest] = await Promise.all([
      apiListFriends(token),
      apiIncomingRequests(token),
    ]);

    setFriends(
      friendList.map((r) => ({
        id: String(r.friend.id),
        name: r.friend.username,
        lastLogin: r.friend.lastLogin,
        createdAt: r.friend.createdAt,
        avatarUrl: r.friend.avatarUrl ?? undefined,
      })),
    );

    setRequests(
      incomingRequest.map((r) => ({
        id: String(r.id), // request id (good)
        name: r.fromUser.username,
        avatarUrl: r.fromUser.avatarUrl ?? undefined,
      })),
    );
  };

// 1. Init: Load data & Connect Socket
  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        // Fetch 'me' to get myUserId needed for socket
        const me = await apiGetMe(token);
        setMyUserId(me.id);
        
        // Run the existing reload for friends
        await reload();

        // Connect Socket if not already connected
        if (!socketRef.current) {
          const s = io("/", {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            withCredentials: true,
            query: { userId: me.id },
          });
          socketRef.current = s;

          // GLOBAL LISTENER: When joining a DM, update messages
          s.on("dm_joined", (payload: any) => {
             // payload: { chatId, messages }
             // We need to find which friend belongs to this chatId
             // We check our reference map
             const friendId = Object.keys(chatIdByOther.current).find(
               (k) => chatIdByOther.current[k] === payload.chatId
             );

             if (friendId) {
                const msgs = (payload.messages || []).map((m: any) => ({
                  id: String(m.id),
                  author: m.sender?.username || "Unknown",
                  text: m.content,
                  ts: Date.now(), // or parse m.createdAt if available
                }));
                setMessagesByDM((prev) => ({ ...prev, [friendId]: msgs }));
             }
          });

          // GLOBAL LISTENER: Incoming messages
          s.on("new_message", (msg: any) => {
             const friendId = Object.keys(chatIdByOther.current).find(
               (k) => chatIdByOther.current[k] === msg.chatId
             );
             if (friendId) {
               setMessagesByDM((prev) => ({
                 ...prev,
                 [friendId]: [
                   ...(prev[friendId] || []),
                   {
                     id: String(msg.id),
                     author: msg.sender?.username || "",
                     text: msg.content,
                     ts: Date.now(),
                   },
                 ],
               }));
             }
          });
        }
      } catch (e) {
        console.error("Init failed", e);
      }
    };
    init();
  }, []);
  // const [friends, setFriends] = useState<
  //   {
  //     id: string;
  //     name: string;
  //     status: "online" | "offline" | "busy" | "away" | "in_game";
  //     lastSeen: string;
  //     gamesPlayed: number;
  //     winRate: number;
  //     mutualFriends: number;
  //     avatarUrl?: string;
  //   }[]
  // >([
  //   { id: "1", name: "Alice", status: "online", lastSeen: "Online now", gamesPlayed: 45, winRate: 78, mutualFriends: 3 },
  //   { id: "2", name: "Bob", status: "in_game", lastSeen: "Playing now", gamesPlayed: 67, winRate: 65, mutualFriends: 5 },
  //   { id: "3", name: "Charlie", status: "away", lastSeen: "2 hours ago", gamesPlayed: 23, winRate: 52, mutualFriends: 1 },
  //   { id: "4", name: "Diana", status: "offline", lastSeen: "1 day ago", gamesPlayed: 89, winRate: 82, mutualFriends: 7 },
  // ]);
  // const [requests, setRequests] = useState<
  //   { id: string; name: string; avatarUrl?: string; mutualFriends?: number }[]
  // >([
  //   { id: "r1", name: "Ethan", mutualFriends: 2 },
  //   { id: "r2", name: "Mia", mutualFriends: 1 },
  // ]);
  const [suggestions, setSuggestions] = useState<
    { id: string; name: string; avatarUrl?: string; mutualFriends?: number }[]
  >([
    { id: "s1", name: "Noah", mutualFriends: 4 },
    { id: "s2", name: "Ava", mutualFriends: 3 },
    { id: "s3", name: "Liam", mutualFriends: 2 },
  ]);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendsSubTab, setFriendsSubTab] = useState<
    "friends" | "requests" | "add"
  >("friends");

  // Chat state (frontend-only mock)
  type Message = { id: string; author: string; text: string; ts: number };
  const channels = useMemo(() => ["general", "lobby", "support"], []);
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]);
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<
    Record<string, Message[]>
  >({
    general: [
      {
        id: "m1",
        author: "System",
        text: "Welcome to General!",
        ts: Date.now() - 60_000,
      },
    ],
    lobby: [
      {
        id: "m2",
        author: "System",
        text: "Chat with players in the lobby.",
        ts: Date.now() - 120_000,
      },
    ],
    support: [
      {
        id: "m3",
        author: "System",
        text: "Need help? Ask here.",
        ts: Date.now() - 240_000,
      },
    ],
  });
  const [messagesByDM, setMessagesByDM] = useState<Record<string, Message[]>>(
    {},
  );
  const [chatInput, setChatInput] = useState("");
  const [unreadByDM, setUnreadByDM] = useState<Record<string, number>>({
    "2": 2,
    "3": 1,
  });
  const [dmSearch, setDmSearch] = useState("");
  const [showChatTest, setShowChatTest] = useState(false);
  const [chatTestId, setChatTestId] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const chatIdByOther = useRef<Record<string, number>>({});
  const [displayNameById, setDisplayNameById] = useState<
    Record<string, string>
  >({});

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
  const [messagesByGroup, setMessagesByGroup] = useState<
    Record<string, Message[]>
  >({
    g1: [
      {
        id: "gmsg1",
        author: "System",
        text: "Welcome to Casual Players",
        ts: Date.now() - 180_000,
      },
    ],
    g2: [
      {
        id: "gmsg2",
        author: "System",
        text: "Welcome to Ranked Grind",
        ts: Date.now() - 180_000,
      },
    ],
    g3: [
      {
        id: "gmsg3",
        author: "System",
        text: "Welcome to Weekend Warriors",
        ts: Date.now() - 180_000,
      },
    ],
  });
  const [groupChatInput, setGroupChatInput] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  const acceptFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiAcceptFriend(token, id);
      await reload();
    } catch (e) {
      console.log(e);
    }
  };

  const addFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiAcceptFriend(token, id);
      await reload();
    } catch (e) {
      console.log(e);
    }
  };

  const declineFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiDeclineFriend(token, id);
      await reload();
    } catch (e) {
      console.log(e);
    }
  };

  const removeFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiRemoveFriend(token, id);
      await reload();
    } catch (e) {
      console.log(e);
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
          {
            id: Math.random().toString(36).slice(2),
            author: "You",
            text,
            ts: Date.now(),
          },
        ],
      }));
    } else if (chatMode === "dm" && selectedFriendId) {
      // SEND VIA SOCKET
      const chatId = chatIdByOther.current[selectedFriendId];
      if (socketRef.current && chatId && myUserId) {
        socketRef.current.emit("send_message", { 
          chatId, 
          senderId: myUserId, 
          content: text 
        });
      } else {
        // Fallback if socket fails (optimistic UI)
        setMessagesByDM((prev) => ({
          ...prev,
          [selectedFriendId]: [
            ...(prev[selectedFriendId] || []),
            {
              id: Math.random().toString(36).slice(2),
              author: "You",
              text,
              ts: Date.now(),
            },
          ],
        }));
      }
    }
    setChatInput("");
  };

  const toggleJoinGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, joined: !g.joined } : g)),
    );
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = Math.random().toString(36).slice(2);
    setGroups((prev) => [...prev, { id, name, members: 1, joined: true }]);
    setMessagesByGroup((prev) => ({
      ...prev,
      [id]: [
        {
          id: Math.random().toString(36).slice(2),
          author: "System",
          text: `Welcome to ${name}`,
          ts: Date.now(),
        },
      ],
    }));
    setSelectedGroupId(id);
    setNewGroupName("");
  };

const handleStartDirectMessage = (friendId: string) => {
    setSelectedFriendId(friendId);
    setChatMode("dm");
    setActiveTab("chat");
    setUnreadByDM((prev) => ({ ...prev, [friendId]: 0 }));

    if (socketRef.current && myUserId) {
      const onJoinHandler = (payload: any) => {
        if (payload.chatId) {
           chatIdByOther.current[friendId] = payload.chatId;
           const msgs = (payload.messages || []).map((m: any) => ({
              id: String(m.id),
              author: m.sender?.username || "Unknown",
              text: m.content,
              ts: Date.now(), // mock timestamp for now 
           }));

           setMessagesByDM((prev) => ({
               ...prev,
               [friendId]: msgs
           }));

           
           socketRef.current?.off("dm_joined", onJoinHandler);
        }
      };

      socketRef.current.on("dm_joined", onJoinHandler);

      socketRef.current.emit("join_dm", {
        myId: myUserId,
        otherUserId: Number(friendId),
      });
    }
  };

  return (
    <div className="w-full h-full text-white">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Social Hub
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Friends, chat, and groups
          </p>
        </div>
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            {(["friends", "chat", "groups"] as TabKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-1 rounded-full text-sm transition-colors ${
                  activeTab === key
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {key[0].toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "friends" && (
          <div className="max-w-6xl mx-auto px-6 pb-10 space-y-6">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <input
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full px-4 py-2 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="inline-flex rounded-full bg-gray-800/60 p-1">
                {(["friends", "requests", "add"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFriendsSubTab(t)}
                    className={`px-4 py-1 rounded-full text-sm transition-colors ${
                      friendsSubTab === t
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {t === "friends" && `Friends (${friends.length})`}
                    {t === "requests" && `Requests (${requests.length})`}
                    {t === "add" && `New friend`}
                  </button>
                ))}
              </div>
            </div>
            {friendsSubTab === "friends" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl-grid-cols-3 xl:grid-cols-3 gap-6">
                {friends
                  .filter((f) =>
                    f.name.toLowerCase().includes(friendSearch.toLowerCase()),
                  )
                  .map((f) => {
                    const pill =
                      f.status === "online"
                        ? { text: "Online", cls: "bg-green-600 text-white" }
                        : f.status === "in_game"
                          ? { text: "In Game", cls: "bg-blue-600 text-white" }
                          : f.status === "away"
                            ? { text: "Away", cls: "bg-yellow-600 text-black" }
                            : {
                                text: "Offline",
                                cls: "bg-gray-600 text-white",
                              };
                    return (
                      <div
                        key={f.id}
                        className="rounded-2xl border border-white/10 bg-gray-900/60 shadow-xl p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {f.avatarUrl ? (
                              <img
                                src={f.avatarUrl}
                                alt={f.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                            )}
                            <div>
                              <div className="font-semibold text-gray-100">
                                {f.name}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{f.lastLogin}</span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${pill.cls}`}
                          >
                            {pill.text}
                          </span>
                        </div>
                        {/* <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="text-gray-300">Games played</div>
                          <div className="text-right text-gray-100">{f.gamesPlayed}</div>
                          <div className="text-gray-300">Win rate</div>
                          <div className="text-right text-gray-100">{f.winRate}%</div>
                          <div className="text-gray-300">Mutual friends</div>
                          <div className="text-right text-gray-100">{f.mutualFriends}</div>
                        </div> */}
                        <div className="mt-5 flex items-center gap-3">
                          <button
                            onClick={() => handleStartDirectMessage(f.id)}
                            className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => {}}
                            className="px-4 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                          >
                            <Gamepad2 className="w-4 h-4" />
                            <span>Play</span>
                          </button>
                          <button
                            onClick={() => removeFriend(f.id)}
                            className="ml-auto p-2 rounded-md bg-gray-800/60 hover:bg-gray-800 text-gray-300"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            {friendsSubTab === "requests" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl-grid-cols-3 xl:grid-cols-3 gap-6">
                {requests
                  .filter((r) =>
                    r.name.toLowerCase().includes(friendSearch.toLowerCase()),
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/10 bg-gray-900/60 shadow-xl p-5"
                    >
                      <div className="flex items-center gap-3">
                        {r.avatarUrl ? (
                          <img
                            src={r.avatarUrl}
                            alt={r.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-100">
                            {r.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {r.mutualFriends || 0} mutual friends
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => {
                            acceptFriend(r.id);
                            setRequests((prev) =>
                              prev.filter((x) => x.id !== r.id),
                            );
                          }}
                          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            declineFriend(r.id);
                            setRequests((prev) =>
                              prev.filter((x) => x.id !== r.id),
                            );
                          }}
                          className="px-4 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {friendsSubTab === "add" && (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Add by username */}
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5">
                  <div className="text-sm font-semibold text-gray-200">
                    Add by username
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                      placeholder="Enter username (exact)..."
                      className="flex-1 min-w-0 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendFriendRequestByUsername();
                      }}
                    />
                    <button
                      onClick={sendFriendRequestByUsername}
                      disabled={addLoading || !addUsername.trim()}
                      className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-green-600/40 text-white shrink-0"
                    >
                      {addLoading ? "Sending..." : "Send"}
                    </button>
                  </div>

                  {addMsg && (
                    <div className="mt-2 text-m text-green-400">{addMsg}</div>
                  )}
                  {addErr && (
                    <div className="mt-2 text-m text-red-400">{addErr}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="max-w-6xl mx-auto px-6 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-200">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        Private Chats
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowChatTest((s) => !s)}
                        className="px-3 py-1 rounded-md bg-gray-800/60 hover:bg-gray-800 text-sm"
                        title="Open test DM input"
                      >
                        <MessageSquarePlus className="w-4 h-4 inline-block mr-2" />
                        Chat Test
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("friends");
                          setFriendsSubTab("add");
                        }}
                        className="p-2 rounded-md bg-gray-800/60 hover:bg-gray-800"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="relative">
                      <input
                        value={dmSearch}
                        onChange={(e) => setDmSearch(e.target.value)}
                        placeholder="Search chats..."
                        className="w-full px-4 py-2 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                    </div>
                  </div>
                  {showChatTest && (
                    <div className="mt-3 p-3 rounded-md bg-gray-800/50 border border-gray-700">
                      <div className="text-xs text-gray-300 mb-2">
                        Start a test DM by ID
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={chatTestId}
                          onChange={(e) => setChatTestId(e.target.value)}
                          placeholder="Enter user id..."
                          className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            const id = chatTestId.trim();
                            if (!id) return;

                            // get current user id from API (requires token)
                            try {
                              const token = getStoredToken();
                              if (!token) throw new Error("Not authenticated");
                              const me = await apiGetMe(token);
                              setMyUserId(me.id);

                              // ensure socket connected
                              if (!socketRef.current) {
                                const s = io("/", {
                                  path: "/socket.io",
                                  transports: ["websocket", "polling"],
                                  withCredentials: true,
                                });
                                socketRef.current = s;

                                s.on("dm_joined", (payload: any) => {
                                  // payload: { chatId, messages }
                                  // map chatId to other user id when we join below
                                  // we'll attach mapping after emit returns
                                });

                                s.on("new_message", (msg: any) => {
                                  // append incoming messages to any matching DM
                                  const other = Object.keys(
                                    chatIdByOther.current,
                                  ).find(
                                    (k) =>
                                      chatIdByOther.current[k] === msg.chatId,
                                  );
                                  if (!other) return;
                                  setMessagesByDM((prev) => ({
                                    ...prev,
                                    [other]: [
                                      ...(prev[other] || []),
                                      {
                                        id: String(msg.id),
                                        author: msg.sender?.username || "",
                                        text: msg.content,
                                        ts: Date.now(),
                                      },
                                    ],
                                  }));
                                });
                              }

                              // emit join_dm (backend will create/return chat)
                              socketRef.current!.emit("join_dm", {
                                myId: me.id,
                                otherUserId: Number(id),
                              });

                              // wait for dm_joined once
                              const handler = (payload: any) => {
                                const chatId = payload.chatId as number;
                                chatIdByOther.current[id] = chatId;
                                const msgs = (payload.messages || []).map(
                                  (m: any) => ({
                                    id: String(m.id),
                                    author: m.sender?.username || "",
                                    text: m.content,
                                    ts: Date.now(),
                                  }),
                                );
                                setMessagesByDM((prev) => ({
                                  ...prev,
                                  [id]: msgs,
                                }));

                                // derive display name: prefer any non-me message sender, else fallback to generic label
                                let otherName = undefined as string | undefined;
                                if (msgs.length > 0) {
                                  const otherMsg = msgs.find(
                                    (mm) =>
                                      mm.author &&
                                      mm.author !==
                                        (me.username ?? String(me.id)),
                                  );
                                  otherName =
                                    otherMsg?.author ?? msgs[0].author;
                                }
                                setDisplayNameById((prev) => ({
                                  ...prev,
                                  [id]: otherName ?? `User-${id}`,
                                }));

                                setSelectedFriendId(id);
                                setChatMode("dm");
                                setUnreadByDM((prev) => ({ ...prev, [id]: 0 }));
                                setShowChatTest(false);
                                setChatTestId("");
                                socketRef.current?.off("dm_joined", handler);
                              };

                              socketRef.current!.on("dm_joined", handler);
                            } catch (e) {
                              console.error("Failed to start DM test:", e);
                            }
                          }}
                          className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  )}
                  <ul className="mt-3 space-y-2">
                    {friends
                      .filter((f) =>
                        f.name.toLowerCase().includes(dmSearch.toLowerCase()),
                      )
                      .map((f) => {
                        const last = (messagesByDM[f.id] || []).slice(-1)[0];
                        const unread = unreadByDM[f.id] || 0;
                        return (
                          <li key={f.id}>
                            <button
                            onClick={() => handleStartDirectMessage(f.id)}
                              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
                                chatMode === "dm" && selectedFriendId === f.id
                                  ? "bg-blue-600/20"
                                  : "hover:bg-gray-800/60"
                              }`}
                            >
                              {f.avatarUrl ? (
                                <img
                                  src={f.avatarUrl}
                                  alt={f.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-100">
                                    {f.name}
                                  </span>
                                  {unread > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">
                                      {unread}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {last ? last.text : "No messages yet"}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
                  <div className="text-sm font-semibold text-gray-200">
                    Online Now
                  </div>
                  <div className="mt-2 space-y-2">
                    {friends
                      .filter(
                        (f) =>
                          f.status === "online" ||
                          f.status === "in_game" ||
                          f.status === "away",
                      )
                      .map((f) => {
                        const pill =
                          f.status === "online"
                            ? { text: "Online", cls: "bg-green-600 text-white" }
                            : f.status === "in_game"
                              ? {
                                  text: "In Game",
                                  cls: "bg-blue-600 text-white",
                                }
                              : {
                                  text: "Away",
                                  cls: "bg-yellow-600 text-black",
                                };
                        return (
                          <div key={f.id} className="flex items-center gap-3">
                            {f.avatarUrl ? (
                              <img
                                src={f.avatarUrl}
                                alt={f.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                            )}
                            <div className="flex-1">
                              <div className="text-sm text-gray-100">
                                {f.name}
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${pill.cls}`}
                            >
                              {pill.text}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 flex flex-col">
                <div className="text-sm font-semibold text-gray-200">
                  {chatMode === "channel"
                    ? `${selectedChannel[0].toUpperCase()}${selectedChannel.slice(1)} Chat`
                    : `${friends.find((x) => x.id === selectedFriendId)?.name || "Select a friend"}`}
                </div>
                <div className="text-xs text-gray-400">
                  {
                    (chatMode === "channel"
                      ? messagesByChannel[selectedChannel] || []
                      : selectedFriendId
                        ? messagesByDM[selectedFriendId] || []
                        : []
                    ).length
                  }{" "}
                  messages •{" "}
                  {
                    friends.filter(
                      (f) => f.status === "online" || f.status === "in_game",
                    ).length
                  }{" "}
                  online
                </div>
                <div className="mt-3">
                  <div className="text-center text-xs text-gray-400">
                    Welcome to PingPong Pro chat
                  </div>
                </div>
                <div className="flex-1 mt-3 space-y-3 overflow-y-auto">
                  {(chatMode === "channel"
                    ? messagesByChannel[selectedChannel] || []
                    : selectedFriendId
                      ? messagesByDM[selectedFriendId] || []
                      : ([] as Message[])
                  ).map((m) => {
                    const mins = Math.max(
                      0,
                      Math.floor((Date.now() - m.ts) / 60000),
                    );
                    return (
                      <div key={m.id} className="max-w-xl">
                        <div className="text-xs text-gray-400 mb-1">
                          <span className="text-gray-200 font-semibold">
                            {m.author}
                          </span>{" "}
                          {mins}m
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-gray-700/70 text-gray-100">
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                    disabled={chatMode === "dm" && !selectedFriendId}
                  />
                  <button
                    onClick={sendMessage}
                    className="p-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    disabled={chatMode === "dm" && !selectedFriendId}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="max-w-6xl mx-auto px-6 pb-10 grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-4">
            <div className="rounded-2xl border border-white/10 bg-gray-900/60 flex flex-col">
              <div className="p-3 border-b border-white/10 space-y-2">
                <div className="relative">
                  <input
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search groups..."
                    className="w-full px-4 py-2 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                </div>
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
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {groups
                  .filter((g) =>
                    g.name.toLowerCase().includes(groupSearch.toLowerCase()),
                  )
                  .map((g) => (
                    <div
                      key={g.id}
                      className={`rounded-lg border border-white/10 px-3 py-3 flex items-center justify-between ${selectedGroupId === g.id ? "bg-blue-600/10" : "bg-gray-800/40"}`}
                    >
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className="text-left flex-1"
                      >
                        <div className="font-medium text-gray-100">
                          {g.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {g.members} members
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedGroupId(g.id)}
                          className="px-3 py-1 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => toggleJoinGroup(g.id)}
                          className={`px-3 py-1 rounded-md ${
                            g.joined
                              ? "bg-gray-800/80 hover:bg-gray-800 text-gray-200"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {g.joined ? "Leave" : "Join"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gray-900/60 flex flex-col">
              <div className="px-3 py-2 text-sm font-semibold border-b border-white/10">
                {selectedGroupId
                  ? groups.find((g) => g.id === selectedGroupId)?.name
                  : "Select a group"}
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {(selectedGroupId
                  ? messagesByGroup[selectedGroupId] || []
                  : ([] as Message[])
                ).map((m) => (
                  <div key={m.id} className="">
                    <span className="text-blue-300 font-semibold mr-2">
                      {m.author}
                    </span>
                    <span className="text-gray-200">{m.text}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(m.ts).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/10 flex gap-2">
                <input
                  value={groupChatInput}
                  onChange={(e) => setGroupChatInput(e.target.value)}
                  placeholder={
                    selectedGroupId
                      ? `Message ${groups.find((g) => g.id === selectedGroupId)?.name}`
                      : "Select a group to chat"
                  }
                  className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none"
                  disabled={
                    !selectedGroupId ||
                    !groups.find((g) => g.id === selectedGroupId)?.joined
                  }
                />
                <button
                  onClick={() => {
                    const text = groupChatInput.trim();
                    if (!text || !selectedGroupId) return;
                    setMessagesByGroup((prev) => ({
                      ...prev,
                      [selectedGroupId]: [
                        ...(prev[selectedGroupId] || []),
                        {
                          id: Math.random().toString(36).slice(2),
                          author: "You",
                          text,
                          ts: Date.now(),
                        },
                      ],
                    }));
                    setGroupChatInput("");
                  }}
                  className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50"
                  disabled={
                    !selectedGroupId ||
                    !groups.find((g) => g.id === selectedGroupId)?.joined
                  }
                >
                  Send
                </button>
              </div>
              {!selectedGroupId && (
                <div className="p-3 text-sm text-gray-400">
                  Select a group from the list to view chat.
                </div>
              )}
              {selectedGroupId &&
                !groups.find((g) => g.id === selectedGroupId)?.joined && (
                  <div className="p-3 text-sm text-yellow-400">
                    Join the group to send messages.
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
