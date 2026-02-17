import { io, type Socket } from "socket.io-client";

let chatSocket: Socket | null = null;
let chatUserId: number | null = null;

export function connectChat(userId: number) {
    if (chatSocket) return chatSocket;

    chatUserId = userId;
    chatSocket = io("/chat", {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
        query: { userId },
    });

    // Register on every connect/reconnect (connection recovery drops query params)
    chatSocket.on("connect", () => {
        chatSocket?.emit("register_user", userId);
    });
    chatSocket.emit("register_user", userId);

    return chatSocket;
}

export function getChatSocket() {
    return chatSocket;
}

export function getChatUserId() {
    return chatUserId;
}

export function disconnectChat() {
    chatSocket?.disconnect();
    chatSocket = null;
    chatUserId = null;
}

