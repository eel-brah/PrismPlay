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
        {leaderboard.map((p, i) => (
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
