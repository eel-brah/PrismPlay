import { FinalStatus } from "src/shared/agario/types";

type Props = {
  status: FinalStatus;
  onClose: () => void;
};

export const StatsRow = ({
  kills,
  maxMass,
}: {
  kills: number;
  maxMass: number;
}) => (
  <div className="flex items-center gap-6 text-sm text-gray-300">
    <span className="text-red-400">
      Kills: <b className="text-white">{kills}</b>
    </span>
    <span className="text-cyan-300">
      Max Mass: <b className="text-white">{Math.floor(maxMass)}</b>
    </span>
  </div>
);

export const FinalStatusOverlay = ({ status, onClose }: Props) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">

      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="
        relative
        w-[420px] max-w-[92vw]
        rounded-2xl
        bg-white/[0.05]
        border border-white/10
        backdrop-blur-2xl
        shadow-[0_10px_60px_rgba(0,0,0,0.6)]
        p-8
        text-white
      ">

        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Match Summary
          </div>
          <div className="text-sm text-white/50 mt-2">
            You left the match
          </div>
        </div>

        <div className="
          border border-white/10
          bg-white/[0.03]
          rounded-xl
          px-5 py-4
        ">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg text-gray-200">
              {status.name}
            </span>

            <StatsRow
              kills={status.kills}
              maxMass={status.maxMass}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onClose}
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
