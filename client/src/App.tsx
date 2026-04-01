import { useState } from "react";
import type {
  GameState,
  DMAction,
  DungeonMap,
} from "../../shared/types.js";
import { LandingPage } from "./components/LandingPage.js";
import { GameView } from "./components/GameView.js";

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [narration, setNarration] = useState("");
  const [actions, setActions] = useState<DMAction[]>([]);
  const [dungeonMap, setDungeonMap] = useState<DungeonMap | null>(null);

  function handleGameStarted(
    state: GameState,
    narr: string,
    acts: DMAction[],
    map: DungeonMap
  ) {
    setGameState(state);
    setNarration(narr);
    setActions(acts);
    setDungeonMap(map);
  }

  function handleActionResult(
    state: GameState,
    narr: string,
    acts: DMAction[]
  ) {
    setGameState(state);
    setNarration(narr);
    setActions(acts);
  }

  function handleRestart() {
    setGameState(null);
    setNarration("");
    setActions([]);
    setDungeonMap(null);
  }

  if (!gameState) {
    return <LandingPage onGameStarted={handleGameStarted} />;
  }

  return (
    <GameView
      gameState={gameState}
      narration={narration}
      actions={actions}
      dungeonMap={dungeonMap!}
      onActionResult={handleActionResult}
      onRestart={handleRestart}
    />
  );
}
