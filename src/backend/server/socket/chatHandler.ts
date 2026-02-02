import { boolean } from "node_modules/zod/v4/classic/coerce.d.cts";
import { Socket, Namespace } from "socket.io";
import prisma from "src/backend/utils/prisma"; 

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================
interface DMPayload {
  myId: number;
  otherUserId: number;
}

interface MessagePayload {
  chatId: number;
  senderId: number;
  content: string;
}

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================
async function getOrCreateDMChat(userId1: number, userId2: number) {
  // Try to find an existing private chat between these two users
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

  if (existingChat) {
    return existingChat;
  }

  // If none exists, create a new one
  const newChat = await prisma.chat.create({
    data: {
      isGroup: false,
      participants: {
        create: [
          { userId: userId1 },
          { userId: userId2 },
        ],
      },
    },
  });

  return { ...newChat, messages: [] };
}

// ============================================================================
// 3. MAIN HANDLER REGISTRATION
// ============================================================================
export function registerChatHandlers(io: Namespace, socket: Socket) {
  
  // ========================================================================
  // ZONE A: GENERAL / CHANNEL CHAT (Public)
  // ========================================================================
  
  // 1. Join a Channel (and load history)
  // 1. Join Chat Room & Load History
  socket.on("join_channel", async (channelName: string) => {
    socket.join(channelName);

    try {
      // Fetch last 50 messages for this channel
      const history = await prisma.message.findMany({
        where: { channel: channelName },
        take: 50,
        orderBy: { createdAt: "asc" },
        include: { 
          sender: { select: { username: true, avatarUrl: true } } 
        }
      });

      // Send the history list to the user who just joined
      socket.emit("channel_history", {
        channel: channelName,
        messages: history.map(m => ({
          id: String(m.id),
          author: m.sender.username,
          text: m.content,
          ts: m.createdAt.getTime(),
          senderId: m.senderId
        }))
      });
    } catch (e) {
      console.error("Error loading channel history:", e);
    }
  });

  // 2. Send Channel Message (Saved to DB + Real Username)
  socket.on("send_channel_message", async (payload: { channel: string; content: string; senderId: number }) => {
    try {
      // A. Fetch the Real Sender (Fixes the "User 1" display issue)
      const sender = await prisma.user.findUnique({
        where: { id: payload.senderId },
        select: { username: true, avatarUrl: true } 
      });

      if (!sender) return;

      // B. Save to Database
      const savedMessage = await prisma.message.create({
        data: {
          content: payload.content,
          senderId: payload.senderId,
          channel: payload.channel, // "general", "lobby", etc.
        },
      });

      // C. Broadcast to everyone in the channel (including sender)
      io.to(payload.channel).emit("channel_message", {
        id: String(savedMessage.id),
        channel: payload.channel,
        content: savedMessage.content,
        senderId: payload.senderId,
        createdAt: savedMessage.createdAt,
        sender: { 
            username: sender.username, 
            avatarUrl: sender.avatarUrl 
        } 
      });
    } catch (e) {
      console.error("General chat error:", e);
    }
  });


  // ========================================================================
  // ZONE B: DIRECT MESSAGES (Private)
  // ========================================================================

  // 3. Join DM Room
  socket.on("join_dm", async (data: DMPayload) => {
    try {
      const chat = await getOrCreateDMChat(data.myId, data.otherUserId);
      const roomName = `chat_${chat.id}`;
      await socket.join(roomName);

      socket.emit("dm_joined", {
        chatId: chat.id,
        messages: chat.messages
      });
    } catch (e) {
      console.error("Error joining DM:", e);
    }
  });

  // 4. Send DM (With Block Check)
  socket.on("send_message", async (payload: MessagePayload) => {
    try {
      // A. Check for Blocks before sending
      // Find the participants of this chat to know who the "other" person is
      const chat = await prisma.chat.findUnique({
        where: { id: payload.chatId },
        include: { participants: true },
      });

      if (chat) {
        const otherParticipant = chat.participants.find((p) => p.userId !== payload.senderId);
        if (otherParticipant) {
          // Check if block exists in EITHER direction
          const isBlocked = await prisma.block.findFirst({
            where: {
              OR: [
                { blockerId: payload.senderId, blockedId: otherParticipant.userId }, // I blocked them
                { blockerId: otherParticipant.userId, blockedId: payload.senderId }, // They blocked me
              ],
            },
          });
          // isBlocked = 0; // TEMP DISABLE BLOCKS FOR TESTING
          if (isBlocked) {
            return; 
          }
        }
      }

      // B. Save Message to DB
      const savedMessage = await prisma.message.create({
        data: {
          chatId: payload.chatId,
          senderId: payload.senderId,
          content: payload.content,
        },
        include: { sender: { select: { username: true } } }
      });

      // C. Broadcast to the room
      io.to(`chat_${payload.chatId}`).emit("new_message", savedMessage);

    } catch (error) {
      console.error("Failed to send message", error);
    }
  });


  // ========================================================================
  // ZONE C: BLOCKING SYSTEM
  // ========================================================================
  
  socket.on("block_user", async (data: { myId: number; otherId: number }) => {
    try {
      await prisma.block.create({
        data: { blockerId: data.myId, blockedId: data.otherId , },
      });
      socket.emit("block_success", { blockedId: data.otherId });
    } catch (e) {
      console.error("Block failed", e);
    }
  });

  socket.on("unblock_user", async (data: { myId: number; otherId: number }) => {
    try {
      await prisma.block.deleteMany({
        where: { blockerId: data.myId, blockedId: data.otherId },
      });
    } catch (e) {
      console.error("Unblock failed", e);
    }
  });


  // ========================================================================
  // ZONE D: EPHEMERAL EVENTS (Typing)
  // ========================================================================
  
  socket.on("typing_start", async (payload: { chatId: number; userId: number; otherParticipantID: number }) => {
    const isBlocked = await prisma.block.findFirst({
    where: {
    OR: [
    { blockerId: payload.userId, blockedId: payload.otherParticipantID}, // I blocked them
          { blockerId: payload.otherParticipantID , blockedId: payload.userId }, // They blocked me
        ],
      },
    });
    // isBlocked = 0; // TEMP DISABLE BLOCKS FOR TESTING
    if (isBlocked) {
      return; 
    }
    
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(`chat_${payload.chatId}`).emit("user_typing", {
      chatId: payload.chatId,
      userId: payload.userId,
      isTyping: true
    });
  });

  socket.on("typing_stop", (payload: { chatId: number; userId: number }) => {
    socket.to(`chat_${payload.chatId}`).emit("user_typing", {
      chatId: payload.chatId,
      userId: payload.userId,
      isTyping: false
    });
  });


  // ========================================================================
  // ZONE E: STATUS EVENTS (Seen)
  // ========================================================================
  
  socket.on("mark_seen", async (payload: { chatId: number; userId: number }) => {
    try {
      // A. Update DB: Mark all messages in this chat NOT sent by me as read
      await prisma.message.updateMany({
        where: {
          chatId: payload.chatId,
          senderId: { not: payload.userId }, // Messages sent by the OTHER person
          readAt: null // Only update if not already read
        },
        data: {
          readAt: new Date()
        }
      });

      // B. Notify the sender that I saw their messages
      io.to(`chat_${payload.chatId}`).emit("messages_seen", {
        chatId: payload.chatId,
        seenByUserId: payload.userId
      });

    } catch (e) {
      console.error("Error marking seen:", e);
    }
  });
  // ========================================================================
  // ZONE F: INITIALIZATION DATA
  // ========================================================================
  
  socket.on("request_unread", async (userId: number) => {
    try {
      // Count unread messages grouped by Sender
      // Logic: Messages in DMs (chatId != null), NOT sent by me, and NOT read yet
      const unreadCounts = await prisma.message.groupBy({
        by: ['senderId'],
        where: {
          chatId: { not: null },             // Ignore General Chat
          senderId: { not: userId },         // Not my own messages
          readAt: null,                      // Unread
          chat: {
            participants: { some: { userId: userId } } // Chats I belong to
          }
        },
        _count: {
          id: true
        }
      });

      // Transform array into Map: { "senderId": count }
      const payload: Record<number, number> = {};
      unreadCounts.forEach((item) => {
        payload[item.senderId] = item._count.id;
      });

      socket.emit("unread_counts", payload);
    } catch (e) {
      console.error("Error fetching unread counts:", e);
    }
  });

// // Update the handler to accept a callback function as the second argument
//   socket.on("is_user_blocked", async (payload: { senderId: number, userId: number }, callback) => {
//     try {
//       const isBlocked = await prisma.block.findFirst({
//         where: {
//           OR: [
//             { blockerId: payload.senderId, blockedId: payload.userId },
//             { blockerId: payload.userId, blockedId: payload.senderId },
//           ],
//         },
//       });

//       // Send the response back to the specific client who asked
//       if (callback) {
//         callback(!!isBlocked); // !! converts object/null to boolean true/false
//       }
//     } catch (e) {
//       console.error("Error checking block status:", e);
//       if (callback) callback(false); // Default to false on error
//     }
//   });


}