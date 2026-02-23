import { useEffect, useState, useRef } from "react";
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
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    const showNotification = (msg: string) => {
        setNotification(msg);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        let s = getChatSocket();
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const handleGlobalToast = (e: any) => {
            showNotification(e.detail);
        };
        window.addEventListener("app_toast", handleGlobalToast);

        const onInviteReceived = (data: { fromId: number; username: string; avatarUrl: string }) => {
            setIncomingInvite({ fromId: data.fromId, username: data.username || "Unknown", avatarUrl: data.avatarUrl });
        };
        const onInviteError = (message: string) => { showNotification(message); };
        const onInviteExpired = () => { setIncomingInvite(null); showNotification("Game invite expired."); };
        const onInviteDeclined = () => { setIncomingInvite(null); showNotification("User declined your invitation."); };
        const onInviteCanceled = () => { setIncomingInvite(null); };
        const onGameStart = (data: { gameId: string }) => { setIncomingInvite(null); navigate(`/game/${data.gameId}`); };

        function attachListeners(socket: any) {
            socket.on("game_invite_received", onInviteReceived);
            socket.on("invite_error", onInviteError);
            socket.on("invite_expired", onInviteExpired);
            socket.on("invite_declined", onInviteDeclined);
            socket.on("invite_canceled_by_sender", onInviteCanceled);
            socket.on("game_start_redirect", onGameStart);
        }

        if (s) attachListeners(s);
        else {
            intervalId = setInterval(() => {
                const found = getChatSocket();
                if (found) { clearInterval(intervalId!); intervalId = null; attachListeners(found); }
            }, 100);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener("app_toast", handleGlobalToast);
            const sock = s ?? getChatSocket();
            if (sock) {
                sock.off("game_invite_received", onInviteReceived);
                sock.off("invite_error", onInviteError);
                sock.off("invite_expired", onInviteExpired);
                sock.off("invite_declined", onInviteDeclined);
                sock.off("invite_canceled_by_sender", onInviteCanceled);
                sock.off("game_start_redirect", onGameStart);
            }
        };
    }, [navigate]);

    const acceptInvite = () => {
        const s = getChatSocket();
        const userId = getChatUserId();
        if (!incomingInvite || !s || !userId) return;
        s.emit("accept_game_invite", { myId: userId, otherId: incomingInvite.fromId });
    };
    
    const declineInvite = () => {
        const s = getChatSocket();
        const userId = getChatUserId();
        if (!incomingInvite || !s || !userId) return;
        s.emit("decline_game_invite", { myId: userId, otherId: incomingInvite.fromId });
        setIncomingInvite(null);
    };

    return (
        <>
            {notification && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-bounce">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl border border-red-400 flex items-center gap-3">
                        <span className="font-bold text-sm">{notification}</span>
                        <button onClick={() => setNotification(null)} className="hover:bg-red-700 rounded-full p-1">✕</button>
                    </div>
                </div>
            )}

            {incomingInvite && (
                <div className="fixed top-28 right-4 z-[200] bg-gray-900 border border-red-500 rounded-xl p-4 shadow-2xl animate-bounce-in w-80">
                    <div className="flex items-center gap-3 mb-3">
                        {incomingInvite.avatarUrl ? (
                            <img src={incomingInvite.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full border-2 border-red-500 object-cover" />
                        ) : (
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-lg">{incomingInvite.username[0]?.toUpperCase()}</div>
                        )}
                        <div>
                            <div className="font-bold text-white text-lg">{incomingInvite.username}</div>
                            <div className="text-xs text-red-300 font-medium">Invited you to play Pong!</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={acceptInvite} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold transition-all transform hover:scale-105">ACCEPT</button>
                        <button onClick={declineInvite} className="flex-1 bg-gray-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition-all">DECLINE</button>
                    </div>
                </div>
            )}
        </>
    );
}