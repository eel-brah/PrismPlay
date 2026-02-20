import React, { useState, useCallback, useEffect } from "react";

/* ─── types ─── */
type Mark = "X" | "O" | null;
type Board = Mark[];
type Mode = "menu" | "pvp" | "ai";
type GameState = "playing" | "won" | "draw";

const WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

function checkWinner(board: Board): { winner: Mark; line: number[] | null } {
    for (const [a, b, c] of WINNING_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a, b, c] };
        }
    }
    return { winner: null, line: null };
}

function getAiMove(board: Board): number {
    const empty = board
        .map((v, i) => (v === null ? i : -1))
        .filter((i) => i !== -1);
    if (empty.length === 0) return -1;

    // 1. Win if possible
    for (const idx of empty) {
        const copy = [...board];
        copy[idx] = "O";
        if (checkWinner(copy).winner === "O") return idx;
    }
    // 2. Block opponent win
    for (const idx of empty) {
        const copy = [...board];
        copy[idx] = "X";
        if (checkWinner(copy).winner === "X") return idx;
    }
    // 3. Prefer center
    if (empty.includes(4)) return 4;
    // 4. Prefer corners
    const corners = [0, 2, 6, 8].filter((i) => empty.includes(i));
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    // 5. Random edge
    return empty[Math.floor(Math.random() * empty.length)];
}

/* ─── component ─── */
const TicTacToe: React.FC<{ onReturn?: () => void }> = ({ onReturn }) => {
    const [mode, setMode] = useState<Mode>("menu");
    const [board, setBoard] = useState<Board>(Array(9).fill(null));
    const [turn, setTurn] = useState<Mark>("X");
    const [gameState, setGameState] = useState<GameState>("playing");
    const [winLine, setWinLine] = useState<number[] | null>(null);
    const [winner, setWinner] = useState<Mark>(null);
    const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
    const [aiThinking, setAiThinking] = useState(false);

    const resetBoard = useCallback(() => {
        setBoard(Array(9).fill(null));
        setTurn("X");
        setGameState("playing");
        setWinLine(null);
        setWinner(null);
        setAiThinking(false);
    }, []);

    const handleCellClick = useCallback(
        (idx: number) => {
            if (board[idx] || gameState !== "playing" || aiThinking) return;
            if (mode === "ai" && turn === "O") return; // AI's turn

            const next = [...board];
            next[idx] = turn;

            const result = checkWinner(next);
            if (result.winner) {
                setBoard(next);
                setWinner(result.winner);
                setWinLine(result.line);
                setGameState("won");
                setScores((s) => ({ ...s, [result.winner!]: s[result.winner as "X" | "O"] + 1 }));
                return;
            }
            if (next.every((c) => c !== null)) {
                setBoard(next);
                setGameState("draw");
                setScores((s) => ({ ...s, draws: s.draws + 1 }));
                return;
            }

            setBoard(next);
            setTurn(turn === "X" ? "O" : "X");
        },
        [board, turn, gameState, mode, aiThinking],
    );

    // AI move
    useEffect(() => {
        if (mode !== "ai" || turn !== "O" || gameState !== "playing") return;
        setAiThinking(true);
        const timer = setTimeout(() => {
            const move = getAiMove(board);
            if (move === -1) return;

            const next = [...board];
            next[move] = "O";

            const result = checkWinner(next);
            if (result.winner) {
                setBoard(next);
                setWinner(result.winner);
                setWinLine(result.line);
                setGameState("won");
                setScores((s) => ({ ...s, O: s.O + 1 }));
                setAiThinking(false);
                return;
            }
            if (next.every((c) => c !== null)) {
                setBoard(next);
                setGameState("draw");
                setScores((s) => ({ ...s, draws: s.draws + 1 }));
                setAiThinking(false);
                return;
            }

            setBoard(next);
            setTurn("X");
            setAiThinking(false);
        }, 400);
        return () => clearTimeout(timer);
    }, [turn, mode, gameState, board]);

    const startMode = (m: "pvp" | "ai") => {
        setMode(m);
        resetBoard();
        setScores({ X: 0, O: 0, draws: 0 });
    };

    /* ─── menu ─── */
    if (mode === "menu") {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    {/* Title */}
                    <div className="mb-10">
                        <div className="text-6xl mb-4 select-none">❌⭕</div>
                        <h1
                            className="text-5xl font-extrabold tracking-tight"
                            style={{
                                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Tic Tac Toe
                        </h1>
                        <p className="text-gray-400 mt-3 text-lg">Choose your game mode</p>
                    </div>

                    {/* Mode buttons */}
                    <div className="space-y-4">
                        <button
                            onClick={() => startMode("pvp")}
                            className="w-full group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 hover:border-cyan-400/50 hover:scale-[1.02] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                                    👥
                                </div>
                                <div className="text-left">
                                    <div className="text-xl font-semibold text-cyan-300">Player vs Player</div>
                                    <div className="text-gray-400 text-sm">Play with a friend locally</div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => startMode("ai")}
                            className="w-full group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 hover:border-purple-400/50 hover:scale-[1.02] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-purple-500/15 border border-purple-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                                    🤖
                                </div>
                                <div className="text-left">
                                    <div className="text-xl font-semibold text-purple-300">Player vs AI</div>
                                    <div className="text-gray-400 text-sm">Challenge the computer</div>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Return */}
                    {onReturn && (
                        <button
                            onClick={onReturn}
                            className="mt-8 text-gray-400 hover:text-white text-sm transition"
                        >
                            ← Back to Games
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* ─── playing / game over ─── */
    const markColor = (m: Mark) =>
        m === "X" ? "#06b6d4" : m === "O" ? "#a855f7" : "transparent";

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                {/* Header */}
                <div className="mb-6">
                    <h2
                        className="text-3xl font-bold"
                        style={{
                            background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Tic Tac Toe
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {mode === "ai" ? "Player vs AI" : "Player vs Player"}
                    </p>
                </div>

                {/* Scoreboard */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <div className="text-cyan-400 font-bold text-lg">X</div>
                        <div className="text-white text-2xl font-extrabold">{scores.X}</div>
                        {mode === "ai" && <div className="text-gray-500 text-xs">You</div>}
                    </div>
                    <div className="text-center">
                        <div className="text-gray-400 font-bold text-lg">Draw</div>
                        <div className="text-white text-2xl font-extrabold">{scores.draws}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-purple-400 font-bold text-lg">O</div>
                        <div className="text-white text-2xl font-extrabold">{scores.O}</div>
                        {mode === "ai" && <div className="text-gray-500 text-xs">AI</div>}
                    </div>
                </div>

                {/* Turn / status indicator */}
                <div className="mb-5 h-8 flex items-center justify-center">
                    {gameState === "playing" && (
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <span
                                className="inline-block w-4 h-4 rounded-full"
                                style={{
                                    background: markColor(turn),
                                    boxShadow: `0 0 12px ${markColor(turn)}`,
                                }}
                            />
                            <span className="text-gray-300">
                                {mode === "ai" && turn === "O" ? "AI is thinking…" : `${turn}'s turn`}
                            </span>
                        </div>
                    )}
                    {gameState === "won" && (
                        <div
                            className="text-lg font-bold animate-pulse"
                            style={{ color: markColor(winner) }}
                        >
                            {mode === "ai" && winner === "O" ? "AI wins!" : `${winner} wins!`}
                        </div>
                    )}
                    {gameState === "draw" && (
                        <div className="text-lg font-bold text-gray-300">It&apos;s a draw!</div>
                    )}
                </div>

                {/* Board */}
                <div
                    className="inline-grid grid-cols-3 gap-2 p-3 rounded-2xl"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    {board.map((cell, i) => {
                        const isWinCell = winLine?.includes(i);
                        return (
                            <button
                                key={i}
                                onClick={() => handleCellClick(i)}
                                disabled={!!cell || gameState !== "playing" || aiThinking}
                                className="relative w-24 h-24 rounded-xl flex items-center justify-center text-4xl font-extrabold transition-all duration-200 select-none"
                                style={{
                                    background: isWinCell
                                        ? `${markColor(cell)}15`
                                        : "rgba(255,255,255,0.04)",
                                    border: `1.5px solid ${isWinCell
                                            ? markColor(cell)
                                            : cell
                                                ? `${markColor(cell)}30`
                                                : "rgba(255,255,255,0.08)"
                                        }`,
                                    color: markColor(cell),
                                    textShadow: cell ? `0 0 20px ${markColor(cell)}` : "none",
                                    cursor:
                                        cell || gameState !== "playing" || aiThinking
                                            ? "default"
                                            : "pointer",
                                    transform: cell ? "scale(1)" : undefined,
                                    animation: cell ? "ttt-pop .2s ease-out" : undefined,
                                }}
                                onMouseEnter={(e) => {
                                    if (!cell && gameState === "playing" && !aiThinking) {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            "rgba(255,255,255,0.08)";
                                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                                            markColor(turn) + "60";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!cell) {
                                        (e.currentTarget as HTMLButtonElement).style.background =
                                            "rgba(255,255,255,0.04)";
                                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                                            "rgba(255,255,255,0.08)";
                                    }
                                }}
                            >
                                {cell}
                            </button>
                        );
                    })}
                </div>

                {/* Buttons */}
                <div className="mt-6 flex justify-center gap-3">
                    {gameState !== "playing" && (
                        <button
                            onClick={resetBoard}
                            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                            style={{
                                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                            }}
                        >
                            Play Again
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setMode("menu");
                            resetBoard();
                        }}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold
              border border-white/15 text-gray-300 hover:text-white
              hover:bg-white/10 transition-all"
                    >
                        Menu
                    </button>
                </div>

                {/* Return */}
                {onReturn && (
                    <button
                        onClick={onReturn}
                        className="mt-4 text-gray-500 hover:text-gray-300 text-xs transition"
                    >
                        ← Back to Games
                    </button>
                )}

                {/* Inline keyframe for pop animation */}
                <style>{`
          @keyframes ttt-pop {
            0% { transform: scale(0.3); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
            </div>
        </div>
    );
};

export default TicTacToe;
