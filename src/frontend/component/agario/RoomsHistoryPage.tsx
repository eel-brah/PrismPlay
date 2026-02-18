import { useEffect, useState } from "react";
import { apiGetRoomsHistory, getStoredToken } from "@/api";
import { formatDurationMs, formatRoomDuration } from "@/game/agario/utils";

type Room = Awaited<ReturnType<typeof apiGetRoomsHistory>>[number];

const PAGE_SIZE = 15;

export default function RoomsHistoryPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    setLoading(true);

    apiGetRoomsHistory(token,
      PAGE_SIZE,
      page * PAGE_SIZE,
    )
      .then(setRooms)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">

      <h1 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        Game History
      </h1>

      {loading && (
        <div className="space-y-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-white/[0.05] animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <div className="text-center text-white/50">
          No finished matches.
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-xl">

          <div className="grid grid-cols-6 px-4 py-3 text-xs font-semibold tracking-wide text-white/60 bg-white/[0.05]">
            <div>Name</div>
            <div>Visibility</div>
            <div>Players</div>
            <div>Duration</div>
            <div>Winner</div>
            <div>Created By</div>
          </div>

          {rooms.map((room) => {
            const isExpanded = expandedId === room.id;

            return (
              <div key={room.id} className="border-t border-white/5">

                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : room.id)
                  }
                  className="w-full text-left grid grid-cols-6 px-4 py-3 items-center text-sm hover:bg-white/[0.06] transition"
                >
                  <div className="font-medium text-gray-200 truncate">
                    {room.name}
                  </div>

                  <div className="text-gray-400 capitalize">
                    {room.visibility}
                  </div>

                  <div>{room.playersCount}</div>

                  <div>{formatRoomDuration(room)}</div>

                  <div className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-semibold truncate">
                    {
                      room.winner
                        ? room.winner.trueName
                          ? room.winner.trueName
                          : room.winner.name
                        : "-"}
                  </div>

                  <div className="truncate text-white/70">
                    {room.createdBy?.username ?? "-"}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-4 bg-white/[0.03] border-t border-white/5">

                    <div className="grid md:grid-cols-4 gap-6 text-sm text-white/60 mb-6">
                      <div>
                        <span className="text-white/40">Max Players:</span>{" "}
                        {room.maxPlayers}
                      </div>

                      <div>
                        <span className="text-white/40">Max Duration:</span>{" "}
                        {room.maxDurationMin} minutes
                      </div>

                      <div>
                        <span className="text-white/40">Started:</span>{" "}
                        {new Date(room.startedAt).toLocaleString()}
                      </div>

                      <div>
                        <span className="text-white/40">Ended:</span>{" "}
                        {room.endedAt
                          ? new Date(room.endedAt).toLocaleString()
                          : "-"}
                      </div>
                    </div>

                    <div className="text-sm text-white/50 mb-3">
                      Leaderboard
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03]">

                      {/* HEADER */}
                      <div className="grid grid-cols-5 px-4 py-2 text-xs font-semibold text-white/50 bg-white/[0.05]">
                        <div>#</div>
                        <div>Player</div>
                        <div>Kills</div>
                        <div>Max Mass</div>
                        <div>Duration</div>
                      </div>

                      {room.leaderboard.map((p) => (
                        <div
                          key={p.id}
                          className="grid grid-cols-5 px-4 py-2 text-sm items-center border-t border-white/5 hover:bg-white/[0.06] transition"
                        >
                          {/* Rank */}
                          <div className="text-gray-400 font-semibold">
                            {p.rank}
                          </div>

                          {/* Player */}
                          <div className="text-gray-200 truncate">
                            {p.trueName
                              ? `${p.trueName} as ${p.name}`
                              : p.name}
                          </div>

                          {/* Kills */}
                          <div className="text-red-400">
                            {p.kills}
                          </div>

                          {/* Max Mass */}
                          <div className="text-cyan-300">
                            {Math.floor(p.maxMass)}
                          </div>

                          {/* Duration Played */}
                          <div className="text-purple-300">
                            {formatDurationMs(p.durationMs)}
                          </div>
                        </div>
                      ))}

                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center gap-4 mt-8">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-5 py-2 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] disabled:opacity-30 transition"
        >
          Previous
        </button>

        <button
          disabled={rooms.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 transition disabled:opacity-30"
        >
          Next
        </button>
      </div>

    </div>
  );
}
