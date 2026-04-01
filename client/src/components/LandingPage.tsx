import { useState } from "react";
import type { GameState, DMAction, DungeonMap } from "../../../shared/types.js";
import { startGame, fetchDungeonMap } from "../api.js";

interface Props {
  onGameStarted: (
    state: GameState,
    narration: string,
    actions: DMAction[],
    map: DungeonMap
  ) => void;
}

export function LandingPage({ onGameStarted }: Props) {
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const [gameRes, mapRes] = await Promise.all([
        startGame(playerName || "Adventurer"),
        fetchDungeonMap(),
      ]);
      onGameStarted(gameRes.gameState, gameRes.narration, gameRes.actions, mapRes);
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
        <h1>Mini D&D Dungeon Crawler</h1>
        <p className="subtitle">A solo adventure guided by an AI Dungeon Master</p>
        <div className="start-form">
          <input
            type="text"
            placeholder="Enter your hero's name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            maxLength={30}
          />
          <button onClick={handleStart} disabled={loading}>
            {loading ? "Entering dungeon..." : "Start Adventure"}
          </button>
        </div>
      </div>
    </div>
  );
}
