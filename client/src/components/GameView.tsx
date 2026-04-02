import { useState, useEffect } from "react";
import type { GameState, DMAction, DungeonMap } from "../../../shared/types.js";
import type { ThemeId } from "../../../shared/themes/index.js";
import { socket } from "../socket.js";
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
  myPlayerId: string | null;
  activePlayerId: string | null;
  turnDeadline: number | null;
  loading: boolean;
  onLoading: (loading: boolean) => void;
  onRestart: () => void;
}

export function GameView({
  gameState,
  narration,
  actions,
  dungeonMap,
  themeId,
  myPlayerId,
  activePlayerId,
  turnDeadline,
  loading,
  onLoading,
  onRestart,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isMyTurn = activePlayerId === myPlayerId;
  const isGameOver = gameState.status !== "playing";
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const currentRoomId = myPlayer?.currentRoomId;
  const currentRoom = currentRoomId ? dungeonMap[currentRoomId] : null;

  useEffect(() => {
    if (!turnDeadline || !isMyTurn) {
      setTimeLeft(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [turnDeadline, isMyTurn]);

  function handleAction(actionId: string) {
    if (loading) return;
    onLoading(true);
    socket.emit("game:action", { actionId });
  }

  const activePlayer = activePlayerId
    ? gameState.players.find((p) => p.id === activePlayerId)
    : null;

  return (
    <div className="game-view">
      <div className="game-sidebar">
        <PlayerHUD
          gameState={gameState}
          myPlayerId={myPlayerId}
          activePlayerId={activePlayerId}
        />
        {currentRoom && (
          <CurrentRoomCard room={currentRoom} themeId={themeId} />
        )}
      </div>
      <div className="game-main">
        {/* Turn indicator */}
        {!isGameOver && (
          <div className={`turn-indicator ${isMyTurn ? (loading ? "my-turn processing" : "my-turn") : "waiting"}`}>
            {isMyTurn ? (
              loading ? (
                <span>Fate is being written...</span>
              ) : (
                <span>
                  Your turn!{timeLeft !== null ? ` (${timeLeft}s)` : ""}
                </span>
              )
            ) : (
              <span>
                Waiting for {activePlayer?.name ?? "..."}...
              </span>
            )}
          </div>
        )}

        <div className="game-content">
          <div className="game-map-panel">
            <DungeonMapView
              dungeonMap={dungeonMap}
              gameState={gameState}
              themeId={themeId}
              myPlayerId={myPlayerId}
            />
          </div>
          <div className="game-narration-panel">
            <NarrationLog
              turnLog={gameState.turnLog}
              currentNarration={narration}
            />
          </div>
        </div>

        {isGameOver ? (
          <div className="game-over">
            <h2>{gameState.status === "won" ? "Victory!" : "Defeat..."}</h2>
            <p>
              {gameState.status === "won"
                ? "The dungeon has been conquered!"
                : "All adventurers have fallen."}
            </p>
            <button onClick={onRestart}>Return to Lobby</button>
          </div>
        ) : isMyTurn && loading ? (
          <div className="dm-loading-panel">
            <div className="dm-loading-runes">
              <span className="rune">&#x16A0;</span>
              <span className="rune">&#x16B1;</span>
              <span className="rune">&#x16C7;</span>
              <span className="rune">&#x16A8;</span>
              <span className="rune">&#x16BE;</span>
            </div>
            <p className="dm-loading-text">The Dungeon Master deliberates...</p>
          </div>
        ) : isMyTurn ? (
          <ActionPanel
            actions={actions}
            onAction={handleAction}
            disabled={loading}
          />
        ) : (
          <div className="waiting-panel">
            <p>Waiting for {activePlayer?.name ?? "another player"} to act...</p>
          </div>
        )}
      </div>
    </div>
  );
}
