import { Socket, Namespace } from "socket.io";
import prisma from "../../utils/prisma.js"; 
import { v4 as uuidv4 } from 'uuid'; 

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

// Generic Payload for simple ID-based interactions (Blocking, Invites)
interface InteractionPayload {
  myId: number;
  otherId: number;
}

// Payload for joining a Direct Message room
interface DMPayload {
  myId: number;
  otherUserId: number;
}

// Payload for sending a standard chat message
interface MessagePayload {
  chatId: number;
  senderId: number;
  content: string;
  channel?: string; // Optional: Only for public channels
}

// Payload for Typing Indicators
interface TypingPayload {
  chatId: number;
  userId: number;
  otherParticipantID?: number; // Needed to check block status
}

// Payload for Marking Messages as Seen
interface SeenPayload {
  chatId: number;
  userId: number;
}

// Structure for storing pending game invites in memory
interface PendingInvite {
  senderId: number;
  receiverId: number;
  timeout: NodeJS.Timeout;
}

// Global Map to store active invites. Key format: "senderId_receiverId"
const activeInvites = new Map<string, PendingInvite>();

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

// Retrieves an existing private chat or creates a new one if it doesn't exist.
async function getOrCreateDMChat(userId1: number, userId2: number) {
  const existingChat = await prisma.chat.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: userId1 } } },
        { participants: { some: { userId: userId2 } } },
      ],
    },
    include: {
      messages: {
        take: 50,
        orderBy: { id: "asc" },
        include: { sender: { select: { username: true } } },
      },
    },
  });

  if (existingChat) return existingChat;

  const newChat = await prisma.chat.create({
    data: {
      isGroup: false,
      participants: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
  });

  return { ...newChat, messages: [] };
}

// ============================================================================
// 3. MAIN HANDLER REGISTRATION
// ============================================================================

export function registerChatHandlers(io: Namespace, socket: Socket) {
  
  // Extract User ID from the connection handshake query
  const userId = Number(socket.handshake.query.userId);

  if (userId) {
    socket.join(`user_${userId}`);
  }

  // ========================================================================
  // ZONE A: GENERAL / CHANNEL CHAT
  // ========================================================================
  
  socket.on("join_channel", async (channelName: string) => {
    socket.join(channelName);
    try {
      const history = await prisma.message.findMany({
        where: { channel: channelName },
        take: 50,
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { username: true, avatarUrl: true } } }
      });
      
socket.emit("channel_history", {
        channel: channelName,
        messages: history.map((m: { id: number; sender: { username: string }; content: string; createdAt: Date; senderId: number }) => ({
          id: String(m.id),
          author: m.sender.username,
          text: m.content,
          ts: m.createdAt.getTime(),
          senderId: m.senderId
        }))
      });
    } catch (e) { console.error("Error loading history:", e); }
  });

  socket.on("send_channel_message", async (payload: MessagePayload) => {
    try {
      // SECURITY CHECK
      if (!payload.content || typeof payload.content !== 'string') return;
      const cleanContent = payload.content.trim();
      if (cleanContent.length === 0 || cleanContent.length > 1000) {
        socket.emit("error", "Message must be between 1 and 1000 characters");
        return;
      }

      if (!payload.channel) return;

      const sender = await prisma.user.findUnique({
        where: { id: payload.senderId },
        select: { username: true, avatarUrl: true } 
      });
      if (!sender) return;

      const savedMessage = await prisma.message.create({
        data: {
          content: cleanContent,
          senderId: payload.senderId,
          channel: payload.channel,
        },
      });

      io.to(payload.channel).emit("channel_message", {
        id: String(savedMessage.id),
        channel: payload.channel,
        content: savedMessage.content,
        senderId: payload.senderId,
        createdAt: savedMessage.createdAt,
        sender: { username: sender.username, avatarUrl: sender.avatarUrl } 
      });
    } catch (e) { console.error("General chat error:", e); }
  });

  // ========================================================================
  // ZONE B: DIRECT MESSAGES
  // ========================================================================
  
  socket.on("join_dm", async (data: DMPayload) => {
    try {
      const chat = await getOrCreateDMChat(data.myId, data.otherUserId);
      const roomName = `chat_${chat.id}`;
      await socket.join(roomName);
      socket.emit("dm_joined", { chatId: chat.id, messages: chat.messages });
    } catch (e) { console.error("Error joining DM:", e); }
  });

  socket.on("send_message", async (payload: MessagePayload) => {
    try {
      // SECURITY CHECK
      if (!payload.content || typeof payload.content !== 'string') return;
      const cleanContent = payload.content.trim();
      if (cleanContent.length === 0 || cleanContent.length > 1000) {
        socket.emit("error", "Message must be between 1 and 1000 characters");
        return;
      }

      const chat = await prisma.chat.findUnique({
        where: { id: payload.chatId },
        include: { participants: true },
      });
      if (chat) {
        
        const otherParticipant = chat.participants.find((p: { userId: number }) => p.userId !== payload.senderId);
if (otherParticipant) {
          const isBlocked = await prisma.block.findFirst({
            where: {
              OR: [
                { blockerId: payload.senderId, blockedId: otherParticipant.userId },
                { blockerId: otherParticipant.userId, blockedId: payload.senderId },
              ],
            },
          });
          if (isBlocked) return; 
        }
      }

      const savedMessage = await prisma.message.create({
        data: {
          chatId: payload.chatId,
          senderId: payload.senderId,
          content: cleanContent,
        },
        include: { sender: { select: { username: true } } }
      });
      io.to(`chat_${payload.chatId}`).emit("new_message", savedMessage);
    } catch (error) { console.error("Failed to send message", error); }
  });

  // ========================================================================
  // ZONE C: BLOCKING
  // ========================================================================
  
  socket.on("block_user", async (data: InteractionPayload) => {
    try {
      await prisma.block.create({
        data: { blockerId: data.myId, blockedId: data.otherId },
      });
    } catch (e) { console.error("Block failed", e); }
  });

  socket.on("unblock_user", async (data: InteractionPayload) => {
    try {
      await prisma.block.deleteMany({
        where: { blockerId: data.myId, blockedId: data.otherId },
      });
    } catch (e) { console.error("Unblock failed", e); }
  });

  socket.on("check_block_status", async (
    payload: InteractionPayload, 
    callback: (res: { blockedByMe: boolean; blockedByThem: boolean }) => void
  ) => {
    try {
      const blockByMe = await prisma.block.findFirst({
        where: { blockerId: payload.myId, blockedId: payload.otherId },
      });
      const blockByThem = await prisma.block.findFirst({
        where: { blockerId: payload.otherId, blockedId: payload.myId },
      });
      callback({ blockedByMe: !!blockByMe, blockedByThem: !!blockByThem }); 
    } catch (e) { callback({ blockedByMe: false, blockedByThem: false }); }
  });

  // ========================================================================
  // ZONE D: TYPING & SEEN & UNREAD STATUS
  // ========================================================================
  
  socket.on("typing_start", async (payload: TypingPayload) => {
    if (!payload.otherParticipantID) return;
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: payload.userId, blockedId: payload.otherParticipantID},
          { blockerId: payload.otherParticipantID , blockedId: payload.userId },
        ],
      },
    });
    if (isBlocked) return; 
    socket.to(`chat_${payload.chatId}`).emit("user_typing", {
      chatId: payload.chatId,
      userId: payload.userId,
      isTyping: true
    });
  });

  socket.on("typing_stop", (payload: TypingPayload) => {
    socket.to(`chat_${payload.chatId}`).emit("user_typing", {
      chatId: payload.chatId,
      userId: payload.userId,
      isTyping: false
    });
  });

  socket.on("mark_seen", async (payload: SeenPayload) => {
    try {
      await prisma.message.updateMany({
        where: {
          chatId: payload.chatId,
          senderId: { not: payload.userId },
          readAt: null
        },
        data: { readAt: new Date() }
      });
      io.to(`chat_${payload.chatId}`).emit("messages_seen", {
        chatId: payload.chatId,
        seenByUserId: payload.userId
      });
    } catch (e) { console.error("Error marking seen:", e); }
  });

  socket.on("request_unread", async (uid: number) => {
    try {
      const unreadCounts = await prisma.message.groupBy({
        by: ['senderId'],
        where: {
          chatId: { not: null },
          senderId: { not: uid },
          readAt: null,
          chat: { participants: { some: { userId: uid } } }
        },
        _count: { id: true }
      });
      const payload: Record<number, number> = {};
      unreadCounts.forEach((item: { senderId: number; _count: { id: number } }) => { 
          payload[item.senderId] = item._count.id; 
      })
      socket.emit("unread_counts", payload);
    } catch (e) { console.error("Error fetching unread counts:", e); }
  });

  // ========================================================================
  // ZONE G: GAME INVITES
  // ========================================================================
  
  socket.on("send_game_invite", async (payload: InteractionPayload) => {
    const { myId, otherId } = payload;
    const inviteKey = `${myId}_${otherId}`;
    const reverseKey = `${otherId}_${myId}`;

    if (myId === otherId) return;

    if (activeInvites.has(inviteKey)) {
      socket.emit("invite_error", "Invite already sent.");
      return;
    }

    if (activeInvites.has(reverseKey)) {
      socket.emit("invite_error", "They already invited you! Check your requests.");
      return;
    }

    const timeout = setTimeout(() => {
      if (activeInvites.has(inviteKey)) {
        activeInvites.delete(inviteKey);
        io.to(`user_${myId}`).emit("invite_expired", { otherId });
        io.to(`user_${otherId}`).emit("invite_expired", { otherId: myId });
      }
    }, 15000);

    activeInvites.set(inviteKey, { senderId: myId, receiverId: otherId, timeout });

    const sender = await prisma.user.findUnique({
      where: { id: myId },
      select: { username: true, avatarUrl: true }
    });

    io.to(`user_${otherId}`).emit("game_invite_received", {
      fromId: myId,
      username: sender?.username,
      avatarUrl: sender?.avatarUrl
    });
  });

  socket.on("accept_game_invite", (payload: InteractionPayload) => {
    const inviteKey = `${payload.otherId}_${payload.myId}`;
    const invite = activeInvites.get(inviteKey);

    if (!invite) {
      socket.emit("invite_error", "Invite expired.");
      return;
    }

    clearTimeout(invite.timeout);
    activeInvites.delete(inviteKey);

    const gameId = uuidv4(); 
    io.to(`user_${payload.myId}`).emit("game_start_redirect", { gameId });
    io.to(`user_${payload.otherId}`).emit("game_start_redirect", { gameId });
  });

  socket.on("decline_game_invite", (payload: InteractionPayload) => {
    const inviteKey = `${payload.otherId}_${payload.myId}`;
    const invite = activeInvites.get(inviteKey);
    if (invite) {
      clearTimeout(invite.timeout);
      activeInvites.delete(inviteKey);
      io.to(`user_${payload.otherId}`).emit("invite_declined", { byId: payload.myId });
    }
  });

  socket.on("cancel_game_invite", (payload: InteractionPayload) => {
    const inviteKey = `${payload.myId}_${payload.otherId}`;
    const invite = activeInvites.get(inviteKey);
    if (invite) {
      clearTimeout(invite.timeout);
      activeInvites.delete(inviteKey);
      io.to(`user_${payload.otherId}`).emit("invite_canceled_by_sender", { byId: payload.myId });
    }
  });

  // ========================================================================
  // ZONE H: CONNECTION CLEANUP
  // ========================================================================
  
  socket.on("disconnect", () => {
    for (const [key, invite] of activeInvites.entries()) {
      if (invite.senderId === userId) {
        clearTimeout(invite.timeout);
        activeInvites.delete(key);
        io.to(`user_${invite.receiverId}`).emit("invite_canceled_by_sender", { byId: userId });
      }
      if (invite.receiverId === userId) {
        clearTimeout(invite.timeout);
        activeInvites.delete(key);
        io.to(`user_${invite.senderId}`).emit("invite_declined", { byId: userId });
      }
    }
  });
}
