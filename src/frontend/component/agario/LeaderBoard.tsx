import { LeaderboardEntry } from "@/game/agario/type";
import { FinalLeaderboardEntry, } from "src/shared/agario/types";

type DecayIndicatorProps = {
  multiplier: number;
};

function decaySeverity(multiplier: number) {
  if (multiplier >= 4) return "☠";
  if (multiplier >= 2) return "☣ ☣ ";
  return "☣ ";
}

const DecayIndicator = ({ multiplier }: DecayIndicatorProps) => {
  if (multiplier <= 1) return null;

  const severity = decaySeverity(multiplier);
  return (
    <span
      className={`ml-2 text-xs font-semibold `}
      title={`Mass decay increased (${multiplier.toFixed(2)}×)`}
    >
      {severity}
    </span>
  );
};

type LeaderboardProps = {
  leaderboard: LeaderboardEntry[];
};

export const Leaderboard = ({ leaderboard }: LeaderboardProps) => {
  return (
    <div
      className="
        absolute top-4 right-4
        bg-zinc-900/70 backdrop-blur-sm
        text-zinc-100 border border-white/10
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
            className={`flex justify-between ${p.isMe ? "text-yellow-300 font-semibold" : ""
              }`}
          >
            <span className="flex items-center">
              {p.rank}. {p.name}
              <DecayIndicator multiplier={p.decayMultiplier} />
            </span>
            <span>{Math.floor(p.totalMass)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

type Props = {
  leaderboard: FinalLeaderboardEntry[];
  durationMin: string;
  backToMainMenu: (restart: boolean) => void;
};

export const FinalLeaderboard = ({
  leaderboard,
  durationMin,
  backToMainMenu,
}: Props) => {
  if (leaderboard.length === 0) return null;

  const winner = leaderboard[0];


  const medalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-amber-500";
      default:
        return "text-gray-200";
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">

      <div
        className="
          relative
          w-[480px] max-w-[92vw]
          max-h-[85vh]
          rounded-2xl
          bg-white/[0.05]
          border border-white/10
          backdrop-blur-2xl
          shadow-[0_10px_60px_rgba(0,0,0,0.6)]
          p-8
          text-white
          flex flex-col
        "
      >
        <div className="text-center mb-6 shrink-0">
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            🏆 {winner.name} Wins!
          </div>

          <div className="text-sm text-white/50 mt-2">
            Match duration: {durationMin} minutes
          </div>
        </div>

        <div
          className="
            flex-1
            overflow-y-auto
            pr-2
            space-y-3
            mb-6
            scrollbar-thin
            scrollbar-thumb-white/10
            scrollbar-track-transparent
          "
        >
          {leaderboard.map((p) => (
            <div
              key={p.id}
              className="
                flex justify-between items-center
                rounded-xl
                px-5 py-4
                border border-white/10
                bg-white/[0.03]
                hover:bg-white/[0.06]
                transition-all duration-200
              "
            >
              <div className={`flex items-center gap-3 ${medalColor(p.rank)}`}>
                <span className="w-6 text-right font-semibold">
                  {p.rank}
                </span>

                <span className="font-medium">{p.name}</span>

                {p.rank <= 3 && <span>★</span>}
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-300">
                <span className="text-red-400">
                  ⚔ <b className="text-white">{p.kills}</b>
                </span>

                <span className="text-cyan-300">
                  ⬤ <b className="text-white">
                    {Math.floor(p.maxMass)}
                  </b>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center shrink-0">
          <button
            onClick={() => backToMainMenu(false)}
            className="
              px-6 py-3
              rounded-lg
              text-sm font-semibold
              bg-gradient-to-r from-purple-500 to-blue-500
              hover:from-purple-400 hover:to-blue-400
              transition-all duration-200
              shadow-lg
            "
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
