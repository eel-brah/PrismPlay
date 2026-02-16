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
        const s = getChatSocket();
        if (!s) return;

        const onInviteReceived = (data: { fromId: number; username: string; avatarUrl: string }) => {
            setIncomingInvite({
                fromId: data.fromId,
                username: data.username || "Unknown",
                avatarUrl: data.avatarUrl,
            });
        };

        const onInviteError = (message: string) => {
            showNotification(message);
        };

        const onInviteExpired = () => {
            setIncomingInvite(null);
            showNotification("Game invite expired.");
        };

        const onInviteDeclined = () => {
            showNotification("User declined your invitation.");
        };

        const onInviteCanceled = () => {
            setIncomingInvite(null);
        };

        const onGameStart = (data: { gameId: string }) => {
            setIncomingInvite(null);
            navigate(`/game/${data.gameId}`);
        };

        s.on("game_invite_received", onInviteReceived);
        s.on("invite_error", onInviteError);
        s.on("invite_expired", onInviteExpired);
        s.on("invite_declined", onInviteDeclined);
        s.on("invite_canceled_by_sender", onInviteCanceled);
        s.on("game_start_redirect", onGameStart);

        return () => {
            s.off("game_invite_received", onInviteReceived);
            s.off("invite_error", onInviteError);
            s.off("invite_expired", onInviteExpired);
            s.off("invite_declined", onInviteDeclined);
            s.off("invite_canceled_by_sender", onInviteCanceled);
            s.off("game_start_redirect", onGameStart);
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
