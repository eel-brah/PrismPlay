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
  Ban,
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

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================
type TabKey = "friends" | "chat" | "groups";

type Message = { 
  id: string; 
  author: string; 
  text: string; 
  ts: number; 
  senderId?: number; 
  readAt?: string | null 
};

export default function SocialHub() {
  // ============================================================================
  // 2. SYSTEM & GLOBAL STATE
  // ============================================================================
  // Holds the ID of the logged-in user to identify "Me" vs "Them"
  const [myUserId, setMyUserId] = useState<number | null>(null);
  
  // Controls which main tab is visible (Friends list, Chat interface, or Groups)
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

  // ============================================================================
  // 3. FRIENDS FEATURE STATE
  // ============================================================================
  // Stores the list of confirmed friends
  const [friends, setFriends] = useState<{
      id: string;
      name: string;
      lastLogin: string | null;
      createdAt: string;
      avatarUrl?: string;
      status?: string; // Added optional status for UI pills
    }[]>([]);
  const navigate = useNavigate();
  // Stores incoming friend requests
  const [requests, setRequests] = useState<{ id: string; name: string; avatarUrl?: string; mutualFriends?: number }[]>([]);
  
  // Controls the sub-tab inside the Friends section (List, Requests, or Add New)
  const [friendsSubTab, setFriendsSubTab] = useState<"friends" | "requests" | "add">("friends");
  
  // Search input value for filtering the friends list
  const [friendSearch, setFriendSearch] = useState("");

  // 'Add Friend' inputs and status messages
  const [addUsername, setAddUsername] = useState("");
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // ============================================================================
  // 4. CHAT FEATURE STATE
  // ============================================================================
  // Determines if we are looking at a "Channel" (Global) or "DM" (Private)
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  
  // Stores the ID of the friend we are currently privately chatting with
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  
  // Search input for filtering the active chats list
  const [dmSearch, setDmSearch] = useState("");
  
  // Stores the text currently being typed in the chat box
  const [chatInput, setChatInput] = useState("");
  
  // Holds all messages mapped by Channel Name (e.g., 'general')
  const channels = useMemo(() => ["general"], []);
  const [selectedChannel, setSelectedChannel] = useState<string>(channels[0]);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    general: [{ id: "m1", author: "System", text: "Welcome to General!", ts: Date.now() - 60000 }],
    lobby: [{ id: "m2", author: "System", text: "Chat with players in the lobby.", ts: Date.now() - 120000 }],
    support: [{ id: "m3", author: "System", text: "Need help? Ask here.", ts: Date.now() - 240000 }],
  });

  // Holds all private messages mapped by Friend ID
  const [messagesByDM, setMessagesByDM] = useState<Record<string, Message[]>>({});
  
  // Tracks unread message counts for each friend
  const [unreadByDM, setUnreadByDM] = useState<Record<string, number>>({});
  
  // Tracks if a specific friend is currently typing (mapped by friend ID)
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});

  // const [isBlocked, setIsBlocked] = useState(false); //  checking block status
  const [blockStatus, setBlockStatus] = useState({ byMe: false, byThem: false });
  const isChatLocked = blockStatus.byMe || blockStatus.byThem;

  // ============================================================================
  // 5. GROUPS FEATURE STATE (Mock Data)
  // ============================================================================
  // List of groups available to join
  const [groups, setGroups] = useState<{ id: string; name: string; members: number; joined: boolean }[]>([
    { id: "g1", name: "Casual Players", members: 42, joined: true },
    { id: "g2", name: "Ranked Grind", members: 18, joined: false },
    { id: "g3", name: "Weekend Warriors", members: 27, joined: false },
  ]);
  
  // ID of the currently selected group
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>("g1");
  
  // Messages for groups, mapped by Group ID
  const [messagesByGroup, setMessagesByGroup] = useState<Record<string, Message[]>>({
    g1: [{ id: "gmsg1", author: "System", text: "Welcome to Casual Players", ts: Date.now() - 180000 }],
  });
  
  // Inputs for creating a group or chatting in one
  const [newGroupName, setNewGroupName] = useState("");
  const [groupChatInput, setGroupChatInput] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // ============================================================================
  // 6. REFERENCES (Non-rendering variables)
  // ============================================================================
  // The actual Socket.io connection instance
  const socketRef = useRef<Socket | null>(null);
  
  // Maps a Friend's UserID to a specific ChatRoom ID (e.g., User 5 -> Chat 102)
  const chatIdByOther = useRef<Record<string, number>>({});
  
  // Timer to stop the "Typing..." indicator after a few seconds of inactivity
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Scroll refs: these point to the scrollable message containers so we can auto-scroll to bottom
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const groupMessagesRef = useRef<HTMLDivElement | null>(null);
  
  // Tracks who we are currently looking at to prevent unread badges from appearing while chatting
  const selectedFriendIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<TabKey>("friends"); // New
  const chatModeRef = useRef<string>("channel");  // New


  // Game Invite State
  const [incomingInvite, setIncomingInvite] = useState<{ fromId: number; username: string; avatarUrl: string } | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<number | null>(null); // ID of person I invited

  useEffect(() => { selectedFriendIdRef.current = selectedFriendId; }, [selectedFriendId]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { chatModeRef.current = chatMode; }, [chatMode]); 

  // ============================================================================
  // 7. INITIALIZATION & SOCKET LOGIC
  // ============================================================================
  
  // Helper to fetch friends/requests from API
  const reload = async () => {
    const token = getStoredToken();
    if (!token) return;

    const [friendList, incomingRequest] = await Promise.all([
      apiListFriends(token),
      apiIncomingRequests(token),
    ]);

    setFriends(friendList.map((r) => ({
        id: String(r.friend.id),
        name: r.friend.username,
        lastLogin: r.friend.lastLogin,
        createdAt: r.friend.createdAt,
        avatarUrl: r.friend.avatarUrl ?? undefined,
        status: "offline", // Default status
    })));

    setRequests(incomingRequest.map((r) => ({
        id: String(r.id),
        name: r.fromUser.username,
        avatarUrl: r.fromUser.avatarUrl ?? undefined,
        mutualFriends: 0, 
    })));
  };

  const sendGameInvite = () => {
    if (!selectedFriendId || !myUserId || !socketRef.current) return;
    
    const targetId = Number(selectedFriendId);
    
    // Optimistic UI update
    setPendingInviteId(targetId);
    
    socketRef.current.emit("send_game_invite", { 
      myId: myUserId, 
      otherId: targetId 
    });
  };

  const cancelGameInvite = () => {
    if (!pendingInviteId || !myUserId || !socketRef.current) return;
    
    socketRef.current.emit("cancel_game_invite", { 
      myId: myUserId, 
      otherId: pendingInviteId 
    });
    setPendingInviteId(null);
  };

  const acceptInvite = () => {
    if (!incomingInvite || !myUserId || !socketRef.current) return;
    
    socketRef.current.emit("accept_game_invite", { 
      myId: myUserId, 
      otherId: incomingInvite.fromId 
    });
  };

  const declineInvite = () => {
    if (!incomingInvite || !myUserId || !socketRef.current) return;
    
    socketRef.current.emit("decline_game_invite", { 
      myId: myUserId, 
      otherId: incomingInvite.fromId 
    });
    setIncomingInvite(null);
  };
  // Main Effect: Connects Socket and sets up Listeners
  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        const me = await apiGetMe(token);
        setMyUserId(me.id);
        await reload();

        if (!socketRef.current) {
          // CONNECT TO THE /chat NAMESPACE
          const s = io("/chat", {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            withCredentials: true,
            query: { userId: me.id },
          });
          socketRef.current = s;
          // Join General Chat immediately
          s.emit("join_channel", "general");
          // 1. Request Unread Counts (Fixes missing red badges on reload/return)
          s.emit("request_unread", me.id);

          // 2. Listener for the response
          s.on("unread_counts", (counts: Record<string, number>) => {
             // Convert keys to string just in case
             const formatted: Record<string, number> = {};
             Object.keys(counts).forEach(k => {
                formatted[k] = counts[k as keyof typeof counts];
             });
             setUnreadByDM(formatted);
          });
          // LISTENER: Load Channel History (Persistence Fix)
          s.on("channel_history", (data: any) => {
             if (data.channel && data.messages) {
               setMessagesByChannel((prev) => ({
                 ...prev,
                 [data.channel]: data.messages
               }));
             }
          });

          // LISTENER: General/Channel Messages
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

          // LISTENER: When joining a DM, load history
          s.on("dm_joined", (payload: any) => {
             const friendId = Object.keys(chatIdByOther.current).find(
               (k) => chatIdByOther.current[k] === payload.chatId
             );

             if (friendId) {
                const msgs = (payload.messages || []).map((m: any) => ({
                  id: String(m.id),
                  author: m.sender?.username || "Unknown",
                  text: m.content,
                  ts: new Date(m.createdAt).getTime(),
                  senderId: m.senderId,
                  readAt: m.readAt
                }));
                setMessagesByDM((prev) => ({ ...prev, [friendId]: msgs }));
             }
          });

          // LISTENER: Incoming new messages
          s.on("new_message", (msg: any) => {
             // 1. Identify friend by Chat ID
             let friendId = Object.keys(chatIdByOther.current).find(
               (k) => chatIdByOther.current[k] == msg.chatId
             );

             // 2. Fallback: Identify friend by Sender ID if chat not yet mapped
             if (!friendId && msg.senderId && String(msg.senderId) != String(me.id)) {
                 friendId = String(msg.senderId);
                 if (msg.chatId) chatIdByOther.current[friendId] = msg.chatId;
             }

             if (friendId) {
               // Update Messages
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
                     readAt: msg.readAt
                   },
                 ],
               }));

               // Update Notification Badge (if not currently looking at this chat)
               const isViewing = 
                 activeTabRef.current === "chat" && 
                 chatModeRef.current === "dm" && 
                 selectedFriendIdRef.current === friendId;

               // If NOT viewing (or message is not from me), show red badge
               if (!isViewing && String(msg.senderId) != String(me.id)) {
                   setUnreadByDM((prev) => ({
                       ...prev,
                       [friendId]: (prev[friendId] || 0) + 1
                   }));
               }
             }
          });

          // LISTENER: Typing status updates
          s.on("user_typing", (data: any) => {
             const friendId = Object.keys(chatIdByOther.current).find(
               (k) => chatIdByOther.current[k] == data.chatId
             );
             if (friendId) {
               setTypingStatus(prev => ({ ...prev, [friendId]: data.isTyping }));
             }
          });

          // LISTENER: Messages marked as seen
          s.on("messages_seen", (data: any) => {
             const friendId = Object.keys(chatIdByOther.current).find(
               (k) => chatIdByOther.current[k] == data.chatId
             );
             if (friendId && data.seenByUserId !== me.id) {
                setMessagesByDM((prev) => {
                  const currentMsgs = prev[friendId] || [];
                  return {
                    ...prev,
                    [friendId]: currentMsgs.map(m => ({ ...m, readAt: new Date().toISOString() }))
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

          // LISTENER: Invite expired
          s.on("invite_expired", () => {
            setIncomingInvite(null);
            setPendingInviteId(null);
            alert("Game invite expired.");
          });

          // LISTENER: Invite declined
          s.on("invite_declined", () => {
            setPendingInviteId(null);
            alert("User declined your invitation.");
          });

          // LISTENER: Invite canceled by sender
          s.on("invite_canceled_by_sender", () => {
            setIncomingInvite(null);
          });

          // LISTENER: Game Start!
          s.on("game_start_redirect", (data: { gameId: string }) => {
            // Clean up state
            setIncomingInvite(null);
            setPendingInviteId(null);
            // Navigate to the game
            navigate(`/game/${data.gameId}`);
          });
        }
      } catch (e) {
        console.error("Init failed", e);
      }
    };
    init();
  }, []);

  // Effect: Automatically mark messages as seen when viewing a chat
  useEffect(() => {
    if (chatMode === "dm" && selectedFriendId && socketRef.current && myUserId) {
      const chatId = chatIdByOther.current[selectedFriendId];
      if (chatId) {
        socketRef.current.emit("mark_seen", { chatId, userId: myUserId });
        setUnreadByDM(prev => ({...prev, [selectedFriendId]: 0}));
      }
    }
  }, [messagesByDM, selectedFriendId, chatMode, myUserId]);

  // Effect: Auto-scroll chat messages to bottom when new messages arrive
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
  }, [activeTab, chatMode, selectedChannel, selectedFriendId, messagesByChannel, messagesByDM]);

  // Check block status whenever the selected friend changes
useEffect(() => {
  if (chatMode === "dm" && selectedFriendId && myUserId && socketRef.current) {
    // Reset state
    setBlockStatus({ byMe: false, byThem: false });
    
    socketRef.current.emit(
      "check_block_status", 
      { myId: myUserId, otherId: Number(selectedFriendId) }, 
      (response: { blockedByMe: boolean; blockedByThem: boolean }) => {
         setBlockStatus({ 
           byMe: response.blockedByMe, 
           byThem: response.blockedByThem 
         });
      }
    );
  } else {
    setBlockStatus({ byMe: false, byThem: false });
  }
}, [selectedFriendId, chatMode, myUserId]);


  
  // Effect: Auto-scroll group messages to bottom when new messages arrive
  useEffect(() => {
    if (activeTab !== "groups") return;
    const container = groupMessagesRef.current;
    if (!container) return;
    const messageList = selectedGroupId
      ? messagesByGroup[selectedGroupId] || []
      : [];
    if (messageList.length === 0) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [activeTab, selectedGroupId, messagesByGroup]);
  // ============================================================================
  const sendFriendRequestByUsername = async () => {
    const token = getStoredToken();
    if (!token) return;
    const username = addUsername.trim();
    if (!username) return;

    if (friends.some((f) => f.name.toLowerCase() == username.toLocaleLowerCase())) {
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
    } catch (e) { console.log(e); }
  };

  const declineFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiDeclineFriend(token, id);
      await reload();
    } catch (e) { console.log(e); }
  };

  const removeFriend = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      await apiRemoveFriend(token, id);
      await reload();
    } catch (e) { console.log(e); }
  };

  // ============================================================================
  // 9. CHAT HELPER FUNCTIONS
  // ============================================================================
  const handleStartDirectMessage = (friendId: string) => {
    setSelectedFriendId(friendId);
    setChatMode("dm");
    setActiveTab("chat");
    setUnreadByDM((prev) => ({ ...prev, [friendId]: 0 }));

    if (socketRef.current && myUserId) {
      // Temporary listener to catch the Join response
      const onJoinHandler = (payload: any) => {
        if (payload.chatId) {
           chatIdByOther.current[friendId] = payload.chatId;
           const msgs = (payload.messages || []).map((m: any) => ({
              id: String(m.id),
              author: m.sender?.username || "Unknown",
              text: m.content,
              ts: new Date(m.createdAt).getTime(),
              senderId: m.senderId,
              readAt: m.readAt 
           }));

           setMessagesByDM((prev) => ({ ...prev, [friendId]: msgs }));
           
           // Mark as seen immediately upon join
           socketRef.current?.emit("mark_seen", { chatId: payload.chatId, userId: myUserId });
           socketRef.current?.off("dm_joined", onJoinHandler);
        }
      };

      socketRef.current.on("dm_joined", onJoinHandler);
      socketRef.current.emit("join_dm", { myId: myUserId, otherUserId: Number(friendId) });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (chatMode === "dm" && selectedFriendId && socketRef.current) {
      const chatId = chatIdByOther.current[selectedFriendId];
      if (!chatId) return;
      socketRef.current.emit("typing_start", { chatId, userId: myUserId, otherUserId: Number(selectedFriendId) });
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
      // Send to General Channel via Socket
      if (socketRef.current && myUserId) {
        socketRef.current.emit("send_channel_message", { 
          channel: selectedChannel, 
          content: text,
          senderId: myUserId 
        });
      }
    } else if (chatMode === "dm" && selectedFriendId) {
      const chatId = chatIdByOther.current[selectedFriendId];
      if (socketRef.current && chatId && myUserId) {
        socketRef.current.emit("send_message", { 
          chatId, 
          senderId: myUserId, 
          content: text 
        });
      } else {
        // Fallback Optimistic UI
        setMessagesByDM((prev) => ({
          ...prev,
          [selectedFriendId]: [
            ...(prev[selectedFriendId] || []),
            { id: Math.random().toString(36).slice(2), author: "You", text, ts: Date.now() },
          ],
        }));
      }
    }
    setChatInput("");
  };


///

  const blockUser = (friendIdToBlock: string) => {
    if (!friendIdToBlock) return;
    const fID = Number(friendIdToBlock);
    // if (chatMode === "dm" && Number(selectedFriendId) === fID) {
    //   setSelectedFriendId(null);
    // }
    if (socketRef.current && myUserId)
    {
      socketRef.current.emit("block_user", { myId: myUserId, otherId: Number(fID)});
    }

        if (selectedFriendId === friendIdToBlock) {
              setBlockStatus(prev => ({ ...prev, byMe: true }));    }
  };


    const UnBlockUser = (friendIdToBlock: string) => {
    if (!friendIdToBlock) return;
    const fID = Number(friendIdToBlock);
    if (socketRef.current && myUserId)
    {
      socketRef.current.emit("unblock_user", { myId: myUserId, otherId: Number(fID)});
    }
    if (selectedFriendId === friendIdToBlock) {
setBlockStatus(prev => ({ ...prev, byMe: false }));    }

  };

// const checkBlockStatus = (myId: number, friendId: number):boolean => {
//   if (socketRef.current) {
//     socketRef.current.emit(
//       "is_user_blocked", 
//       { senderId: myId, userId: friendId }, (response: { isBlocked: boolean }) => { 
//         return response.isBlocked;
//       }
//     );
//   }
// };

  // ============================================================================
  // 10. GROUP HELPER FUNCTIONS
  // ============================================================================
  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = Math.random().toString(36).slice(2);
    setGroups((prev) => [...prev, { id, name, members: 1, joined: true }]);
    setMessagesByGroup((prev) => ({
      ...prev,
      [id]: [{ id: Math.random().toString(36).slice(2), author: "System", text: `Welcome to ${name}`, ts: Date.now() }],
    }));
    setSelectedGroupId(id);
    setNewGroupName("");
  };

  const toggleJoinGroup = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, joined: !g.joined } : g)));
  };

  // ============================================================================
  // 11. RENDER (UI)
  // ============================================================================
  return (
    <div className="w-full h-full text-white flex flex-col">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Social Hub
          </h2>
          <p className="text-sm text-gray-400 mt-1">Friends, chat, and groups</p>
        </div>
        
        {/* Main Tab Navigation */}
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            {(["friends", "chat", "groups"] as TabKey[]).map((key) => (
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
                  activeTab === key ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
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
                      friendsSubTab === t ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"
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
                {friends.filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase())).map((f) => {
                    const pill = f.status === "online"
                        ? { text: "Online", cls: "bg-green-600 text-white" }
                        : f.status === "in_game"
                          ? { text: "In Game", cls: "bg-blue-600 text-white" }
                          : f.status === "away"
                            ? { text: "Away", cls: "bg-yellow-600 text-black" }
                            : { text: "Offline", cls: "bg-gray-600 text-white" };
                    return (
                      <div key={f.id} className="rounded-2xl border border-white/10 bg-gray-900/60 shadow-xl p-5">
                        {/* <a href="windown." */}
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
                              <img src={f.avatarUrl} alt={f.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                            )}
                            <div>
                              <div className="font-semibold text-gray-100">{f.name}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{f.lastLogin}</span>
                              </div>
                            </div>
                          </div>
                          </button>
                          <span className={`text-xs px-2 py-1 rounded-full ${pill.cls}`}>
                            {pill.text}
                          </span>
                        </div>
                        <div className="mt-5 flex items-center gap-3">
                          <button onClick={() => handleStartDirectMessage(f.id)} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white">
                            Chat
                          </button>
                          <button className="px-4 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200 flex items-center gap-2">
                            <Gamepad2 className="w-4 h-4" />
                            <span>Play</span>
                          </button>
                          <button onClick={() => removeFriend(f.id)} className="ml-auto p-2 rounded-md bg-gray-800/60 hover:bg-gray-800 text-gray-300">
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
                {requests.filter((r) => r.name.toLowerCase().includes(friendSearch.toLowerCase())).map((r) => (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-gray-900/60 shadow-xl p-5">
                      <div className="flex items-center gap-3">
                        {r.avatarUrl ? (
                          <img src={r.avatarUrl} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-100">{r.name}</div>
                          <div className="text-xs text-gray-400">{r.mutualFriends || 0} mutual friends</div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button onClick={() => { acceptFriend(r.id); setRequests((prev) => prev.filter((x) => x.id !== r.id)); }} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">
                          Accept
                        </button>
                        <button onClick={() => { declineFriend(r.id); setRequests((prev) => prev.filter((x) => x.id !== r.id)); }} className="px-4 py-2 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200">
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
                  <div className="text-sm font-semibold text-gray-200">Add by username</div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={addUsername}
                      onChange={(e) => { setAddUsername(e.target.value); setAddErr(null); setAddMsg(null); }}
                      placeholder="Enter username (exact)..."
                      className="flex-1 min-w-0 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700"
                      onKeyDown={(e) => { if (e.key === "Enter") sendFriendRequestByUsername(); }}
                    />
                    <button
                      onClick={sendFriendRequestByUsername}
                      disabled={addLoading || !addUsername.trim()}
                      className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-green-600/40 text-white shrink-0"
                    >
                      {addLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                  {addMsg && <div className="mt-2 text-m text-green-400">{addMsg}</div>}
                  {addErr && <div className="mt-2 text-m text-red-400">{addErr}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CHAT TAB CONTENT --- */}
        {activeTab === "chat" && (
          <div className="max-w-6xl mx-auto px-6 pb-10 h-full">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-full min-h-0">
              {/* Chat Sidebar (List of DMs) */}
              {/* Sidebar: Chat List */}
              <div className="space-y-6 h-full overflow-y-auto min-h-0 scrollbar-theme pr-2">
                
                {/* 1. Global Channels (Always Visible) */}
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
                  <div className="text-sm font-semibold text-gray-200 mb-2">Channels</div>
                  <div className="space-y-1">
                    {channels.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          // Switch to Channel Mode
                          setChatMode("channel");
                          setSelectedChannel(c);
                          setSelectedFriendId(null);
                          // Join the room to ensure we get messages/history
                          if (socketRef.current) socketRef.current.emit("join_channel", c);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
                          chatMode === "channel" && selectedChannel === c
                            ? "bg-blue-600/20 text-blue-100"
                            : "hover:bg-gray-800/60 text-gray-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold">#</div>
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
                      <span className="text-sm font-semibold">Private Chats</span>
                    </div>
                    <button onClick={() => { setActiveTab("friends"); setFriendsSubTab("add"); }} className="p-2 rounded-md bg-gray-800/60 hover:bg-gray-800">
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
                    {friends.filter((f) => f.name.toLowerCase().includes(dmSearch.toLowerCase()))
                      .sort((a, b) => {
                        const lastA = (messagesByDM[a.id] || []).slice(-1)[0]?.ts || 0;
                        const lastB = (messagesByDM[b.id] || []).slice(-1)[0]?.ts || 0;
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
                                chatMode === "dm" && selectedFriendId === f.id ? "bg-blue-600/20" : "hover:bg-gray-800/60"
                              }`}
                            >
                              {f.avatarUrl ? (
                                <img src={f.avatarUrl} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-100">{f.name}</span>
                                  {unread > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">
                                      {unread}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 truncate">{last ? last.text : "No messages yet"}</div>
                              </div>
                            </button>
                                              {/* <button
                 onClick={() => {
                  if (selectedFriendId) UnBlockUser(selectedFriendId);
                }}
                className="p-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                disabled={chatMode !== "dm" || !selectedFriendId}
                title="Unblock User">
                  <Gamepad2 className="w-4 h-4" />
                </button> */}
                          
                            {/*SSSSSSSSSSS*/}
                          </li>
                        );
                      })}
                  </ul>
                </div>
                
                {/* Online Now List */}
                <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
                  <div className="text-sm font-semibold text-gray-200">Online Now</div>
                  <div className="mt-2 space-y-2">
                    {friends.filter((f) => f.status === "online" || f.status === "in_game" || f.status === "away")
                      .map((f) => {
                        const pill = f.status === "online" ? { text: "Online", cls: "bg-green-600 text-white" }
                            : f.status === "in_game" ? { text: "In Game", cls: "bg-blue-600 text-white" }
                            : { text: "Away", cls: "bg-yellow-600 text-black" };
                        return (
                          <div key={f.id} className="flex items-center gap-3">
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-purple-500" />
                            )}
                            <div className="flex-1"><div className="text-sm text-gray-100">{f.name}</div></div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.text}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Chat Area (Messages & Input) */}
              <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 flex flex-col h-full min-h-0">
                <div className="text-sm font-semibold text-gray-200">
                  {chatMode === "channel" ? `${selectedChannel[0].toUpperCase()}${selectedChannel.slice(1)} Chat`
                    : `${friends.find((x) => x.id === selectedFriendId)?.name || "Select a friend"}`}
                </div>
                <div className="text-xs text-gray-400">
                  {(chatMode === "channel"
                    ? messagesByChannel[selectedChannel] || []
                    : selectedFriendId
                      ? messagesByDM[selectedFriendId] || []
                      : []
                  ).length} messages • {friends.filter((f) => f.status === "online" || f.status === "in_game").length} online
                </div>
                <div className="mt-3">
                  <div className="text-center text-xs text-gray-400">Welcome to PingPong Pro chat</div>
                </div>
                
                {/* Messages Container */}
                <div
                  ref={chatMessagesRef}
                  className="flex-1 min-h-0 mt-3 space-y-3 overflow-y-auto scrollbar-theme pr-2"
                >
                  {(chatMode === "channel"
                    ? messagesByChannel[selectedChannel] || []
                    : selectedFriendId ? messagesByDM[selectedFriendId] || [] : []
                  ).map((m, i, arr) => {
                    const date = new Date(m.ts);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const displayTime = isToday ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
                    const isMe = m.senderId === myUserId;
                    const isMyLastMessage = isMe && !arr.slice(i + 1).some(next => next.senderId === myUserId);

                    return (
                      <div key={m.id} className={`max-w-[80%] mb-4 flex flex-col ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                          <span className="text-gray-200 font-semibold">{isMe ? "You" : m.author}</span>
                          <span className="text-[10px] opacity-70">{displayTime}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-white ${isMe ? "bg-purple-600 rounded-tr-none" : "bg-gray-700 rounded-tl-none"}`}>
                          {m.text}
                        </div>
                        {isMyLastMessage && chatMode === "dm" && m.readAt && (
                           <span className="text-[10px] text-gray-500 mt-1 mr-1 font-medium select-none">Seen</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {chatMode === "dm" && selectedFriendId && typingStatus[selectedFriendId] && (
                     <div className="mr-auto items-start max-w-[80%] mb-4 flex flex-col animate-pulse">
                        <div className="text-xs text-gray-400 mb-1 ml-1">{friends.find(f => f.id === selectedFriendId)?.name} is typing...</div>
                        <div className="px-4 py-2 rounded-2xl bg-gray-700/50 rounded-tl-none text-gray-400 italic text-sm">...</div>
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
                  // Placeholder explains WHY it is locked
                  placeholder={
                    blockStatus.byThem
                      ? "You have been blocked by this user."
                      : blockStatus.byMe
                      ? "You blocked this user. Unblock to chat."
                      : "Type your message..."
                  }
                  className={`flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none ${
                    isChatLocked ? "cursor-not-allowed opacity-50 bg-gray-900" : ""
                  }`}
                  disabled={chatMode === "dm" && (!selectedFriendId || isChatLocked)}
                />
                <button
                  onClick={sendMessage}
                  className="p-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                  disabled={chatMode === "dm" && (!selectedFriendId || isChatLocked)}
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
                  disabled={chatMode !== "dm" || !selectedFriendId || isChatLocked}
                  title={pendingInviteId === Number(selectedFriendId) ? "Cancel Invite" : "Invite to Game"}
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

        {/* --- GROUPS TAB CONTENT --- */}
        {activeTab === "groups" && (
          <div className="max-w-6xl mx-auto px-6 pb-10 grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-4 h-full min-h-0">
            <div className="rounded-2xl border border-white/10 bg-gray-900/60 flex flex-col h-full min-h-0">
              <div className="p-3 border-b border-white/10 space-y-2">
                <input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Search groups..." className="w-full px-4 py-2 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700" />
                <div className="flex gap-2">
                  <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Create a new group" className="flex-1 min-w-0 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none" />
                  <button onClick={createGroup} className="px-4 py-2 rounded-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shrink-0 whitespace-nowrap">Create</button>
                </div>
              </div>
              <div className="p-3 space-y-3 flex-1 overflow-y-auto scrollbar-theme pr-2">
                {groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase())).map((g) => (
                    <div key={g.id} className={`rounded-lg border border-white/10 px-3 py-3 flex items-center justify-between ${selectedGroupId === g.id ? "bg-blue-600/10" : "bg-gray-800/40"}`}>
                      <button onClick={() => setSelectedGroupId(g.id)} className="text-left flex-1">
                        <div className="font-medium text-gray-100">{g.name}</div>
                        <div className="text-xs text-gray-400">{g.members} members</div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedGroupId(g.id)} className="px-3 py-1 rounded-md bg-gray-800/80 hover:bg-gray-800 text-gray-200">Open</button>
                        <button onClick={() => toggleJoinGroup(g.id)} className={`px-3 py-1 rounded-md ${g.joined ? "bg-gray-800/80 hover:bg-gray-800 text-gray-200" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                          {g.joined ? "Leave" : "Join"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gray-900/60 flex flex-col h-full min-h-0">
              <div className="px-3 py-2 text-sm font-semibold border-b border-white/10">
                {selectedGroupId ? groups.find((g) => g.id === selectedGroupId)?.name : "Select a group"}
              </div>
              <div
                ref={groupMessagesRef}
                className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto scrollbar-theme pr-2"
              >
                {(selectedGroupId ? messagesByGroup[selectedGroupId] || [] : []).map((m) => (
                  <div key={m.id} className="">
                    <span className="text-blue-300 font-semibold mr-2">{m.author}</span>
                    <span className="text-gray-200">{m.text}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(m.ts).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/10 flex gap-2">
                <input value={groupChatInput} onChange={(e) => setGroupChatInput(e.target.value)} placeholder={selectedGroupId ? `Message ${groups.find((g) => g.id === selectedGroupId)?.name}` : "Select a group to chat"} className="flex-1 px-3 py-2 rounded-md bg-gray-800 text-gray-200 placeholder-gray-500 border border-gray-700 focus:outline-none" disabled={!selectedGroupId || !groups.find((g) => g.id === selectedGroupId)?.joined} />
                <button onClick={() => { const text = groupChatInput.trim(); if (!text || !selectedGroupId) return; setMessagesByGroup((prev) => ({ ...prev, [selectedGroupId]: [...(prev[selectedGroupId] || []), { id: Math.random().toString(36).slice(2), author: "You", text, ts: Date.now() }] })); setGroupChatInput(""); }} className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50" disabled={!selectedGroupId || !groups.find((g) => g.id === selectedGroupId)?.joined}>Send</button>
              </div>
              {!selectedGroupId && <div className="p-3 text-sm text-gray-400">Select a group from the list to view chat.</div>}
              {selectedGroupId && !groups.find((g) => g.id === selectedGroupId)?.joined && <div className="p-3 text-sm text-yellow-400">Join the group to send messages.</div>}
            </div>
          </div>
        )}
      </div>
      {/* Incoming Game Invite Modal */}
      {incomingInvite && (
        <div className="absolute top-4 right-4 z-50 bg-gray-900 border border-purple-500 rounded-xl p-4 shadow-2xl animate-bounce-in w-80">
          <div className="flex items-center gap-3 mb-3">
            {incomingInvite.avatarUrl ? (
              <img src={incomingInvite.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full border-2 border-purple-500" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                {incomingInvite.username[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-bold text-white text-lg">{incomingInvite.username}</div>
              <div className="text-xs text-purple-300 font-medium">Invited you to play Pong!</div>
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