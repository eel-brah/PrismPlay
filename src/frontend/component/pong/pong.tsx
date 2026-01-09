import React, { useEffect, useRef, useState } from "react";
import type { AiPos, Difficulty } from "@/game/pong/types";
import type { GameColors, PlayerProfile } from "@/game/pong/models";
import { THEMES } from "@/game/pong/visuals";
import { runPongEngine } from "@/game/pong/engine";

import MenuScreen from "./screens/MenuScreen";
import SetupScreen from "./screens/SetupScreen";
import PlayingScreen from "./screens/PlayingScreen";

const Pong: React.FC<{ onReturn?: () => void }> = ({ onReturn }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameMode, setGameMode] = useState<"menu" | "setup" | "playing">(
    "menu"
  );
  const [isSingle, setIsSingle] = useState<boolean>(false);
  const [isAI, setIsAI] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [aiPos, setAiPos] = useState<AiPos>("left");

  const [leftPlayer, setLeftPlayer] = useState<PlayerProfile>({
    name: "Player 1",
    avatar: "felix",
    paddleColor: "#89b4fa",
  });
  const [rightPlayer, setRightPlayer] = useState<PlayerProfile>({
    name: "Player 2",
    avatar: "luna",
    paddleColor: "#f5c2e7",
  });

  const [gameColors, setGameColors] = useState<GameColors>({
    ballColor: "#f5e0dc",
    theme: "classic",
  });

  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const getCurrentTheme = () =>
    THEMES.find((t) => t.id === gameColors.theme) || THEMES[0];

  const startGame = (mode: "single" | "two" | "ai") => {
    if (mode === "single") {
      setIsSingle(true);
      setIsAI(true);
      setGameMode("setup");
    } else if (mode === "two") {
      setIsSingle(false);
      setIsAI(false);
      setGameMode("setup");
    } else {
      setIsSingle(false);
      setIsAI(true);
      setGameMode("playing");
    }
  };

  useEffect(() => {
    if (gameMode !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanup = runPongEngine({
      canvas,
      difficulty,
      isSingle,
      isAI,
      aiPos,
      leftPlayer,
      rightPlayer,
      gameColors,
      currentTheme: getCurrentTheme(),
      soundOnRef,
    });

    return cleanup;
  }, [
    gameMode,
    leftPlayer,
    rightPlayer,
    gameColors,
    difficulty,
    isSingle,
    isAI,
    aiPos,
  ]);

  return (
    <>
      {gameMode === "menu" && (
        <MenuScreen
          onReturn={onReturn}
          startGame={startGame}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          aiPos={aiPos}
          setAiPos={setAiPos}
        />
      )}

      {gameMode === "setup" && (
        <SetupScreen
          isSingle={isSingle}
          aiPos={aiPos}
          leftPlayer={leftPlayer}
          setLeftPlayer={setLeftPlayer}
          rightPlayer={rightPlayer}
          setRightPlayer={setRightPlayer}
          gameColors={gameColors}
          setGameColors={setGameColors}
          onBack={() => setGameMode("menu")}
          onStart={() => setGameMode("playing")}
        />
      )}

      {gameMode === "playing" && (
        <PlayingScreen
          canvasRef={canvasRef}
          leftPlayer={leftPlayer}
          rightPlayer={rightPlayer}
          isAI={isAI}
          isSingle={isSingle}
          aiPos={aiPos}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          onReturnToMenu={() => setGameMode("menu")}
        />
      )}
    </>
  );
};

export default Pong;
