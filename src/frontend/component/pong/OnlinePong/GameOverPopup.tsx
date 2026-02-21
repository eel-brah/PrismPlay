import { Trophy, Frown, User, Search, LogOut, Swords } from "lucide-react";
import type { Side } from "../../../../shared/pong/gameTypes";
import { useNavigate } from "react-router";

export type WinReason = "score" | "surrender" | "disconnect";

export interface GameOverPopupProps {
  isOpen: boolean;
  isWinner: boolean;
  myScore: number;
  opponentScore: number;
  myNickname: string;
  opponentNickname: string;
  mySide: Side;
  winReason?: WinReason;
  onFindMatch?: () => void;
  onLeave: () => void;
}

function getWinReasonText(
  reason: WinReason | undefined,
  isWinner: boolean,
): string {
  switch (reason) {
    case "score":
      return isWinner
        ? "You reached the winning score!"
        : "Opponent reached the winning score";
    case "surrender":
      return isWinner ? "Opponent surrendered" : "You surrendered";
    case "disconnect":
      return isWinner ? "Opponent disconnected" : "You disconnected";
    default:
      return isWinner ? "Victory!" : "Defeat";
  }
}

function getWinReasonIcon(reason: WinReason | undefined) {
  switch (reason) {
    case "score":
      return <Swords className="w-5 h-5" />;
    case "surrender":
      return <LogOut className="w-5 h-5" />;
    case "disconnect":
      return <LogOut className="w-5 h-5" />;
    default:
      return <Swords className="w-5 h-5" />;
  }
}

export function GameOverPopup({
  isOpen,
  isWinner,
  myScore,
  opponentScore,
  myNickname,
  opponentNickname,
  mySide,
  winReason,
  onFindMatch,
  onLeave,
}: GameOverPopupProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;
  const resultColor = isWinner
    ? "from-green-500 to-emerald-600"
    : "from-red-500 to-rose-600";

  const resultBgGlow = isWinner ? "shadow-green-500/30" : "shadow-red-500/30";

  const ResultIcon = isWinner ? Trophy : Frown;

  const leftName = mySide === "left" ? myNickname : opponentNickname;
  const rightName = mySide === "right" ? myNickname : opponentNickname;
  const leftScore = mySide === "left" ? myScore : opponentScore;
  const rightScore = mySide === "right" ? myScore : opponentScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl ${resultBgGlow} overflow-hidden`}
        >
          <div
            className={`bg-gradient-to-r ${resultColor} px-6 py-5 text-center`}
          >
            <div className="flex items-center justify-center gap-3">
              <ResultIcon className="w-10 h-10 text-white drop-shadow-lg" />
              <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                {isWinner ? "VICTORY!" : "DEFEAT"}
              </h2>
              <ResultIcon className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1 truncate max-w-[100px]">
                  {mySide === "left" ? "You" : leftName}
                </p>
                <p
                  className={`text-4xl font-bold ${
                    mySide === "left" ? "text-purple-400" : "text-pink-400"
                  }`}
                >
                  {leftScore}
                </p>
                <p className="text-xs text-gray-500 mt-1">LEFT</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-px h-8 bg-gray-700" />
                <span className="text-gray-500 font-bold text-sm py-2">VS</span>
                <div className="w-px h-8 bg-gray-700" />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1 truncate max-w-[100px]">
                  {mySide === "right" ? "You" : rightName}
                </p>
                <p
                  className={`text-4xl font-bold ${
                    mySide === "right" ? "text-purple-400" : "text-pink-400"
                  }`}
                >
                  {rightScore}
                </p>
                <p className="text-xs text-gray-500 mt-1">RIGHT</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-800/50 rounded-lg border border-gray-700/40">
              <span className={isWinner ? "text-green-400" : "text-red-400"}>
                {getWinReasonIcon(winReason)}
              </span>
              <span className="text-gray-300 text-sm">
                {getWinReasonText(winReason, isWinner)}
              </span>
            </div>

            <div className="space-y-3">
              {onFindMatch && (
                <button
                  onClick={onFindMatch}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                >
                  <Search className="w-5 h-5" />
                  <span>Find New Match</span>
                </button>
              )}

              <button
                onClick={() => {
                  navigate("/profile/" + opponentNickname);
                }}
                className="w-full flex items-center justify-center gap-3 bg-gray-700/50 hover:bg-gray-700 text-gray-200 font-semibold py-3 px-4 rounded-xl transition-all border border-gray-600/50 hover:border-gray-500/50"
              >
                <User className="w-5 h-5" />
                <span>Opponent Profile</span>
              </button>

              <button
                onClick={onLeave}
                className="w-full flex items-center justify-center gap-3 bg-transparent hover:bg-gray-800/50 text-gray-400 hover:text-gray-300 font-medium py-3 px-4 rounded-xl transition-all border border-transparent hover:border-gray-700/50"
              >
                <LogOut className="w-5 h-5" />
                <span>Leave to Games</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameOverPopup;
