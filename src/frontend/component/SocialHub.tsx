import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
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
import { type Socket } from "socket.io-client";
import { getChatSocket } from "@/chatSocket";
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
import { getPresenceSocket, connectPresence } from "@/presenceSocket";

type TabKey = "friends" | "chat";

type Message = {
  id: string;
  author: string;
  text: string;
  ts: number;
  senderId?: number;
  readAt?: string | null;
};

interface ChannelHistoryPayload {
  channel: string;
  messages: Message[];
}

interface ChannelMessageEvent {
  id: string;
  channel: string;
  content: string;
  senderId: number;
  createdAt: string;
  sender: { username: string; avatarUrl: string | null };
}

interface DMMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  readAt: string | null;
  sender?: { username: string };
}

interface DMJoinedPayload {
  chatId: number;
  messages: DMMessage[];
}

interface NewMessageEvent {
  id: number;
  chatId: number;
  content: string;
  senderId: number;
  createdAt: string;
  readAt: string | null;
  sender?: { username: string };
}

interface UserTypingEvent {
  chatId: number;
  userId: number;
  isTyping: boolean;
}

interface MessagesSeenEvent {
  chatId: number;
  seenByUserId: number;
}

interface GameInviteReceivedEvent {
  fromId: number;
  username: string;
  avatarUrl: string;
}

export default function SocialHub() {
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

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
    { id: string; name: string; avatarUrl?: string }[]
  >([]);
  const [friendsSubTab, setFriendsSubTab] = useState<
    "friends" | "requests" | "add"
  >("friends");
  const [friendSearch, setFriendSearch] = useState("");

  const [addUsername, setAddUsername] = useState("");
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [dmSearch, setDmSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const MAX_MESSAGE_LENGTH = 141;

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
  const [dmPreviews, setDmPreviews] = useState<
    Record<string, { text: string; ts: number; senderId: number }>
  >({});

  const [blockStatus, setBlockStatus] = useState({
    byMe: false,
    byThem: false,
  });
  const isChatLocked = blockStatus.byMe || blockStatus.byThem;
  const socketRef = useRef<Socket | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);
  const needsPresenceUpdate = useRef(false);
  const chatIdByOther = useRef<Record<string, number>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollRef = useRef(false);

  const selectedFriendIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<TabKey>("friends");
  const chatModeRef = useRef<string>("channel");

  const [pendingInviteId, setPendingInviteId] = useState<number | null>(null);

  type PresencePayload = {
    userId: number;
    online: boolean;
    lastSeen: number | null;
  };

  const triggerToast = (msg: string) => {
    window.dispatchEvent(new CustomEvent("app_toast", { detail: msg }));
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

  function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }
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
      })),
    );
    needsPresenceUpdate.current = true;
    emitPresenceSubscribe();
    
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

  const applySnapshot = useCallback((snapshot: PresencePayload[]) => {
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
  }, []);

  const applyUpdate = useCallback((p: PresencePayload) => {
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
  }, []);

  const emitPresenceSubscribe = useCallback(() => {
    if (presenceSocketRef.current) {
      presenceSocketRef.current.emit("presence:subscribe");
    } else {
      needsPresenceUpdate.current = true;
    }
  }, []);

     useEffect(() => {
    if (needsPresenceUpdate.current && presenceSocketRef.current) {
      presenceSocketRef.current.emit("presence:subscribe");
      needsPresenceUpdate.current = false;
    }
  }, [friends, emitPresenceSubscribe]); 
  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        const me = await apiGetMe(token);
        setMyUserId(me.id);
        const ps = connectPresence(token);
        if (ps){
            presenceSocketRef.current = ps;
            if (!ps.connected) {
                ps.connect();
            }
            ps.on("presence:snapshot", applySnapshot);
            ps.on("presence:update", applyUpdate);
             ps.on("connect", () => {
            emitPresenceSubscribe();
          });
          if (ps.connected) {
             emitPresenceSubscribe();
          }
        }
        await reload();
        if (!socketRef.current) {
          const s = getChatSocket();
          if (!s) return;
          socketRef.current = s;

          s.emit("join_channel", "general");
          s.emit("request_unread", me.id);
          s.emit("request_dm_previews", me.id);

          s.on(
            "dm_previews",
            (
              previews: Record<
                string,
                { text: string; ts: number; senderId: number }
              >,
            ) => {
              setDmPreviews(previews);
            },
          );

          s.on("unread_counts", (counts: Record<string, number>) => {
            const formatted: Record<string, number> = {};
            Object.keys(counts).forEach((k) => {
              formatted[k] = counts[k as keyof typeof counts];
            });
            setUnreadByDM(formatted);
          });

          s.on("channel_history", (data: ChannelHistoryPayload) => {
            if (data.channel && data.messages) {
              setMessagesByChannel((prev) => ({
                ...prev,
                [data.channel]: data.messages,
              }));
            }
          });

          s.on("channel_message", (msg: ChannelMessageEvent) => {
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

          s.on("dm_joined", (payload: DMJoinedPayload) => {
            const friendId = Object.keys(chatIdByOther.current).find(
              (k) => chatIdByOther.current[k] === payload.chatId,
            );

            if (friendId) {
              const msgs = (payload.messages || []).map((m: DMMessage) => ({
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

          s.on("new_message", (msg: NewMessageEvent) => {
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
              const newMsg = {
                id: String(msg.id),
                author: msg.sender?.username || "",
                text: msg.content,
                ts: new Date(msg.createdAt).getTime(),
                senderId: msg.senderId,
                readAt: msg.readAt,
              };
              setMessagesByDM((prev) => ({
                ...prev,
                [friendId]: [...(prev[friendId] || []), newMsg],
              }));

              setDmPreviews((prev) => ({
                ...prev,
                [friendId]: {
                  text: msg.content,
                  ts: newMsg.ts,
                  senderId: msg.senderId,
                },
              }));

              const isViewing =
                activeTabRef.current === "chat" &&
                chatModeRef.current === "dm" &&
                selectedFriendIdRef.current === friendId;

              if (isViewing && String(msg.senderId) != String(me.id)) {
                shouldScrollRef.current = true;
              }

              if (!isViewing && String(msg.senderId) != String(me.id)) {
                setUnreadByDM((prev) => ({
                  ...prev,
                  [friendId]: (prev[friendId] || 0) + 1,
                }));
              }
            }
          });

          s.on("user_typing", (data: UserTypingEvent) => {
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

          s.on("messages_seen", (data: MessagesSeenEvent) => {
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

          s.on("invite_error", () => {
            setPendingInviteId(null);
          });
          s.on("invite_expired", () => {
            setPendingInviteId(null);
          });
          s.on("invite_declined", () => {
            setPendingInviteId(null);
          });
          s.on("chat_error", (message: string) => {
            triggerToast(message);
          }); 
          s.on(
            "user_blocked",
            (data: { blockerId: number; blockedId: number }) => {
              const currentFriend = selectedFriendIdRef.current;
              if (!currentFriend) return;
              const friendNum = Number(currentFriend);
              if (data.blockerId === me.id && data.blockedId === friendNum) {
                setBlockStatus((prev) => ({ ...prev, byMe: true }));
              } else if (
                data.blockerId === friendNum &&
                data.blockedId === me.id
              ) {
                setBlockStatus((prev) => ({ ...prev, byThem: true }));
              }
            },
          );

          s.on(
            "user_unblocked",
            (data: { unblockerId: number; unblockedId: number }) => {
              const currentFriend = selectedFriendIdRef.current;
              if (!currentFriend) return;
              const friendNum = Number(currentFriend);
              if (
                data.unblockerId === me.id &&
                data.unblockedId === friendNum
              ) {
                setBlockStatus((prev) => ({ ...prev, byMe: false }));
              } else if (
                data.unblockerId === friendNum &&
                data.unblockedId === me.id
              ) {
                setBlockStatus((prev) => ({ ...prev, byThem: false }));
              }
            },
          );
        }
      } catch (_) {}
    };
    init();
    return () => {
      const ps = presenceSocketRef.current;
      if (ps) {
        ps.off("presence:snapshot", applySnapshot);
        ps.off("presence:update", applyUpdate);
        ps.off("connect");
      }
      if (socketRef.current){
        const s = socketRef.current;
        s.off("dm_previews");
        s.off("unread_counts");
        s.off("channel_history");
        s.off("channel_message");
        s.off("dm_joined");
        s.off("new_message");
        s.off("user_typing");
        s.off("messages_seen");
        s.off("invite_error");
        s.off("invite_expired");
        s.off("invite_declined");
        s.off("chat_error");
        s.off("user_blocked");
        s.off("user_unblocked");
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
    if (!shouldScrollRef.current) return;
    const container = chatMessagesRef.current;
    if (!container) return;
    shouldScrollRef.current = false;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messagesByChannel, messagesByDM]);

  useEffect(() => {
    if (activeTab !== "chat" || chatMode !== "channel") return;
    const container = chatMessagesRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [activeTab, chatMode, messagesByChannel, selectedChannel]);

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

  const sendFriendRequestByUsername = async () => {
    const token = getStoredToken();
    if (!token) return;
    const username = addUsername.trim();
    if (!username) return;
    try {
      setAddLoading(true);
      setAddErr(null);
      setAddMsg(null);
      await apiAddFriend(token, username);
      setAddMsg("Friend request sent Success");
      setAddUsername("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Request Send failed";
      setAddErr(message);
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
        triggerToast(e instanceof Error ? e.message : "Failed to accept friend");
    }
  };

  const declineFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiDeclineFriend(token, id);
      await reload();
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : "Failed to decline friend");
    }
  };

  const removeFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiRemoveFriend(token, id);
      await reload();
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : "Failed to remove friend");
    }
  };

  const handleStartDirectMessage = (friendId: string) => {
    setSelectedFriendId(friendId);
    setChatMode("dm");
    setActiveTab("chat");
    setUnreadByDM((prev) => ({ ...prev, [friendId]: 0 }));

    if (socketRef.current && myUserId) {
      const onJoinHandler = (payload: DMJoinedPayload) => {
        if (payload.chatId) {
          chatIdByOther.current[friendId] = payload.chatId;
          const msgs = (payload.messages || []).map((m: DMMessage) => ({
            id: String(m.id),
            author: m.sender?.username || "Unknown",
            text: m.content,
            ts: new Date(m.createdAt).getTime(),
            senderId: m.senderId,
            readAt: m.readAt,
          }));

          setMessagesByDM((prev) => ({ ...prev, [friendId]: msgs }));
          shouldScrollRef.current = true;
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
    if (text.length > MAX_MESSAGE_LENGTH) {
      triggerToast(
        `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
      );
      return;
    }

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
    shouldScrollRef.current = true;
    setChatInput("");
  };

  const blockUser = (friendIdToBlock: string) => {
    if (!friendIdToBlock) return;
    if (socketRef.current && myUserId) {
      socketRef.current.emit("block_user", {
        myId: myUserId,
        otherId: Number(friendIdToBlock),
      });
    }
  };

  const UnBlockUser = (friendIdToBlock: string) => {
    if (!friendIdToBlock) return;
    if (socketRef.current && myUserId) {
      socketRef.current.emit("unblock_user", {
        myId: myUserId,
        otherId: Number(friendIdToBlock),
      });
    }
  };

  return (
    <div className="w-full h-full text-white flex flex-col">

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
              {friendsSubTab === "friends" && (
                <>
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
                              ? {
                                  text: "Away",
                                  cls: "bg-yellow-600 text-black",
                                }
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
                                navigate(
                                  `/profile/${encodeURIComponent(f.name)}`,
                                )
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
                                  {f.lastLogin && pill.text === "Offline" && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{timeAgo(f.lastLogin)}</span>
                                    </div>
                                  )}
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
                                f.status === "offline" ||
                                isChatLocked ||
                                (pendingInviteId !== null &&
                                  pendingInviteId !== Number(f.id))
                              }
                              title={
                                f.status === "offline"
                                  ? "User is offline"
                                  : pendingInviteId === Number(f.id)
                                    ? "Cancel Invite"
                                    : "Invite to Game"
                              }
                            >
                              {pendingInviteId === Number(f.id) ? (
                                <span className="text-xs font-bold px-1">
                                  X
                                </span>
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
              </>
            )}

            {friendsSubTab === "requests" && (
              <>
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
              </>
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 sm:pb-20 h-full">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-6 h-full min-h-0">
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
                          (messagesByDM[a.id] || []).slice(-1)[0]?.ts ||
                          dmPreviews[a.id]?.ts ||
                          0;
                        const lastB =
                          (messagesByDM[b.id] || []).slice(-1)[0]?.ts ||
                          dmPreviews[b.id]?.ts ||
                          0;
                        return lastB - lastA;
                      })
                      .map((f) => {
                        const last = (messagesByDM[f.id] || []).slice(-1)[0];
                        const preview = dmPreviews[f.id];
                        const lastText = last?.text || preview?.text || "";
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
                                  {lastText || ""}
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
                          className={`px-4 py-2 rounded-2xl text-white break-all whitespace-pre-wrap ${isMe ? "bg-purple-600 rounded-tr-none" : "bg-gray-700 rounded-tl-none"}`}
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (!selectedFriendId) return;
                      if (blockStatus.byMe) {
                        UnBlockUser(selectedFriendId);
                      } else {
                        blockUser(selectedFriendId);
                      }
                    }}
                    className={`shrink-0 p-2 rounded-md text-white disabled:opacity-50 transition-colors ${
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
                    className={`flex-1 min-w-[180px] px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none ${
                      isChatLocked
                        ? "cursor-not-allowed opacity-50 bg-gray-900"
                        : chatInput.trim().length > MAX_MESSAGE_LENGTH
                          ? "border-red-500"
                          : ""
                    }`}
                    maxLength={MAX_MESSAGE_LENGTH + 50}
                    disabled={
                      chatMode === "dm" && (!selectedFriendId || isChatLocked)
                    }
                  />
                  {chatInput.length > 0 && (
                    <span
                      className={`shrink-0 text-xs tabular-nums whitespace-nowrap ${
                        chatInput.trim().length > MAX_MESSAGE_LENGTH
                          ? "text-red-400 font-bold"
                          : chatInput.trim().length > MAX_MESSAGE_LENGTH * 0.9
                            ? "text-yellow-400"
                            : "text-gray-500"
                      }`}
                    >
                      {chatInput.trim().length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
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
                          ? "bg-red-500 hover:bg-red-600 animate-pulse"
                          : "bg-orange-600 hover:bg-orange-700"
                      }`}
                      disabled={
                        chatMode !== "dm" ||
                        !selectedFriendId ||
                        isChatLocked ||
                        friends.find((x) => x.id === selectedFriendId)
                          ?.status === "offline"
                      }
                      title={
                        friends.find((x) => x.id === selectedFriendId)
                          ?.status === "offline"
                          ? "User is offline"
                          : pendingInviteId === Number(selectedFriendId)
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
          </div>
        )}
      </div>
    </div>
  );
}
