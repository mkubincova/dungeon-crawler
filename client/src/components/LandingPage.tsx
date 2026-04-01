import { useState } from "react";
import type { GameState, DMAction, DungeonMap } from "../../../shared/types.js";
import { THEMES, THEME_IDS, type ThemeId } from "../../../shared/themes/index.js";
import { startGame, fetchDungeonMap } from "../api.js";

interface Props {
  onGameStarted: (
    state: GameState,
    narration: string,
    actions: DMAction[],
    map: DungeonMap,
    theme: ThemeId
  ) => void;
}

export function LandingPage({ onGameStarted }: Props) {
  const [playerName, setPlayerName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("dungeon");
  const [loading, setLoading] = useState(false);

  const theme = THEMES[selectedTheme];

  async function handleStart() {
    setLoading(true);
    try {
      const [gameRes, mapRes] = await Promise.all([
        startGame(playerName || "Adventurer", selectedTheme),
        fetchDungeonMap(selectedTheme),
      ]);
      onGameStarted(gameRes.gameState, gameRes.narration, gameRes.actions, mapRes, selectedTheme);
    } catch (err) {
      console.error("Failed to start game:", err);
      alert("Failed to start game. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing">
      <div className="landing-content">
        <h1>{theme.title}</h1>
        <p className="subtitle">{theme.subtitle}</p>

        <div className="theme-picker">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            return (
              <button
                key={id}
                className={`theme-card ${id === selectedTheme ? "selected" : ""}`}
                onClick={() => setSelectedTheme(id)}
              >
                <span className="theme-emoji">{t.emoji}</span>
                <span className="theme-label">{t.title}</span>
              </button>
            );
          })}
        </div>

        <div className="start-form">
          <input
            type="text"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            maxLength={30}
          />
          <button onClick={handleStart} disabled={loading}>
            {loading ? "Loading..." : "Start Adventure"}
          </button>
        </div>
      </div>
    </div>
  );
}
