import type { GameState } from "../../../shared/types.js";

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  activePlayerId: string | null;
}

function formatItemName(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const FLAG_LABELS: Record<string, string> = {
  solvedPuzzle: "Puzzle Solved",
  doorUnlocked: "Door Unlocked",
  metBoss: "Met the Boss",
  defeatedBoss: "Boss Defeated",
};

const PLAYER_COLORS = ["#d4a847", "#4fc3f7", "#e040fb", "#69f0ae"];

export function PlayerHUD({ gameState, myPlayerId, activePlayerId }: Props) {
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const activeFlags = Object.entries(gameState.sharedFlags).filter(([, v]) => v);

  return (
    <div className="hud">
      {/* My player stats */}
      {myPlayer && (
        <div className="hud-my-player">
          <h2>{myPlayer.name}</h2>
          <div className="hp-section">
            <span className="hp-label">
              HP: {myPlayer.hp}/{myPlayer.maxHp}
            </span>
            <div className="hp-bar-bg">
              <div
                className={`hp-bar${(myPlayer.hp / myPlayer.maxHp) * 100 <= 25 ? " critical" : ""}`}
                style={{
                  width: `${(myPlayer.hp / myPlayer.maxHp) * 100}%`,
                  backgroundColor:
                    (myPlayer.hp / myPlayer.maxHp) > 0.5
                      ? "#3a8a45"
                      : (myPlayer.hp / myPlayer.maxHp) > 0.25
                      ? "#b89a30"
                      : "#b83a3a",
                }}
              />
            </div>
          </div>

          <div className="inventory-section">
            <h3>Inventory</h3>
            {myPlayer.inventory.length === 0 ? (
              <p className="empty">Empty</p>
            ) : (
              <ul>
                {myPlayer.inventory.map((item) => (
                  <li key={item}>{formatItemName(item)}</li>
                ))}
              </ul>
            )}
          </div>

          {myPlayer.objective && (
            <div className="objective-section">
              <h3>Your Objective</h3>
              <p className={`objective-text ${myPlayer.objectiveComplete ? "complete" : ""}`}>
                {myPlayer.objectiveComplete ? "✓ " : ""}
                {myPlayer.objective.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* All players overview */}
      {gameState.players.length > 1 && (
        <div className="all-players-section">
          <h3>Players</h3>
          {gameState.players.map((player, i) => {
            const isActive = player.id === activePlayerId;
            const isMe = player.id === myPlayerId;
            const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
            const hpPercent = (player.hp / player.maxHp) * 100;
            return (
              <div
                key={player.id}
                className={`player-row-hud ${isActive ? "active-turn" : ""} ${player.status === "dead" ? "dead" : ""}`}
              >
                <span
                  className="player-color-dot"
                  style={{ backgroundColor: color }}
                />
                <span className="player-row-name">
                  {player.name}
                  {isMe ? " (You)" : ""}
                  {isActive ? " ◄" : ""}
                </span>
                {player.status === "dead" ? (
                  <span className="dead-label">DEAD</span>
                ) : (
                  <div className="mini-hp-bar-bg">
                    <div
                      className="mini-hp-bar"
                      style={{
                        width: `${hpPercent}%`,
                        backgroundColor:
                          hpPercent > 50 ? "#3a8a45" : hpPercent > 25 ? "#b89a30" : "#b83a3a",
                      }}
                    />
                  </div>
                )}
                <span className="player-row-hp">
                  {player.status === "dead" ? "" : `${player.hp}/${player.maxHp}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared flags */}
      {activeFlags.length > 0 && (
        <div className="flags-section">
          <h3>Progress</h3>
          <ul>
            {activeFlags.map(([key]) => (
              <li key={key}>{FLAG_LABELS[key] || key}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
