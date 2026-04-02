import { useState } from "react";
import type { Lobby } from "../../../shared/types.js";
import { THEMES, THEME_IDS, type ThemeId } from "../../../shared/themes/index.js";
import { socket } from "../socket.js";

interface Props {
  lobby: Lobby | null;
  myPlayerId: string | null;
}

type Mode = "landing" | "create" | "join" | "waiting";

export function LobbyPage({ lobby, myPlayerId }: Props) {
  const [mode, setMode] = useState<Mode>(lobby ? "waiting" : "landing");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("dungeon");

  // Sync mode when lobby is set from parent
  const effectiveMode = lobby ? "waiting" : mode;

  function handleCreate() {
    if (!playerName.trim()) return;
    socket.connect();
    socket.emit("lobby:create", {
      playerName: playerName.trim(),
      theme: selectedTheme,
    });
    setMode("waiting");
  }

  function handleJoin() {
    if (!playerName.trim() || !roomCode.trim()) return;
    socket.connect();
    socket.emit("lobby:join", {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
    setMode("waiting");
  }

  function handleReady() {
    socket.emit("lobby:ready");
  }

  function handleStart() {
    socket.emit("lobby:start");
  }

  if (effectiveMode === "landing") {
    return (
      <div className="landing">
        <div className="landing-content">
          <h1>Dungeon Crawler</h1>
          <p className="subtitle">A cooperative dungeon adventure</p>
          <div className="lobby-buttons">
            <button onClick={() => setMode("create")} className="btn-primary">
              Create Lobby
            </button>
            <button onClick={() => setMode("join")} className="btn-secondary">
              Join Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveMode === "create") {
    const theme = THEMES[selectedTheme];
    return (
      <div className="landing">
        <div className="landing-content">
          <h1>Create Lobby</h1>

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
          <p className="subtitle">{theme.subtitle}</p>

          <div className="start-form">
            <input
              type="text"
              placeholder="Your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              maxLength={30}
            />
            <button onClick={handleCreate} disabled={!playerName.trim()}>
              Create Lobby
            </button>
          </div>
          <button className="back-btn" onClick={() => setMode("landing")}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (effectiveMode === "join") {
    return (
      <div className="landing">
        <div className="landing-content">
          <h1>Join Lobby</h1>
          <div className="start-form">
            <input
              type="text"
              placeholder="Your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={30}
            />
            <input
              type="text"
              placeholder="Room code (e.g. ABCD)..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={4}
            />
            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || !roomCode.trim()}
            >
              Join Lobby
            </button>
          </div>
          <button className="back-btn" onClick={() => setMode("landing")}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Waiting room
  if (!lobby) {
    return (
      <div className="landing">
        <div className="landing-content">
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  const isHost = myPlayerId === lobby.hostPlayerId;
  const myPlayer = lobby.players.find((p) => p.id === myPlayerId);
  const allReady = lobby.players.every((p) => p.ready);

  return (
    <div className="landing">
      <div className="landing-content lobby-waiting">
        <h1>Lobby</h1>

        <div className="room-code-display">
          <span className="room-code-label">Room Code</span>
          <span className="room-code">{lobby.roomCode}</span>
          <span className="room-code-hint">Share this with friends</span>
        </div>

        <div className="theme-display">
          <span>Theme: {THEMES[lobby.theme as ThemeId]?.title ?? lobby.theme}</span>
        </div>

        <div className="player-list">
          <h3>Players ({lobby.players.length}/4)</h3>
          {lobby.players.map((player) => (
            <div
              key={player.id}
              className={`player-row ${player.id === myPlayerId ? "me" : ""}`}
            >
              <span className="player-name">
                {player.name}
                {player.id === lobby.hostPlayerId && (
                  <span className="host-badge"> (Host)</span>
                )}
                {player.id === myPlayerId && (
                  <span className="you-badge"> (You)</span>
                )}
              </span>
              <span
                className={`ready-indicator ${player.ready ? "ready" : "not-ready"}`}
              >
                {player.ready ? "✓ Ready" : "✗ Not Ready"}
              </span>
            </div>
          ))}
        </div>

        <div className="lobby-actions">
          <button
            onClick={handleReady}
            className={myPlayer?.ready ? "btn-secondary" : "btn-primary"}
          >
            {myPlayer?.ready ? "Unready" : "Ready Up"}
          </button>
          {isHost && (
            <button
              onClick={handleStart}
              disabled={!allReady}
              className="btn-start"
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
