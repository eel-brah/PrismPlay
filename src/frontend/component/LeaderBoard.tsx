import { LeaderboardEntry } from "src/shared/agario/types";

type LeaderboardProps = {
  leaderboard: LeaderboardEntry[];
};

export const Leaderboard = ({ leaderboard }: LeaderboardProps) => {
  return (
    <div
      className="
        absolute top-4 right-4
        bg-black/40 backdrop-blur-sm
        text-white text-sm
        rounded-lg
        px-4 py-3
        min-w-[200px]
        pointer-events-none
      "
    >
      <div className="font-bold mb-2 text-center">Leaderboard</div>

      <ul className="space-y-1">
        {leaderboard.map((p) => (
          <li
            key={p.id}
            className={`flex justify-between ${
              p.isMe ? "text-yellow-300 font-semibold" : ""
            }`}
          >
            <span>
              {p.rank}. {p.name}
            </span>
            <span>{Math.floor(p.totalMass)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

type FinalLeaderboardProps = {
  leaderboard: LeaderboardEntry[];
  durationMin: number;
};

export const FinalLeaderboard = ({
  leaderboard,
  durationMin,
}: FinalLeaderboardProps) => {
  if (leaderboard.length === 0) return null;

  const winner = leaderboard[0];

  const medalStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-amber-600";
      default:
        return "text-white";
    }
  };

  return (
    <div className="w-[480px] max-w-[92vw] bg-zinc-900 rounded-xl shadow-xl p-6 text-white">
      {/* Winner Banner */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-yellow-400">
          🏆 {winner.name} Wins!
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Match duration: {durationMin} minutes
        </div>
      </div>

      {/* Leaderboard */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        {leaderboard.map((p) => (
          <div
            key={p.id}
            className={`
              flex justify-between items-center
              px-4 py-3
              border-b last:border-b-0 border-white/10
              ${p.isMe ? "bg-white/10 font-semibold" : ""}
            `}
          >
            <div className={`flex items-center gap-3 ${medalStyle(p.rank)}`}>
              <span className="w-6 text-right">{p.rank}</span>
              <span>{p.name}</span>
              {p.rank <= 3 && <span>★</span>}
            </div>

            <div className="text-sm text-gray-300">
              {Math.floor(p.totalMass)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
