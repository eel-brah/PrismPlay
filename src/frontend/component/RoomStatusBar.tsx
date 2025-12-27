import { RoomInfo } from "@/../shared/agario/types";

type Props = {
  roomInfo: RoomInfo;
  onLeave: () => void;
};

export const TopStatusBar = ({
  roomInfo,
  onLeave,
}: Props) => {
  const timePassedSec = Math.floor((Date.now() - roomInfo.startedAt) / 1000);
  const minutes = Math.floor(timePassedSec / 60);
  const seconds = timePassedSec % 60;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex justify-center group">
      <div className="flex flex-col items-center">
        <div className="pointer-events-auto mt-2">
          <div className="bg-black/70 text-white px-4 py-1 rounded-md text-sm">
            {roomInfo.room} · {roomInfo.players.length}/{roomInfo.maxPlayers}
          </div>
        </div>

        <div
          className="
            pointer-events-auto
            mt-2
            h-10
            w-full max-w-[1200px]
            bg-black/80 text-white
            rounded-md
            flex items-center gap-5
            px-4 text-sm
            shadow-md backdrop-blur-sm

            opacity-0 -translate-y-2
            group-hover:opacity-100
            group-hover:translate-y-0
            transition-all duration-200
          "
        >
          <span className="font-semibold">
            Room: {roomInfo.room}
            {roomInfo.visibility === "private" ? " 🔒" : " 🌐"}
          </span>

          <span>
            Players: {roomInfo.players.length}/{roomInfo.maxPlayers}
          </span>

          <span>
            Specs: {roomInfo.spectatorCount}
          </span>

          <span>
            Duration: {roomInfo.durationMin}m
          </span>

          <span className="font-mono">
            Time: {minutes}:{seconds.toString().padStart(2, "0")}
          </span>

          <span className="ml-auto">
            <button
              onClick={onLeave}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition"
            >
              Leave
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};
