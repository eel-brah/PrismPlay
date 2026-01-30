import { Socket, Server } from "socket.io";
import prisma from "src/backend/utils/prisma"; 

interface DMPayload
{
  myId: number;
  otherUserId: number;
}

interface MessagePayload {
  chatId: number;
  senderId: number;
  content: string;
}

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

  if (existingChat) {
    return existingChat;
  }

  
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

export function registerChatHandlers(io: Server, socket: Socket) {
  
  // 1. Join Chat Room
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

  // 2. Send Message
  socket.on("send_message", async (payload: MessagePayload) => {
    try {
      const savedMessage = await prisma.message.create({
        data: {
          chatId: payload.chatId,
          senderId: payload.senderId,
          content: payload.content,
        },
        include: {
          sender: { select: { username: true } }
        }
      });
      io.to(`chat_${payload.chatId}`).emit("new_message", savedMessage);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  });

  // 3. TYPING EVENTS (Ephemeral - no DB needed)
  socket.on("typing_start", (payload: { chatId: number; userId: number }) => {
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

  // 4. SEEN EVENTS (Persistent)
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
}