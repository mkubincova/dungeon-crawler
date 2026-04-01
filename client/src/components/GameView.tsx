import { useState } from "react";
import type { GameState, DMAction, DungeonMap } from "../../../shared/types.js";
import type { ThemeId } from "../../../shared/themes/index.js";
import { submitAction } from "../api.js";
import { DungeonMapView } from "./DungeonMap.js";
import { NarrationLog } from "./NarrationLog.js";
import { ActionPanel } from "./ActionPanel.js";
import { PlayerHUD } from "./PlayerHUD.js";
import { CurrentRoomCard } from "./CurrentRoomCard.js";

interface Props {
  gameState: GameState;
  narration: string;
  actions: DMAction[];
  dungeonMap: DungeonMap;
  themeId: ThemeId;
  onActionResult: (
    state: GameState,
    narration: string,
    actions: DMAction[]
  ) => void;
  onRestart: () => void;
}

export function GameView({
  gameState,
  narration,
  actions,
  dungeonMap,
  themeId,
  onActionResult,
  onRestart,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAction(actionId: string) {
    setLoading(true);
    try {
      const res = await submitAction(gameState.id, actionId);
      onActionResult(res.gameState, res.narration, res.actions);
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const isGameOver = gameState.status !== "playing";
  const currentRoom = dungeonMap[gameState.currentRoomId];

  return (
    <div className="game-view">
      <div className="game-sidebar">
        <PlayerHUD gameState={gameState} />
        {currentRoom && <CurrentRoomCard room={currentRoom} themeId={themeId} />}
      </div>
      <div className="game-main">
        <div className="game-content">
          <div className="game-map-panel">
            <DungeonMapView dungeonMap={dungeonMap} gameState={gameState} themeId={themeId} />
          </div>
          <div className="game-narration-panel">
            <NarrationLog turnLog={gameState.turnLog} currentNarration={narration} />
          </div>
        </div>
        {isGameOver ? (
          <div className="game-over">
            <h2>{gameState.status === "won" ? "Victory!" : "Defeat..."}</h2>
            <p>
              {gameState.status === "won"
                ? "You have conquered the challenge!"
                : "Your adventure has come to an end."}
            </p>
            <button onClick={onRestart}>Play Again</button>
          </div>
        ) : (
          <ActionPanel
            actions={actions}
            onAction={handleAction}
            disabled={loading}
          />
        )}
      </div>
    </div>
  );
}
