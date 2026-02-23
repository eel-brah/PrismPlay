import { Socket, Namespace } from "socket.io";
import prisma from "../../utils/prisma.js";
import { v4 as uuidv4 } from 'uuid';
import { allowPrivateGame } from "./privateGameAllowlist.js";

interface DMPayload {
    myId: number;
    otherUserId: number;
}

interface MessagePayload {
    chatId: number;
    senderId: number;
    content: string;
}

interface ChannelMessagePayload {
    channel: string;
    content: string;
    senderId: number;
}

interface BlockPayload {
    myId: number;
    otherId: number;
}

interface CheckBlockPayload {
    myId: number;
    otherId: number;
}

interface CheckBlockResponse {
    blockedByMe: boolean;
    blockedByThem: boolean;
}

interface TypingStartPayload {
    chatId: number;
    userId: number;
    otherParticipantID: number;
}

interface TypingStopPayload {
    chatId: number;
    userId: number;
}

interface MarkSeenPayload {
    chatId: number;
    userId: number;
}

interface GameInviteActionPayload {
    myId: number;
    otherId: number;
}

interface PendingInvite {
    senderId: number;
    receiverId: number;
    timeout: NodeJS.Timeout;
}
const MAX_MESSAGE_LENGTH = 141;
const activeInvites = new Map<string, PendingInvite>();
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
export function registerChatHandlers(io: Namespace, socket: Socket) {
    const rawQueryUserId = socket.handshake.query.userId;
    const userId = Number(Array.isArray(rawQueryUserId) ? rawQueryUserId[0] : rawQueryUserId);
    if (userId) {
        socket.join(`user_${userId}`);
    }
    socket.on("register_user", (uid: number) => {
        if (uid) {
            socket.join(`user_${uid}`);
        }
    });

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
                messages: history.map((m: any) => ({
                    id: String(m.id),
                    author: m.sender.username,
                    text: m.content,
                    ts: m.createdAt.getTime(),
                    senderId: m.senderId
                }))
            });
        } catch (e) { }
    });

    socket.on("send_channel_message", async (payload: ChannelMessagePayload) => {
        try {
            const trimmedContent = (payload.content ?? "").trim();
            if (!trimmedContent) {
                socket.emit("chat_error", "Message cannot be empty.");
                return;
            }
            if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
                socket.emit("chat_error", `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
                return;
            }

            const sender = await prisma.user.findUnique({
                where: { id: payload.senderId },
                select: { username: true, avatarUrl: true }
            });
            if (!sender) return;


            if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
                throw ("Message too long");
            }
            const savedMessage = await prisma.message.create({
                data: {
                    content: trimmedContent,
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
        } catch (e) { }
    });

    socket.on("join_dm", async (data: DMPayload) => {
        try {
            const chat = await getOrCreateDMChat(data.myId, data.otherUserId);
            const roomName = `chat_${chat.id}`;
            await socket.join(roomName);
            socket.emit("dm_joined", { chatId: chat.id, messages: chat.messages });
        } catch (e) { }
    });

    socket.on("send_message", async (payload: MessagePayload) => {
        try {
            const trimmedContent = (payload.content ?? "").trim();
            if (!trimmedContent) {
                socket.emit("chat_error", "Message cannot be empty.");
                return;
            }
            if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
                socket.emit("chat_error", `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
                return;
            }

            const chat = await prisma.chat.findUnique({
                where: { id: payload.chatId },
                include: { participants: true },
            });
            if (chat) {
                const otherParticipant = chat.participants.find((p: any) => p.userId !== payload.senderId);
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
            if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
                throw ("Message too long");
            }
            const savedMessage = await prisma.message.create({
                data: {
                    chatId: payload.chatId,
                    senderId: payload.senderId,
                    content: trimmedContent,
                },

                include: { sender: { select: { username: true } } }
            });
            io.to(`chat_${payload.chatId}`).emit("new_message", savedMessage);
        } catch (error) { }
    });

    socket.on("block_user", async (data: BlockPayload) => {
        try {
            await prisma.block.create({
                data: { blockerId: data.myId, blockedId: data.otherId },
            });
            io.to(`user_${data.myId}`).emit("user_blocked", {
                blockerId: data.myId,
                blockedId: data.otherId,
            });
            io.to(`user_${data.otherId}`).emit("user_blocked", {
                blockerId: data.myId,
                blockedId: data.otherId,
            });
        } catch (e) { }
    });

    socket.on("unblock_user", async (data: BlockPayload) => {
        try {
            await prisma.block.deleteMany({
                where: { blockerId: data.myId, blockedId: data.otherId },
            });
            io.to(`user_${data.myId}`).emit("user_unblocked", {
                unblockerId: data.myId,
                unblockedId: data.otherId,
            });
            io.to(`user_${data.otherId}`).emit("user_unblocked", {
                unblockerId: data.myId,
                unblockedId: data.otherId,
            });
        } catch (e) { }
    });

    socket.on("check_block_status", async (payload: CheckBlockPayload, callback: (response: CheckBlockResponse) => void) => {
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

    socket.on("typing_start", async (payload: TypingStartPayload) => {
        const isBlocked = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: payload.userId, blockedId: payload.otherParticipantID },
                    { blockerId: payload.otherParticipantID, blockedId: payload.userId },
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

    socket.on("typing_stop", (payload: TypingStopPayload) => {
        socket.to(`chat_${payload.chatId}`).emit("user_typing", {
            chatId: payload.chatId,
            userId: payload.userId,
            isTyping: false
        });
    });

    socket.on("mark_seen", async (payload: MarkSeenPayload) => {
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
        } catch (e) { }
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
            unreadCounts.forEach((item: any) => { payload[item.senderId] = item._count.id; });
            socket.emit("unread_counts", payload);
        } catch (e) { }
    });

    socket.on("request_dm_previews", async (uid: number) => {
        try {
            const chats = await prisma.chat.findMany({
                where: {
                    isGroup: false,
                    participants: { some: { userId: uid } },
                },
                include: {
                    participants: { select: { userId: true } },
                    messages: {
                        take: 1,
                        orderBy: { createdAt: "desc" },
                        include: { sender: { select: { username: true } } },
                    },
                },
            });

            const previews: Record<string, { text: string; ts: number; senderId: number }> = {};
            for (const chat of chats) {
                const otherParticipant = chat.participants.find((p: any) => p.userId !== uid);
                if (!otherParticipant || chat.messages.length === 0) continue;
                const lastMsg = chat.messages[0];
                previews[String(otherParticipant.userId)] = {
                    text: lastMsg.content,
                    ts: new Date(lastMsg.createdAt).getTime(),
                    senderId: lastMsg.senderId,
                };
            }
            socket.emit("dm_previews", previews);
        } catch (e) {

        }
    });

    socket.on("send_game_invite", async (payload: { myId: number; otherId: number }) => {
        const { myId, otherId } = payload;
        const isBlocked = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: myId, blockedId: otherId },
                    { blockerId: otherId, blockedId: myId }
                ]
            }
        });
        if (isBlocked) {
            return socket.emit("invite_error", "Interaction blocked.");
        }
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

        const receiverSockets = await io.in(`user_${otherId}`).fetchSockets();
        if (receiverSockets.length === 0) {
            socket.emit("invite_error", "User is offline.");
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

    socket.on("accept_game_invite", async (payload: GameInviteActionPayload) => {
        const inviteKey = `${payload.otherId}_${payload.myId}`;
        const invite = activeInvites.get(inviteKey);

        if (!invite) {
            socket.emit("invite_error", "Invite expired.");
            return;
        }
        const isBlocked = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: payload.myId, blockedId: payload.otherId },
                    { blockerId: payload.otherId, blockedId: payload.myId }
                ]
            }
        });
        if (isBlocked) {
            activeInvites.delete(inviteKey);
            clearTimeout(invite.timeout);
            socket.emit("invite_error", "Interaction blocked.");
            return;
        }
        clearTimeout(invite.timeout);
        activeInvites.delete(inviteKey);
        const gameId = uuidv4();
        allowPrivateGame(gameId, payload.myId, payload.otherId);
        io.to(`user_${payload.myId}`).emit("game_start_redirect", { gameId });
        io.to(`user_${payload.otherId}`).emit("game_start_redirect", { gameId });
    });

    socket.on("decline_game_invite", (payload: GameInviteActionPayload) => {
        const inviteKey = `${payload.otherId}_${payload.myId}`;
        const invite = activeInvites.get(inviteKey);
        if (invite) {
            clearTimeout(invite.timeout);
            activeInvites.delete(inviteKey);
            io.to(`user_${payload.otherId}`).emit("invite_declined", { byId: payload.myId });
        }
    });

    socket.on("cancel_game_invite", (payload: GameInviteActionPayload) => {
        const inviteKey = `${payload.myId}_${payload.otherId}`;
        const invite = activeInvites.get(inviteKey);
        if (invite) {
            clearTimeout(invite.timeout);
            activeInvites.delete(inviteKey);
            io.to(`user_${payload.otherId}`).emit("invite_canceled_by_sender", { byId: payload.myId });
        }
    });

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
