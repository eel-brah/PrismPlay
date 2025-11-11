import { Difficulty } from "@/game/types";
import React from "react";

export const difficultyLevels: Difficulty[] = ["easy", "medium", "hard"];

interface Props {
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
}

export default function DifficultySlider({ difficulty, setDifficulty }: Props) {
  const currentIndex = difficultyLevels.indexOf(difficulty);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    setDifficulty(difficultyLevels[index]);
  };

  return (
    <div>
      <label className="block text-gray-300 mb-2 font-medium">Difficulty</label>

      <input
        type="range"
        min={0}
        max={difficultyLevels.length - 1}
        step={1}
        value={currentIndex}
        onChange={handleChange}
        className="w-full cursor-pointer accent-blue-500"
      />

      <div className="flex justify-between mt-1 text-sm text-gray-400">
        {difficultyLevels.map((lvl) => (
          <span
            key={lvl}
            className={
              lvl === difficulty ? "text-blue-400 font-semibold" : "opacity-70"
            }
          >
            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
