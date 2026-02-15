/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Gamepad2,
  UserPlus,
  UserMinus,
  Search,
  Clock,
  Send,
  LockKeyholeOpen,
  LockKeyhole,
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
  apiAddFriend,
} from "../api";
import { getPresenceSocket } from "@/presenceSocket";

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================
type TabKey = "friends" | "chat"; // Removed "groups"

type Message = {
  id: string;
  author: string;
  text: string;
  ts: number;
  senderId?: number;
  readAt?: string | null;
};

export default function SocialHub() {
  // ============================================================================
  // 2. SYSTEM & GLOBAL STATE
  // ============================================================================
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

  // ============================================================================
  // 3. FRIENDS FEATURE STATE
  // ============================================================================
  const [friends, setFriends] = useState<
    {
      id: string;
      name: string;
      lastLogin: string | null;
      createdAt: string;
      avatarUrl?: string;
      status?: string;
    }[]
  >([]);
  const navigate = useNavigate();
  const [requests, setRequests] = useState<
    { id: string; name: string; avatarUrl?: string; mutualFriends?: number }[]
  >([]);
  const [friendsSubTab, setFriendsSubTab] = useState<
    "friends" | "requests" | "add"
  >("friends");
  const [friendSearch, setFriendSearch] = useState("");

  const [addUsername, setAddUsername] = useState("");
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // ============================================================================
  // 4. CHAT FEATURE STATE (Includes "General" Channel)
  // ============================================================================
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [dmSearch, setDmSearch] = useState("");
  const [chatInput, setChatInput] = useState("");

  // Channels (General) - KEPT AS REQUESTED
  const channels = useMemo(() => ["general"], []);
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]);
  const [messagesByChannel, setMessagesByChannel] = useState<
    Record<string, Message[]>
  >({
    general: [
      {
        id: "m1",
        author: "System",
        text: "Welcome to General!",
        ts: Date.now() - 60000,
      },
    ],
  });

  const [messagesByDM, setMessagesByDM] = useState<Record<string, Message[]>>(
    {},
  );
  const [unreadByDM, setUnreadByDM] = useState<Record<string, number>>({});
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});

  const [blockStatus, setBlockStatus] = useState({
    byMe: false,
    byThem: false,
  });
  const isChatLocked = blockStatus.byMe || blockStatus.byThem;

  // ============================================================================
  // 5. REFERENCES
  // ============================================================================
  const socketRef = useRef<Socket | null>(null);
  const chatIdByOther = useRef<Record<string, number>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  const selectedFriendIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<TabKey>("friends");
  const chatModeRef = useRef<string>("channel");

  // Game Invite State
  const [incomingInvite, setIncomingInvite] = useState<{
    fromId: number;
    username: string;
    avatarUrl: string;
  } | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<number | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  type PresencePayload = {
    userId: number;
    online: boolean;
    lastSeen: number | null;
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    selectedFriendIdRef.current = selectedFriendId;
  }, [selectedFriendId]);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    chatModeRef.current = chatMode;
  }, [chatMode]);

  // ============================================================================
  // 6. INITIALIZATION & SOCKET LOGIC
  // ============================================================================

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
        status: "offline",
      })),
    );

    setRequests(
      incomingRequest.map((r) => ({
        id: String(r.id),
        name: r.fromUser.username,
        avatarUrl: r.fromUser.avatarUrl ?? undefined,
        mutualFriends: 0,
      })),
    );
  };

  const sendGameInvite = (friendId?: string) => {
    const target = friendId || selectedFriendId;
    if (!target || !myUserId || !socketRef.current) return;

    const targetId = Number(target);
    setPendingInviteId(targetId);

    socketRef.current.emit("send_game_invite", {
      myId: myUserId,
      otherId: targetId,
    });
  };

  const cancelGameInvite = () => {
    if (!pendingInviteId || !myUserId || !socketRef.current) return;
    socketRef.current.emit("cancel_game_invite", {
      myId: myUserId,
      otherId: pendingInviteId,
    });
    setPendingInviteId(null);
  };

  const acceptInvite = () => {
    if (!incomingInvite || !myUserId || !socketRef.current) return;
    socketRef.current.emit("accept_game_invite", {
      myId: myUserId,
      otherId: incomingInvite.fromId,
    });
  };

  const declineInvite = () => {
    if (!incomingInvite || !myUserId || !socketRef.current) return;
    socketRef.current.emit("decline_game_invite", {
      myId: myUserId,
      otherId: incomingInvite.fromId,
    });
    setIncomingInvite(null);
  };

  const applySnapshot = (snapshot: PresencePayload[]) => {
    const byId = new Map(snapshot.map((x) => [x.userId, x]));
    setFriends((prev) =>
      prev.map((f) => {
        const p = byId.get(Number(f.id));
        if (!p) return f;
        return {
          ...f,
          status: p.online ? "online" : "offline",
          lastLogin: p.lastSeen
            ? new Date(p.lastSeen).toISOString()
            : f.lastLogin,
        };
      }),
    );
  };

  const applyUpdate = (p: PresencePayload) => {
    setFriends((prev) =>
      prev.map((f) => {
        if (Number(f.id) !== p.userId) return f;
        return {
          ...f,
          status: p.online ? "online" : "offline",
          lastLogin: p.lastSeen
            ? new Date(p.lastSeen).toISOString()
            : f.lastLogin,
        };
      }),
    );
  };

  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        const me = await apiGetMe(token);
        setMyUserId(me.id);
        await reload();
        const ps = getPresenceSocket();
        if (!ps) return;

        ps.on("presence:snapshot", applySnapshot);
        ps.on("presence:update", applyUpdate);

        ps.emit("presence:subscribe");

        if (!socketRef.current) {
          const s = io("/chat", {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            withCredentials: true,
            query: { userId: me.id },
          });
          socketRef.current = s;

          s.emit("join_channel", "general");
          s.emit("request_unread", me.id);

          s.on("unread_counts", (counts: Record<string, number>) => {
            const formatted: Record<string, number> = {};
            Object.keys(counts).forEach((k) => {
              formatted[k] = counts[k as keyof typeof counts];
            });
            setUnreadByDM(formatted);
          });

          s.on("channel_history", (data: any) => {
            if (data.channel && data.messages) {
              setMessagesByChannel((prev) => ({
                ...prev,
                [data.channel]: data.messages,
              }));
            }
          });

          s.on("channel_message", (msg: any) => {
            if (msg.channel) {
              setMessagesByChannel((prev) => ({
                ...prev,
                [msg.channel]: [
                  ...(prev[msg.channel] || []),
                  {
                    id: String(msg.id),
                    author: msg.sender?.username || "System",
                    text: msg.content,
                    ts: new Date(msg.createdAt).getTime(),
                    senderId: msg.senderId,
                  },
                ],
              }));
            }
          });

          s.on("dm_joined", (payload: any) => {
            const friendId = Object.keys(chatIdByOther.current).find(
              (k) => chatIdByOther.current[k] === payload.chatId,
            );

            if (friendId) {
              const msgs = (payload.messages || []).map((m: any) => ({
                id: String(m.id),
                author: m.sender?.username || "Unknown",
                text: m.content,
                ts: new Date(m.createdAt).getTime(),
                senderId: m.senderId,
                readAt: m.readAt,
              }));
              setMessagesByDM((prev) => ({ ...prev, [friendId]: msgs }));
            }
          });

          s.on("new_message", (msg: any) => {
            let friendId = Object.keys(chatIdByOther.current).find(
              (k) => chatIdByOther.current[k] == msg.chatId,
            );

            if (
              !friendId &&
              msg.senderId &&
              String(msg.senderId) != String(me.id)
            ) {
              friendId = String(msg.senderId);
              if (msg.chatId) chatIdByOther.current[friendId] = msg.chatId;
            }

            if (friendId) {
              setMessagesByDM((prev) => ({
                ...prev,
                [friendId]: [
                  ...(prev[friendId] || []),
                  {
                    id: String(msg.id),
                    author: msg.sender?.username || "",
                    text: msg.content,
                    ts: new Date(msg.createdAt).getTime(),
                    senderId: msg.senderId,
                    readAt: msg.readAt,
                  },
                ],
              }));

              const isViewing =
                activeTabRef.current === "chat" &&
                chatModeRef.current === "dm" &&
                selectedFriendIdRef.current === friendId;

              if (!isViewing && String(msg.senderId) != String(me.id)) {
                setUnreadByDM((prev) => ({
                  ...prev,
                  [friendId]: (prev[friendId] || 0) + 1,
                }));
              }
            }
          });

          s.on("user_typing", (data: any) => {
            const friendId = Object.keys(chatIdByOther.current).find(
              (k) => chatIdByOther.current[k] == data.chatId,
            );
            if (friendId) {
              setTypingStatus((prev) => ({
                ...prev,
                [friendId]: data.isTyping,
              }));
            }
          });

          s.on("messages_seen", (data: any) => {
            const friendId = Object.keys(chatIdByOther.current).find(
              (k) => chatIdByOther.current[k] == data.chatId,
            );
            if (friendId && data.seenByUserId !== me.id) {
              setMessagesByDM((prev) => {
                const currentMsgs = prev[friendId] || [];
                return {
                  ...prev,
                  [friendId]: currentMsgs.map((m) => ({
                    ...m,
                    readAt: new Date().toISOString(),
                  })),
                };
              });
            }
          });

          s.on("game_invite_received", (data: any) => {
            setIncomingInvite({
              fromId: data.fromId,
              username: data.username || "Unknown",
              avatarUrl: data.avatarUrl,
            });
          });

          s.on("invite_expired", () => {
            setIncomingInvite(null);
            setPendingInviteId(null);
            showNotification("Game invite expired.");
          });

          s.on("invite_declined", () => {
            setPendingInviteId(null);
            showNotification("User declined your invitation.");
          });

          s.on("invite_canceled_by_sender", () => {
            setIncomingInvite(null);
          });

          s.on("game_start_redirect", (data: { gameId: string }) => {
            setIncomingInvite(null);
            setPendingInviteId(null);
            navigate(`/game/${data.gameId}`);
          });
        }
      } catch (e) {
        console.error("Init failed", e);
      }
    };
    init();
    return () => {
      const ps = getPresenceSocket();
      if (ps) {
        ps.off("presence:snapshot", applySnapshot);
        ps.off("presence:update", applyUpdate);
      }
    };
  }, []);

  useEffect(() => {
    if (
      chatMode === "dm" &&
      selectedFriendId &&
      socketRef.current &&
      myUserId
    ) {
      const chatId = chatIdByOther.current[selectedFriendId];
      if (chatId) {
        socketRef.current.emit("mark_seen", { chatId, userId: myUserId });
        setUnreadByDM((prev) => ({ ...prev, [selectedFriendId]: 0 }));
      }
    }
  }, [messagesByDM, selectedFriendId, chatMode, myUserId]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    const container = chatMessagesRef.current;
    if (!container) return;
    const messageList =
      chatMode === "channel"
        ? messagesByChannel[selectedChannel] || []
        : selectedFriendId
          ? messagesByDM[selectedFriendId] || []
          : [];
    if (messageList.length === 0) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [
    activeTab,
    chatMode,
    selectedChannel,
    selectedFriendId,
    messagesByChannel,
    messagesByDM,
  ]);

  useEffect(() => {
    if (
      chatMode === "dm" &&
      selectedFriendId &&
      myUserId &&
      socketRef.current
    ) {
      setBlockStatus({ byMe: false, byThem: false });

      socketRef.current.emit(
        "check_block_status",
        { myId: myUserId, otherId: Number(selectedFriendId) },
        (response: { blockedByMe: boolean; blockedByThem: boolean }) => {
          setBlockStatus({
            byMe: response.blockedByMe,
            byThem: response.blockedByThem,
          });
        },
      );
    } else {
      setBlockStatus({ byMe: false, byThem: false });
    }
  }, [selectedFriendId, chatMode, myUserId]);

  // ============================================================================
  // 7. ACTIONS (Friends & Chat)
  // ============================================================================
  const sendFriendRequestByUsername = async () => {
    const token = getStoredToken();
    if (!token) return;
    const username = addUsername.trim();
    if (!username) return;

    if (
      friends.some((f) => f.name.toLowerCase() == username.toLocaleLowerCase())
    ) {
      setAddErr("you are already friend with this user");
      setAddMsg(null);
      return;
    }
    try {
      setAddLoading(true);
      setAddErr(null);
      setAddMsg(null);
      await apiAddFriend(token, username);
      setAddMsg("Friend request sent Success");
      setAddUsername("");
    } catch (e: any) {
      setAddErr(e?.message ?? "Request Send failed");
    } finally {
      setAddLoading(false);
    }
  };

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
            ts: new Date(m.createdAt).getTime(),
            senderId: m.senderId,
            readAt: m.readAt,
          }));

          setMessagesByDM((prev) => ({ ...prev, [friendId]: msgs }));
          socketRef.current?.emit("mark_seen", {
            chatId: payload.chatId,
            userId: myUserId,
          });
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

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (chatMode === "dm" && selectedFriendId && socketRef.current) {
      const chatId = chatIdByOther.current[selectedFriendId];
      if (!chatId) return;
      socketRef.current.emit("typing_start", {
        chatId,
        userId: myUserId,
        otherUserId: Number(selectedFriendId),
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing_stop", { chatId, userId: myUserId });
      }, 2000);
    }
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    if (chatMode === "channel") {
      if (socketRef.current && myUserId) {
        socketRef.current.emit("send_channel_message", {
          channel: selectedChannel,
          content: text,
          senderId: myUserId,
        });
      }
    } else if (chatMode === "dm" && selectedFriendId) {
      const chatId = chatIdByOther.current[selectedFriendId];
      if (socketRef.current && chatId && myUserId) {
        socketRef.current.emit("send_message", {
          chatId,
          senderId: myUserId,
          content: text,
        });
      } else {
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

  const blockUser = (friendIdToBlock: string) => {
    if (!friendIdToBlock) return;
    const fID = Number(friendIdToBlock);
    if (socketRef.current && myUserId) {
      socketRef.current.emit("block_user", {
        myId: myUserId,
        otherId: Number(fID),
      });
    }
    if (selectedFriendId === friendIdToBlock) {
      setBlockStatus((prev) => ({ ...prev, byMe: true }));
    }
  };

  const UnBlockUser = (friendIdToBlock: string) => {
    if (!friendIdToBlock) return;
    const fID = Number(friendIdToBlock);
    if (socketRef.current && myUserId) {
      socketRef.current.emit("unblock_user", {
        myId: myUserId,
        otherId: Number(fID),
      });
    }
    if (selectedFriendId === friendIdToBlock) {
      setBlockStatus((prev) => ({ ...prev, byMe: false }));
    }
  };

  // ============================================================================
  // 8. RENDER (UI)
  // ============================================================================
  return (
    <div className="w-full h-full text-white flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-lg border border-red-400 flex items-center gap-3">
            <span className="font-bold text-sm">{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="hover:bg-red-700 rounded-full p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Social Hub
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Friends, chat, and community
          </p>
        </div>

        {/* Main Tab Navigation */}
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            {(["friends", "chat"] as TabKey[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "chat") {
                    setChatMode("channel");
                    setSelectedChannel("general");
                    setSelectedFriendId(null);
                  }
                }}
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

      <div className="flex-1 overflow-hidden">
        {/* --- FRIENDS TAB CONTENT --- */}
        {activeTab === "friends" && (
          <div className="max-w-6xl mx-auto px-6 pb-10 space-y-6 h-full overflow-y-auto">
            {/* Friend Search & Sub-tabs */}
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

            {/* Friend List Grid */}
            {friendsSubTab === "friends" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/profile/${encodeURIComponent(f.name)}`)
                            }
                            className="flex items-center gap-3 text-left"
                          >
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
                          </button>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${pill.cls}`}
                          >
                            {pill.text}
                          </span>
                        </div>
                        <div className="mt-5 flex items-center gap-3">
                          <button
                            onClick={() => handleStartDirectMessage(f.id)}
                            className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => {
                              if (pendingInviteId === Number(f.id)) {
                                cancelGameInvite();
                              } else {
                                sendGameInvite(f.id);
                              }
                            }}
                            className={`p-2 rounded-md transition-colors text-white disabled:opacity-50 ${
                              pendingInviteId === Number(f.id)
                                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                : "bg-orange-600 hover:bg-orange-700"
                            }`}
                            disabled={
                              pendingInviteId !== null &&
                              pendingInviteId !== Number(f.id)
                            }
                            title={
                              pendingInviteId === Number(f.id)
                                ? "Cancel Invite"
                                : "Invite to Game"
                            }
                          >
                            {pendingInviteId === Number(f.id) ? (
                              <span className="text-xs font-bold px-1">X</span>
                            ) : (
                              <Gamepad2 className="w-4 h-4" />
                            )}
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

            {/* Friend Requests Grid */}
            {friendsSubTab === "requests" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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

            {/* Add Friend Form */}
            {friendsSubTab === "add" && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-5">
                  <div className="text-sm font-semibold text-gray-200">
                    Add by username
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={addUsername}
                      onChange={(e) => {
                        setAddUsername(e.target.value);
                        setAddErr(null);
                        setAddMsg(null);
                      }}
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

        {/* --- CHAT TAB CONTENT --- */}
        {activeTab === "chat" && (
          <div className="max-w-6xl mx-auto px-6 pb-10 h-full">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-full min-h-0">
              {/* Sidebar: Chat List */}
              <div className="space-y-6 h-full overflow-y-auto min-h-0 scrollbar-theme pr-2">
                {/* 1. Global Channels (Always Visible) */}
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
                  <div className="text-sm font-semibold text-gray-200 mb-2">
                    Channels
                  </div>
                  <div className="space-y-1">
                    {channels.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setChatMode("channel");
                          setSelectedChannel(c);
                          setSelectedFriendId(null);
                          if (socketRef.current)
                            socketRef.current.emit("join_channel", c);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
                          chatMode === "channel" && selectedChannel === c
                            ? "bg-blue-600/20 text-blue-100"
                            : "hover:bg-gray-800/60 text-gray-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold">
                          #
                        </div>
                        <span className="capitalize">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Private Chats */}
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-200">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        Private Chats
                      </span>
                    </div>
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

                  <ul className="mt-3 space-y-2">
                    {friends
                      .filter((f) =>
                        f.name.toLowerCase().includes(dmSearch.toLowerCase()),
                      )
                      .sort((a, b) => {
                        const lastA =
                          (messagesByDM[a.id] || []).slice(-1)[0]?.ts || 0;
                        const lastB =
                          (messagesByDM[b.id] || []).slice(-1)[0]?.ts || 0;
                        return lastB - lastA;
                      })
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

                {/* Online Now List */}
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

              {/* Chat Area (Messages & Input) */}
              <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 flex flex-col h-full min-h-0">
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

                {/* Messages Container */}
                <div
                  ref={chatMessagesRef}
                  className="flex-1 min-h-0 mt-3 space-y-3 overflow-y-auto scrollbar-theme pr-2"
                >
                  {(chatMode === "channel"
                    ? messagesByChannel[selectedChannel] || []
                    : selectedFriendId
                      ? messagesByDM[selectedFriendId] || []
                      : []
                  ).map((m, i, arr) => {
                    const date = new Date(m.ts);
                    const isToday =
                      new Date().toDateString() === date.toDateString();
                    const displayTime = isToday
                      ? date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : date.toLocaleDateString();
                    const isMe = m.senderId === myUserId;
                    const isMyLastMessage =
                      isMe &&
                      !arr
                        .slice(i + 1)
                        .some((next) => next.senderId === myUserId);

                    return (
                      <div
                        key={m.id}
                        className={`max-w-[80%] mb-4 flex flex-col ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                          <span className="text-gray-200 font-semibold">
                            {isMe ? "You" : m.author}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {displayTime}
                          </span>
                        </div>
                        <div
                          className={`px-4 py-2 rounded-2xl text-white ${isMe ? "bg-purple-600 rounded-tr-none" : "bg-gray-700 rounded-tl-none"}`}
                        >
                          {m.text}
                        </div>
                        {isMyLastMessage && chatMode === "dm" && m.readAt && (
                          <span className="text-[10px] text-gray-500 mt-1 mr-1 font-medium select-none">
                            Seen
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {chatMode === "dm" &&
                    selectedFriendId &&
                    typingStatus[selectedFriendId] && (
                      <div className="mr-auto items-start max-w-[80%] mb-4 flex flex-col animate-pulse">
                        <div className="text-xs text-gray-400 mb-1 ml-1">
                          {friends.find((f) => f.id === selectedFriendId)?.name}{" "}
                          is typing...
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-gray-700/50 rounded-tl-none text-gray-400 italic text-sm">
                          ...
                        </div>
                      </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!selectedFriendId) return;
                      if (blockStatus.byMe) {
                        UnBlockUser(selectedFriendId);
                      } else {
                        blockUser(selectedFriendId);
                      }
                    }}
                    className={`p-2 rounded-md text-white disabled:opacity-50 transition-colors ${
                      blockStatus.byMe
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                    disabled={chatMode !== "dm" || !selectedFriendId}
                    title={blockStatus.byMe ? "Unblock User" : "Block User"}
                  >
                    {blockStatus.byMe ? (
                      <LockKeyholeOpen className="w-4 h-4" />
                    ) : (
                      <LockKeyhole className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    value={isChatLocked ? "" : chatInput}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isChatLocked) sendMessage();
                    }}
                    placeholder={
                      blockStatus.byThem
                        ? "You have been blocked by this user."
                        : blockStatus.byMe
                          ? "You blocked this user. Unblock to chat."
                          : "Type your message..."
                    }
                    className={`flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none ${
                      isChatLocked
                        ? "cursor-not-allowed opacity-50 bg-gray-900"
                        : ""
                    }`}
                    disabled={
                      chatMode === "dm" && (!selectedFriendId || isChatLocked)
                    }
                  />
                  <button
                    onClick={sendMessage}
                    className="p-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    disabled={
                      chatMode === "dm" && (!selectedFriendId || isChatLocked)
                    }
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (pendingInviteId === Number(selectedFriendId)) {
                        cancelGameInvite();
                      } else {
                        sendGameInvite();
                      }
                    }}
                    className={`p-2 rounded-md transition-colors text-white disabled:opacity-50 ${
                      pendingInviteId === Number(selectedFriendId)
                        ? "bg-red-500 hover:bg-red-600 animate-pulse" // Cancel State
                        : "bg-orange-600 hover:bg-orange-700" // Invite State
                    }`}
                    disabled={
                      chatMode !== "dm" || !selectedFriendId || isChatLocked
                    }
                    title={
                      pendingInviteId === Number(selectedFriendId)
                        ? "Cancel Invite"
                        : "Invite to Game"
                    }
                  >
                    {pendingInviteId === Number(selectedFriendId) ? (
                      <span className="text-xs font-bold px-1">X</span>
                    ) : (
                      <Gamepad2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incoming Game Invite Modal */}
      {incomingInvite && (
        <div className="absolute top-28 right-4 z-50 bg-gray-900 border border-purple-500 rounded-xl p-4 shadow-2xl animate-bounce-in w-80">
          <div className="flex items-center gap-3 mb-3">
            {incomingInvite.avatarUrl ? (
              <img
                src={incomingInvite.avatarUrl}
                alt="avatar"
                className="w-12 h-12 rounded-full border-2 border-purple-500"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                {incomingInvite.username[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-bold text-white text-lg">
                {incomingInvite.username}
              </div>
              <div className="text-xs text-purple-300 font-medium">
                Invited you to play Pong!
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptInvite}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-green-900/50"
            >
              ACCEPT
            </button>
            <button
              onClick={declineInvite}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-bold transition-all hover:bg-red-600/80"
            >
              DECLINE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
