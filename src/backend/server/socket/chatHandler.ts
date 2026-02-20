import { Socket, Namespace } from "socket.io";
import prisma from "../../utils/prisma.js";
import { v4 as uuidv4 } from 'uuid';
import { allowPrivateGame } from "./privateGameAllowlist.js";

// ============================================================================
// 1. TYPES & GLOBAL STATE
// ============================================================================

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
}

// Payload for sending a message to a public channel
interface ChannelMessagePayload {
    channel: string;
    content: string;
    senderId: number;
}

// Payload for block/unblock actions
interface BlockPayload {
    myId: number;
    otherId: number;
}

// Payload for checking block status (same shape as BlockPayload)
interface CheckBlockPayload {
    myId: number;
    otherId: number;
}

// Response shape for check_block_status callback
interface CheckBlockResponse {
    blockedByMe: boolean;
    blockedByThem: boolean;
}

// Payload for typing_start event
interface TypingStartPayload {
    chatId: number;
    userId: number;
    otherParticipantID: number;
}

// Payload for typing_stop event
interface TypingStopPayload {
    chatId: number;
    userId: number;
}

// Payload for mark_seen event
interface MarkSeenPayload {
    chatId: number;
    userId: number;
}

// Payload for accept/decline/cancel game invite
interface GameInviteActionPayload {
    myId: number;
    otherId: number;
}

// Structure for storing pending game invites in memory
interface PendingInvite {
    senderId: number;
    receiverId: number;
    timeout: NodeJS.Timeout;
}

// Maximum allowed message length (in characters)
const MAX_MESSAGE_LENGTH = 2000;

// Global Map to store active invites.
// Key format: "senderId_receiverId" (e.g., "5_12")
const activeInvites = new Map<string, PendingInvite>();

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

// Retrieves an existing private chat or creates a new one if it doesn't exist.
async function getOrCreateDMChat(userId1: number, userId2: number) {
    // Attempt to find an existing chat with exactly these two participants
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

    // Create a new chat if none exists
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
    const rawQueryUserId = socket.handshake.query.userId;
    const userId = Number(Array.isArray(rawQueryUserId) ? rawQueryUserId[0] : rawQueryUserId);

    // Automatically join the user to their personal room (e.g., "user_5")
    // This is crucial for receiving targeted events like game invites.
    if (userId) {
        socket.join(`user_${userId}`);
    }

    // Fallback: Allow the client to register after connection (handles reconnection
    // scenarios where the query params are lost due to Socket.IO connection recovery).
    socket.on("register_user", (uid: number) => {
        if (uid) {
            socket.join(`user_${uid}`);
        }
    });

    // ========================================================================
    // ZONE A: GENERAL / CHANNEL CHAT
    // ========================================================================

    // Handle joining a public channel (e.g., "general")
    socket.on("join_channel", async (channelName: string) => {
        socket.join(channelName);
        try {
            // Fetch recent history for the channel
            const history = await prisma.message.findMany({
                where: { channel: channelName },
                take: 50,
                orderBy: { createdAt: "asc" },
                include: { sender: { select: { username: true, avatarUrl: true } } }
            });

            // Send history to the user
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
        } catch (e) { console.error("Error loading history:", e); }
    });

    // Handle sending a message to a public channel
    socket.on("send_channel_message", async (payload: ChannelMessagePayload) => {
        try {
            // --- Input validation ---
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

            const savedMessage = await prisma.message.create({
                data: {
                    content: trimmedContent,
                    senderId: payload.senderId,
                    channel: payload.channel,
                },
            });

            // Broadcast message to everyone in the channel
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

    // Handle joining a private DM room
    socket.on("join_dm", async (data: DMPayload) => {
        try {
            const chat = await getOrCreateDMChat(data.myId, data.otherUserId);
            const roomName = `chat_${chat.id}`;
            await socket.join(roomName);
            socket.emit("dm_joined", { chatId: chat.id, messages: chat.messages });
        } catch (e) { console.error("Error joining DM:", e); }
    });

    // Handle sending a private message
    socket.on("send_message", async (payload: MessagePayload) => {
        try {
            // --- Input validation ---
            const trimmedContent = (payload.content ?? "").trim();
            if (!trimmedContent) {
                socket.emit("chat_error", "Message cannot be empty.");
                return;
            }
            if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
                socket.emit("chat_error", `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
                return;
            }

            // Security Check: Ensure users are not blocked
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
                    if (isBlocked) return; // Stop if blocked
                }
            }

            // Save and broadcast message
            const savedMessage = await prisma.message.create({
                data: {
                    chatId: payload.chatId,
                    senderId: payload.senderId,
                    content: trimmedContent,
                },
                include: { sender: { select: { username: true } } }
            });
            io.to(`chat_${payload.chatId}`).emit("new_message", savedMessage);
        } catch (error) { console.error("Failed to send message", error); }
    });

    // ========================================================================
    // ZONE C: BLOCKING
    // ========================================================================

    // Block a user
    socket.on("block_user", async (data: BlockPayload) => {
        try {
            await prisma.block.create({
                data: { blockerId: data.myId, blockedId: data.otherId },
            });
            // Notify both users in real-time
            io.to(`user_${data.myId}`).emit("user_blocked", {
                blockerId: data.myId,
                blockedId: data.otherId,
            });
            io.to(`user_${data.otherId}`).emit("user_blocked", {
                blockerId: data.myId,
                blockedId: data.otherId,
            });
        } catch (e) { console.error("Block failed", e); }
    });

    // Unblock a user
    socket.on("unblock_user", async (data: BlockPayload) => {
        try {
            await prisma.block.deleteMany({
                where: { blockerId: data.myId, blockedId: data.otherId },
            });
            // Notify both users in real-time
            io.to(`user_${data.myId}`).emit("user_unblocked", {
                unblockerId: data.myId,
                unblockedId: data.otherId,
            });
            io.to(`user_${data.otherId}`).emit("user_unblocked", {
                unblockerId: data.myId,
                unblockedId: data.otherId,
            });
        } catch (e) { console.error("Unblock failed", e); }
    });

    // Check if two users have a blocking relationship
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

    // ========================================================================
    // ZONE D: TYPING & SEEN & UNREAD STATUS
    // ========================================================================

    // Notify room that user is typing (unless blocked)
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

    // Mark messages as read in database and notify sender
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
        } catch (e) { console.error("Error marking seen:", e); }
    });

    // Calculate unread message counts for the dashboard
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
        } catch (e) { console.error("Error fetching unread counts:", e); }
    });

    // Fetch last message preview for each DM the user participates in
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
            console.error("Error fetching DM previews:", e);
        }
    });

    // ========================================================================
    // ZONE G: GAME INVITES
    // ========================================================================

    // Handle sending a game invite
    socket.on("send_game_invite", async (payload: { myId: number; otherId: number }) => {
        const { myId, otherId } = payload;
        const inviteKey = `${myId}_${otherId}`;
        const reverseKey = `${otherId}_${myId}`;

        if (myId === otherId) return;

        // Check 1: Prevent duplicate invites from same sender
        if (activeInvites.has(inviteKey)) {
            socket.emit("invite_error", "Invite already sent.");
            return;
        }

        // Check 2: Prevent inviting someone who already invited you (Race Condition Fix)
        if (activeInvites.has(reverseKey)) {
            socket.emit("invite_error", "They already invited you! Check your requests.");
            return;
        }

        // Check 3: Prevent inviting an offline user
        const receiverSockets = await io.in(`user_${otherId}`).fetchSockets();
        if (receiverSockets.length === 0) {
            socket.emit("invite_error", "User is offline.");
            return;
        }

        // Auto-cancel invite after 15 seconds
        const timeout = setTimeout(() => {
            if (activeInvites.has(inviteKey)) {
                activeInvites.delete(inviteKey);
                io.to(`user_${myId}`).emit("invite_expired", { otherId });
                io.to(`user_${otherId}`).emit("invite_expired", { otherId: myId });
            }
        }, 15000);

        // Store invite in memory
        activeInvites.set(inviteKey, { senderId: myId, receiverId: otherId, timeout });

        const sender = await prisma.user.findUnique({
            where: { id: myId },
            select: { username: true, avatarUrl: true }
        });

        // Notify the receiver via their personal room
        io.to(`user_${otherId}`).emit("game_invite_received", {
            fromId: myId,
            username: sender?.username,
            avatarUrl: sender?.avatarUrl
        });
    });

    // Handle accepting an invite
    socket.on("accept_game_invite", (payload: GameInviteActionPayload) => {
        // If I accept, the key is "Them_Me" (e.g. 5_10 if 5 invited 10)
        const inviteKey = `${payload.otherId}_${payload.myId}`;
        const invite = activeInvites.get(inviteKey);

        if (!invite) {
            socket.emit("invite_error", "Invite expired.");
            return;
        }

        // Clear timeout and remove from map
        clearTimeout(invite.timeout);
        activeInvites.delete(inviteKey);

        // Generate unique Game ID, register both players in the allowlist, then redirect
        const gameId = uuidv4();
        allowPrivateGame(gameId, payload.myId, payload.otherId);
        io.to(`user_${payload.myId}`).emit("game_start_redirect", { gameId });
        io.to(`user_${payload.otherId}`).emit("game_start_redirect", { gameId });
    });

    // Handle declining an invite
    socket.on("decline_game_invite", (payload: GameInviteActionPayload) => {
        const inviteKey = `${payload.otherId}_${payload.myId}`;
        const invite = activeInvites.get(inviteKey);
        if (invite) {
            clearTimeout(invite.timeout);
            activeInvites.delete(inviteKey);
            io.to(`user_${payload.otherId}`).emit("invite_declined", { byId: payload.myId });
        }
    });

    // Handle sender canceling their own invite
    socket.on("cancel_game_invite", (payload: GameInviteActionPayload) => {
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

    // Clean up invites when a user disconnects
    socket.on("disconnect", () => {
        for (const [key, invite] of activeInvites.entries()) {
            // Case A: Sender disconnected -> Cancel invite for Receiver
            if (invite.senderId === userId) {
                clearTimeout(invite.timeout);
                activeInvites.delete(key);
                io.to(`user_${invite.receiverId}`).emit("invite_canceled_by_sender", { byId: userId });
            }
            // Case B: Receiver disconnected -> Decline invite automatically
            if (invite.receiverId === userId) {
                clearTimeout(invite.timeout);
                activeInvites.delete(key);
                io.to(`user_${invite.senderId}`).emit("invite_declined", { byId: userId });
            }
        }
    });
}