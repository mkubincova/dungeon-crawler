import type { GameState } from "../../../shared/types.js";

interface Props {
  gameState: GameState;
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

export function PlayerHUD({ gameState }: Props) {
  const { player, inventory, flags } = gameState;
  const hpPercent = (player.hp / player.maxHp) * 100;
  const activeFlags = Object.entries(flags).filter(([, v]) => v);

  return (
    <div className="hud">
      <h2>{player.name}</h2>
      <div className="hp-section">
        <span className="hp-label">
          HP: {player.hp}/{player.maxHp}
        </span>
        <div className="hp-bar-bg">
          <div
            className={`hp-bar${hpPercent <= 25 ? " critical" : ""}`}
            style={{
              width: `${hpPercent}%`,
              backgroundColor:
                hpPercent > 50 ? "#3a8a45" : hpPercent > 25 ? "#b89a30" : "#b83a3a",
            }}
          />
        </div>
      </div>

      <div className="inventory-section">
        <h3>Inventory</h3>
        {inventory.length === 0 ? (
          <p className="empty">Empty</p>
        ) : (
          <ul>
            {inventory.map((item) => (
              <li key={item}>{formatItemName(item)}</li>
            ))}
          </ul>
        )}
      </div>

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
