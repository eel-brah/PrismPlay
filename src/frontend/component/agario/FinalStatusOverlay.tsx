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
      Kills: <b>{kills}</b>
    </span>
    <span>
      Max Mass: <b>{Math.floor(maxMass)}</b>
    </span>
  </div>
);

export const FinalStatusOverlay = ({ status, onClose }: Props) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className="w-[420px] max-w-[92vw] bg-zinc-900 rounded-xl shadow-xl p-6 text-white">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-gray-200">
            Match Summary
          </div>
          <div className="text-sm text-gray-400 mt-1">
            You left the match
          </div>
        </div>

        {/* Player Stats */}
        <div className="border border-white/10 rounded-lg">
          <div className="flex justify-between items-center px-4 py-3">
            <span className="font-semibold">{status.name}</span>
            <StatsRow
              kills={status.kills}
              maxMass={status.maxMass}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-md text-lg text-white transition"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
