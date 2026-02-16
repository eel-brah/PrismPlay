import { useEffect, useState } from "react";
import {
  apiGetGlobalLeaderboard,
  apiGetPongLeaderboard,
  getStoredToken,
} from "@/api";

type GameType = "agario" | "pong";

type AgarioEntry = {
  userId: number;
  username: string;
  avatarUrl: string | null;
  games: number;
  wins: number;
  totalKills: number;
  bestMass: number;
  score: number;
};

type PongEntry = {
  userId: number;
  username: string;
  avatarUrl: string | null;
  wins: number;
  totalGames: number;
  winRate: number;
  score: number;
};

export default function GlobalLeaderboard() {
  const [game, setGame] = useState<GameType>("agario");
  const [data, setData] = useState<AgarioEntry[] | PongEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        if (game === "agario") {
          const res = await apiGetGlobalLeaderboard(token);
          setData(res);
        } else {
          const res = await apiGetPongLeaderboard(token);
          setData(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [game]);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">

      <h1 className="text-4xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
        Leaderboard
      </h1>

      <div className="flex justify-center gap-4 mb-10">
        {(["agario", "pong"] as GameType[]).map((g) => (
          <button
            key={g}
            onClick={() => setGame(g)}
            className={`
              px-6 py-2 rounded-lg text-sm font-semibold transition-all
              ${game === g
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                : "bg-white/[0.05] border border-white/10 text-gray-300 hover:bg-white/[0.08]"
              }
            `}
          >
            {g === "agario" ? "Agario" : "Pong PonPong"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.05] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {top3.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
              {top3.map((p: any) => (
                <div
                  key={p.userId}
                  className="rounded-xl p-4 text-center backdrop-blur-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-all"
                >
                  <img
                    src={p.avatarUrl || "/default-avatar.png"}
                    className="w-14 h-14 rounded-full mx-auto mb-2 border border-white/20"
                  />

                  <div className="text-sm font-semibold text-gray-200 truncate">
                    {p.username}
                  </div>

                  <div className="mt-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    {p.score}
                  </div>

                  {game === "agario" ? (
                    <div className="mt-3 text-xs text-gray-300 grid grid-cols-2 gap-1">
                      <div>Wins {p.wins}</div>
                      <div>Kills {p.totalKills}</div>
                      <div>Mass {p.bestMass}</div>
                      <div>Games {p.games}</div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-gray-300">
                      Wins {p.wins} • Win Rate {p.winRate}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-xl">

            {game === "agario" ? (
              <div className="grid grid-cols-14 bg-white/[0.05] px-4 py-3 text-sm text-gray-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">Player</div>
                <div className="col-span-2 text-center">Wins</div>
                <div className="col-span-2 text-center">Kills</div>
                <div className="col-span-2 text-center">Top Mass</div>
                <div className="col-span-2 text-center">Games</div>
                <div className="col-span-2 text-right">Score</div>
              </div>
            ) : (
              <div className="grid grid-cols-12 bg-white/[0.05] px-4 py-3 text-sm text-gray-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">Player</div>
                <div className="col-span-2 text-center">Wins</div>
                <div className="col-span-2 text-center">Win Rate</div>
                <div className="col-span-2 text-center">Games</div>
                <div className="col-span-2 text-right">Score</div>
              </div>
            )}

            {rest.map((p: any, i) =>
              game === "agario" ? (
                <div
                  key={p.userId}
                  className="grid grid-cols-14 px-4 py-3 items-center border-t border-white/5 hover:bg-white/[0.06] transition"
                >
                  <div className="col-span-1 text-center text-gray-400">
                    #{i + 4}
                  </div>

                  <div className="col-span-3 flex items-center gap-3">
                    <img
                      src={p.avatarUrl || "/default-avatar.png"}
                      className="w-8 h-8 rounded-full border border-white/10"
                    />
                    <span className="text-gray-200 truncate">
                      {p.username}
                    </span>
                  </div>

                  <div className="col-span-2 text-center text-green-400">
                    {p.wins}
                  </div>
                  <div className="col-span-2 text-center text-red-400">
                    {p.totalKills}
                  </div>
                  <div className="col-span-2 text-center text-cyan-400">
                    {p.bestMass}
                  </div>
                  <div className="col-span-2 text-center text-gray-400">
                    {p.games}
                  </div>
                  <div className="col-span-2 text-right font-bold text-purple-300">
                    {p.score}
                  </div>
                </div>
              ) : (
                <div
                  key={p.userId}
                  className="grid grid-cols-12 px-4 py-3 items-center border-t border-white/5 hover:bg-white/[0.06] transition"
                >
                  <div className="col-span-1 text-center text-gray-400">
                    #{i + 4}
                  </div>

                  <div className="col-span-3 flex items-center gap-3">
                    <img
                      src={p.avatarUrl || "/default-avatar.png"}
                      className="w-8 h-8 rounded-full border border-white/10"
                    />
                    <span className="text-gray-200 truncate">
                      {p.username}
                    </span>
                  </div>

                  <div className="col-span-2 text-center text-green-400">
                    {p.wins}
                  </div>
                  <div className="col-span-2 text-center text-cyan-400">
                    {p.winRate}%
                  </div>
                  <div className="col-span-2 text-center text-gray-400">
                    {p.totalGames}
                  </div>
                  <div className="col-span-2 text-right font-bold text-purple-300">
                    {p.score}
                  </div>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
