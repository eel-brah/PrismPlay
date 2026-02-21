import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetRoomsHistory, getStoredToken } from "@/api";
import { formatDurationMs, formatRoomDuration } from "@/game/agario/utils";

type Room = Awaited<ReturnType<typeof apiGetRoomsHistory>>[number];

const PAGE_SIZE = 15;

export default function RoomsHistoryPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    setLoading(true);

    apiGetRoomsHistory(token, PAGE_SIZE, page * PAGE_SIZE)
      .then(setRooms)
      .catch(console.log)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 text-white">

      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-3xl pb-1 sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Agario Rooms History
        </h1>

        <p className="text-gray-400 mt-3 sm:mt-4 text-sm sm:text-lg">
          Browse completed rooms and leaderboards
        </p>
      </div>

      {loading && (
        <div className="space-y-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white/[0.05] animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <div className="text-center text-white/50">
          No finished matches yet.
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl overflow-hidden shadow-[0_10px_60px_rgba(0,0,0,0.5)]">

          <div className="hidden md:grid grid-cols-6 px-6 py-4 text-xs font-semibold tracking-wider text-white/50 bg-white/[0.06] uppercase">
            <div>Room</div>
            <div>Visibility</div>
            <div>Players</div>
            <div>Duration</div>
            <div>Winner</div>
            <div>Creator</div>
          </div>

          {rooms.map((room) => {
            const isExpanded = expandedId === room.id;

            return (
              <div key={room.id} className="border-t border-white/5">

                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : room.id)
                  }
                  className={`
                    hidden md:grid
                    w-full text-left grid-cols-6 px-6 py-4 items-center text-sm
                    hover:bg-white/[0.07] transition
                    ${isExpanded ? "bg-white/[0.08]" : ""}
                  `}
                >
                  <div className="font-semibold truncate">
                    {room.name}
                  </div>

                  <div className="capitalize text-white/60">
                    {room.visibility}
                  </div>

                  <div>{room.playersCount}</div>

                  <div className="text-purple-300">
                    {formatRoomDuration(room)}
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!room.winner) return;
                      const username =
                        room.winner.trueName ?? room.winner.name;
                      navigate(`/profile/${username}`);
                    }}
                    className="truncate text-blue-400 font-medium cursor-pointer hover:text-blue-300 transition"
                  >
                    {room.winner
                      ? room.winner.trueName ?? room.winner.name
                      : "-"}
                  </div>

                  <div className="truncate text-white/50">
                    {room.createdBy?.username ?? "-"}
                  </div>
                </button>

                <div
                  onClick={() =>
                    setExpandedId(isExpanded ? null : room.id)
                  }
                  className={`
                    md:hidden p-5 space-y-3 cursor-pointer
                    hover:bg-white/[0.06] transition
                    ${isExpanded ? "bg-white/[0.08]" : ""}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-white truncate">
                      {room.name}
                    </div>
                    <div className="text-xs text-purple-400">
                      {formatRoomDuration(room)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                    <div>👥 {room.playersCount}</div>
                    <div>🔒 {room.visibility}</div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!room.winner) return;
                        const username =
                          room.winner.trueName ?? room.winner.name;
                        navigate(`/profile/${username}`);
                      }}
                      className="cursor-pointer hover:text-blue-400 transition"
                    >
                      🏆 {room.winner?.trueName ?? room.winner?.name ?? "-"}
                    </div>

                    <div>👤 {room.createdBy?.username ?? "-"}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-8 pb-8 pt-6 bg-white/[0.03] border-t border-white/5">

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-white/70 mb-8">
                      <div>
                        <div className="text-xs text-white/40 mb-1">
                          Max Players
                        </div>
                        <div className="font-semibold text-white">
                          {room.maxPlayers}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-white/40 mb-1">
                          Max Duration
                        </div>
                        <div className="font-semibold text-white">
                          {room.maxDurationMin} min
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-white/40 mb-1">
                          Started
                        </div>
                        <div>
                          {new Date(room.startedAt).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-white/40 mb-1">
                          Ended
                        </div>
                        <div>
                          {room.endedAt
                            ? new Date(room.endedAt).toLocaleString()
                            : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-x-auto">
                      <div className="min-w-[500px]">
                        <div className="grid grid-cols-5 px-5 py-3 text-xs text-white/50 uppercase">
                          <div>Rank</div>
                          <div>Player</div>
                          <div>Kills</div>
                          <div>Mass</div>
                          <div>Duration</div>
                        </div>

                        {room.leaderboard.map((p) => (
                          <div
                            key={p.id}
                            className="grid grid-cols-5 px-5 py-3 text-sm border-t border-white/5 hover:bg-white/[0.06] transition"
                          >
                            <div>{p.rank}</div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const username =
                                  p.trueName ?? p.name;
                                navigate(`/profile/${username}`);
                              }}
                              className="truncate cursor-pointer hover:text-blue-400 transition"
                            >
                              {p.trueName
                                ? `${p.trueName} as ${p.name}`
                                : p.name}
                            </div>

                            <div className="text-red-400">
                              {p.kills}
                            </div>

                            <div className="text-cyan-300">
                              {Math.floor(p.maxMass)}
                            </div>

                            <div className="text-purple-300">
                              {formatDurationMs(p.durationMs)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center gap-4 sm:gap-6 mt-10 sm:mt-12">

        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-5 sm:px-6 py-2 sm:py-3 rounded-xl text-sm font-medium bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] disabled:opacity-30 transition"
        >
          Previous
        </button>

        <button
          disabled={rooms.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
          className="px-5 sm:px-6 py-2 sm:py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 disabled:opacity-30 transition"
        >
          Next
        </button>

      </div>
    </div>
  );
}
