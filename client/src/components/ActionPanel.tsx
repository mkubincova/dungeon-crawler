import type { DMAction } from "../../../shared/types.js";

interface Props {
  actions: DMAction[];
  onAction: (actionId: string) => void;
  disabled: boolean;
}

export function ActionPanel({ actions, onAction, disabled }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="action-panel">
      <h3>What do you do?</h3>
      <div className="action-buttons">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={`action-btn ${action.id.startsWith("move:") ? "move" : "interact"}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
