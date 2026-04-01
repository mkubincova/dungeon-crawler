import type { GameState } from "../../../shared/types.js";

interface Props {
  gameState: GameState;
}

const ITEM_LABELS: Record<string, string> = {
  rune_fragment: "Rune Fragment",
  iron_shield: "Iron Shield",
  healing_potion: "Healing Potion",
  crown_of_ages: "Crown of Ages",
};

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
            className="hp-bar"
            style={{
              width: `${hpPercent}%`,
              backgroundColor:
                hpPercent > 50 ? "#4a2" : hpPercent > 25 ? "#ca2" : "#c22",
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
              <li key={item}>{ITEM_LABELS[item] || item}</li>
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
