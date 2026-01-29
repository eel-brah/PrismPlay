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
  

  socket.on("join_dm", async (data: DMPayload) => {
    try {
      console.log(`User ${data.myId} wants to chat with ${data.otherUserId}`);
      
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

  socket.on("send_message", async (payload: MessagePayload) => {
    try {
      // 1. Save to DB
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
}