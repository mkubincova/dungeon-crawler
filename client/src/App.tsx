import { useState, useEffect } from "react";
import type {
  GameState,
  DMAction,
  DungeonMap,
  Lobby,
  ScoreEntry,
} from "../../shared/types.js";
import type { ThemeId } from "../../shared/themes/index.js";
import { socket } from "./socket.js";
import { fetchDungeonMap } from "./api.js";
import { LobbyPage } from "./components/LobbyPage.js";
import { GameView } from "./components/GameView.js";
import { ScoreBoard } from "./components/ScoreBoard.js";

type Phase = "lobby" | "game" | "scoreboard";

export default function App() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [narration, setNarration] = useState("");
  const [actions, setActions] = useState<DMAction[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [dungeonMap, setDungeonMap] = useState<DungeonMap | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("dungeon");

  useEffect(() => {
    socket.on("lobby:created", ({ lobby, playerId }) => {
      setLobby(lobby);
      setMyPlayerId(playerId);
      setThemeId(lobby.theme as ThemeId);
    });

    socket.on("lobby:updated", ({ lobby }) => {
      setLobby(lobby);
    });

    socket.on("lobby:error", ({ message }) => {
      alert(`Error: ${message}`);
    });

    socket.on("game:started", ({ gameState, narration, playerId }) => {
      setGameState(gameState);
      setNarration(narration);
      setMyPlayerId(playerId);
      setThemeId(gameState.theme as ThemeId);
      setPhase("game");
      fetchDungeonMap(gameState.theme)
        .then(setDungeonMap)
        .catch(console.error);
    });

    socket.on("game:turn", ({ activePlayerId, deadline, actions }) => {
      setActivePlayerId(activePlayerId);
      setTurnDeadline(deadline);
      if (actions.length > 0) {
        setActions(actions);
      }
    });

    socket.on("game:update", ({ gameState, narration }) => {
      setGameState(gameState);
      setNarration(narration);
      // Clear actions when it's no longer our turn (active player changed)
      setActivePlayerId(gameState.turnOrder[gameState.currentTurnIndex]);
    });

    socket.on("game:ended", ({ gameState, scores }) => {
      setGameState(gameState);
      setScores(scores);
      setPhase("scoreboard");
    });

    return () => {
      socket.off("lobby:created");
      socket.off("lobby:updated");
      socket.off("lobby:error");
      socket.off("game:started");
      socket.off("game:turn");
      socket.off("game:update");
      socket.off("game:ended");
    };
  }, []);

  function handleRestart() {
    socket.disconnect();
    setPhase("lobby");
    setMyPlayerId(null);
    setLobby(null);
    setGameState(null);
    setNarration("");
    setActions([]);
    setActivePlayerId(null);
    setTurnDeadline(null);
    setScores(null);
    setDungeonMap(null);
  }

  if (phase === "lobby") {
    return <LobbyPage lobby={lobby} myPlayerId={myPlayerId} />;
  }

  if (phase === "scoreboard" && scores && gameState) {
    return (
      <ScoreBoard
        scores={scores}
        gameState={gameState}
        myPlayerId={myPlayerId}
        onPlayAgain={handleRestart}
      />
    );
  }

  if (phase === "game" && gameState && dungeonMap) {
    return (
      <GameView
        gameState={gameState}
        narration={narration}
        actions={actions}
        dungeonMap={dungeonMap}
        themeId={themeId}
        myPlayerId={myPlayerId}
        activePlayerId={activePlayerId}
        turnDeadline={turnDeadline}
        onRestart={handleRestart}
      />
    );
  }

  return <LobbyPage lobby={lobby} myPlayerId={myPlayerId} />;
}
