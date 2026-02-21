import { useNavigate } from "react-router-dom";
import { RoomHistoryItem } from "src/shared/agario/types";
import type { MatchHistoryItem } from "../api";
import { AgarPlayerHistoryRow } from "./PlayerProfile";
import { formatRoomDuration } from "@/game/agario/utils";
import { Gamepad2 } from "lucide-react";

interface AgarioHistoryProps {
  players: AgarPlayerHistoryRow[];
  selectedId: number | null;
  setSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedRoom: RoomHistoryItem | null;
  showLeaderboard: boolean;
  setShowLeaderboard: React.Dispatch<React.SetStateAction<boolean>>;
}

interface PongHistoryProps {
  history: MatchHistoryItem[];
  loading: boolean;
  error: string;
}
interface ProfileHistorySectionProps extends AgarioHistoryProps, PongHistoryProps {
  historyMode: "pong" | "agario";
  setHistoryMode: (mode: "pong" | "agario") => void;
}

function msToMinSec(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

export default function ProfileHistorySection({
  historyMode,
  setHistoryMode,

  history,
  loading,
  error,

  players,
  selectedId,
  setSelectedId,
  selectedRoom,
  showLeaderboard,
  setShowLeaderboard,
}: ProfileHistorySectionProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <div className="rounded-2xl border border-white/10 bg-gray-900/50 shadow-xl p-6">
        <div className="flex items-center gap-2 mb-4 text-gray-200">
          <Gamepad2 className="w-5 h-5" />
          <span className="text-sm font-semibold">Game History</span>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex rounded-full bg-gray-800/60 p-1">
            <button
              onClick={() => setHistoryMode("pong")}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${historyMode === "pong"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
                }`}
            >
              Pong
            </button>
            <button
              onClick={() => setHistoryMode("agario")}
              className={`px-4 py-1 rounded-full text-sm transition-colors ${historyMode === "agario"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
                }`}
            >
              Agar.io
            </button>
          </div>
        </div>

        {historyMode === "pong" && (
          <PongHistory
            history={history}
            loading={loading}
            error={error}
          />
        )}

        {historyMode === "agario" && (
          <AgarioHistory
            players={players}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            selectedRoom={selectedRoom}
            showLeaderboard={showLeaderboard}
            setShowLeaderboard={setShowLeaderboard}
          />
        )}
      </div>
    </div>
  );
}

export function AgarioHistory({
  players,
  selectedId,
  setSelectedId,
  selectedRoom,
  showLeaderboard,
  setShowLeaderboard,
}: AgarioHistoryProps) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 px-4 py-3 text-xs font-semibold tracking-wide text-white/60 bg-gradient-to-r from-white/[0.06] to-white/[0.02]">
              <div>Name</div>
              <div>Duration</div>
              <div>Kills</div>
              <div>Mass</div>
              <div>Rank</div>
              <div>Winner</div>
              <div>Room</div>
            </div>

            {players.map((p) => {
              const isSelected = selectedId === p.id;
              const isWinner = p.rank === 1;
              const isLeaderboardOpen = isSelected && showLeaderboard;

              const medalColor =
                p.rank === 1
                  ? "text-yellow-400"
                  : p.rank === 2
                  ? "text-gray-300"
                  : p.rank === 3
                  ? "text-amber-500"
                  : "text-gray-400";

              return (
                <div key={p.id} className="border-t border-white/5">
                  <button
                    onClick={() => {
                      if (isSelected) {
                        setSelectedId(null);
                        setShowLeaderboard(false);
                        return;
                      }
                      setSelectedId(p.id);
                      setShowLeaderboard(false);
                    }}
                    className={`
                      w-full grid grid-cols-7 px-4 py-3 text-sm items-center text-left
                      transition-all duration-200
                      hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10
                      ${isSelected ? "bg-white/10" : ""}
                    `}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${p.name}`);
                      }}
                      className="font-medium text-gray-200 truncate cursor-pointer hover:text-blue-400 transition"
                    >
                      {p.name}
                    </div>

                    <div className="text-purple-300">
                      {msToMinSec(p.durationMs)}
                    </div>
                    <div className="text-red-400">{p.kills}</div>
                    <div className="text-cyan-400">{p.maxMass}</div>
                    <div className={`font-semibold ${medalColor}`}>
                      {p.rank}
                    </div>
                    <div>
                      {isWinner ? "🏆" : "—"}
                    </div>
                    <div className="text-white/70 truncate">
                      {p.roomName}
                    </div>
                  </button>

                  {isSelected && selectedRoom && (
                    <div className="px-4 sm:px-6 pb-6 pt-4 bg-white/[0.03] border-t border-white/5">
                      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/70">
                          <div>
                            <div className="text-xs text-white/40">Room</div>
                            <div className="text-white">{selectedRoom.name}</div>
                          </div>

                          <div>
                            <div className="text-xs text-white/40">Visibility</div>
                            <div>{selectedRoom.visibility}</div>
                          </div>

                          <div>
                            <div className="text-xs text-white/40">Duration</div>
                            <div>{formatRoomDuration(selectedRoom)}</div>
                          </div>

                          <div>
                            <div className="text-xs text-white/40">Players</div>
                            <div>{selectedRoom.playersCount}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center mb-6">
                        <button
                          onClick={() => setShowLeaderboard((prev) => !prev)}
                          className="px-6 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 transition-all duration-200 shadow-lg"
                        >
                          Leaderboard
                        </button>
                      </div>

                      {isLeaderboardOpen && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-x-auto">
                          <div className="min-w-[500px]">
                            <div className="grid grid-cols-5 px-4 py-3 text-xs text-white/60">
                              <div>Rank</div>
                              <div>Player</div>
                              <div>Kills</div>
                              <div>Mass</div>
                              <div>Duration</div>
                            </div>

                            {selectedRoom.leaderboard.map((pl) => (
                              <div
                                key={`${pl.id}-${pl.rank}`}
                                className="grid grid-cols-5 px-4 py-3 text-sm border-t border-white/5"
                              >
                                <div>{pl.rank}</div>
                                <div
                                  onClick={() =>
                                    navigate(`/profile/${pl.name}`)
                                  }
                                  className="cursor-pointer hover:text-blue-400"
                                >
                                  {pl.name}
                                </div>
                                <div>{pl.kills}</div>
                                <div>{pl.maxMass}</div>
                                <div>{msToMinSec(pl.durationMs)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


export function PongHistory({
  history,
  loading,
  error,
}: PongHistoryProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[520px] w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400">
            <th className="px-3 py-2">Opponent</th>
            <th className="px-3 py-2">Result</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">Date</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-800">
          {!loading &&
            !error &&
            history.map((row) => {
              const isWin = row.result === "win";

              return (
                <tr key={row.id} className="text-gray-200">
                  <td
                    onClick={() =>
                      navigate(`/profile/${row.opponentName}`)
                    }
                    className="px-3 py-2 cursor-pointer hover:text-blue-400 transition"
                  >
                    {row.opponentName}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded ${isWin
                          ? "bg-green-600/30 text-green-300"
                          : "bg-red-600/30 text-red-300"
                        }`}
                    >
                      {isWin ? "Win" : "Loss"}
                    </span>
                  </td>

                  <td className="px-3 py-2">{row.score}</td>

                  <td className="px-3 py-2">
                    {new Date(row.date).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
