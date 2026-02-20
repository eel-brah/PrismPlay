import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getChatSocket, getChatUserId } from "@/chatSocket";

interface IncomingInvite {
    fromId: number;
    username: string;
    avatarUrl: string;
}

export default function GameInviteOverlay() {
    const navigate = useNavigate();
    const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    // Show a toast notification
    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        let s = getChatSocket();
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const onInviteReceived = (data: { fromId: number; username: string; avatarUrl: string }) => {
            setIncomingInvite({
                fromId: data.fromId,
                username: data.username || "Unknown",
                avatarUrl: data.avatarUrl,
            });
        };
        const onInviteError = (message: string) => { showNotification(message); };
        const onInviteExpired = () => { setIncomingInvite(null); showNotification("Game invite expired."); };
        const onInviteDeclined = () => { showNotification("User declined your invitation."); };
        const onInviteCanceled = () => { setIncomingInvite(null); };
        const onGameStart = (data: { gameId: string }) => {
            setIncomingInvite(null);
            navigate(`/game/${data.gameId}`);
        };

        function attachListeners(socket: NonNullable<ReturnType<typeof getChatSocket>>) {
            // Remove first to avoid double-registration on reconnects
            socket.off("game_invite_received", onInviteReceived);
            socket.off("invite_error", onInviteError);
            socket.off("invite_expired", onInviteExpired);
            socket.off("invite_declined", onInviteDeclined);
            socket.off("invite_canceled_by_sender", onInviteCanceled);
            socket.off("game_start_redirect", onGameStart);

            socket.on("game_invite_received", onInviteReceived);
            socket.on("invite_error", onInviteError);
            socket.on("invite_expired", onInviteExpired);
            socket.on("invite_declined", onInviteDeclined);
            socket.on("invite_canceled_by_sender", onInviteCanceled);
            socket.on("game_start_redirect", onGameStart);

            // Re-attach on every reconnect (avoids stale listeners after disconnect/reconnect)
            socket.on("connect", () => attachListeners(socket));
        }

        if (s) {
            // Socket already ready (dev mode / fast boot)
            attachListeners(s);
        } else {
            // Production: socket not ready yet — poll until connectChat() has run
            intervalId = setInterval(() => {
                const found = getChatSocket();
                if (found) {
                    clearInterval(intervalId!);
                    intervalId = null;
                    s = found;
                    attachListeners(found);
                }
            }, 100);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            const sock = s ?? getChatSocket();
            if (!sock) return;
            sock.off("game_invite_received", onInviteReceived);
            sock.off("invite_error", onInviteError);
            sock.off("invite_expired", onInviteExpired);
            sock.off("invite_declined", onInviteDeclined);
            sock.off("invite_canceled_by_sender", onInviteCanceled);
            sock.off("game_start_redirect", onGameStart);
            sock.off("connect");
        };
    }, [navigate]);

    const acceptInvite = () => {
        const s = getChatSocket();
        const userId = getChatUserId();
        if (!incomingInvite || !s || !userId) return;
        s.emit("accept_game_invite", {
            myId: userId,
            otherId: incomingInvite.fromId,
        });
    };

    const declineInvite = () => {
        const s = getChatSocket();
        const userId = getChatUserId();
        if (!incomingInvite || !s || !userId) return;
        s.emit("decline_game_invite", {
            myId: userId,
            otherId: incomingInvite.fromId,
        });
        setIncomingInvite(null);
    };

    return (
        <>
            {/* Toast notification */}
            {notification && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 border border-purple-500/50 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
                    {notification}
                </div>
            )}

            {/* Incoming Game Invite Modal */}
            {incomingInvite && (
                <div className="fixed top-28 right-4 z-[200] bg-gray-900 border border-purple-500 rounded-xl p-4 shadow-2xl animate-bounce-in w-80">
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
        </>
    );
}
