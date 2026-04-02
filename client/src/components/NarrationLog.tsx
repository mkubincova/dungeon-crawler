import { useEffect, useRef } from "react";
import type { TurnLogEntry } from "../../../shared/types.js";

interface Props {
  turnLog: TurnLogEntry[];
  currentNarration: string;
}

const PLAYER_COLORS = ["#d4a847", "#4fc3f7", "#e040fb", "#69f0ae"];
const playerColorMap = new Map<string, string>();

function getPlayerColor(playerId: string, index: number): string {
  if (!playerColorMap.has(playerId)) {
    playerColorMap.set(playerId, PLAYER_COLORS[index % PLAYER_COLORS.length]);
  }
  return playerColorMap.get(playerId)!;
}

export function NarrationLog({ turnLog, currentNarration }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnLog.length, currentNarration]);

  const previousTurns = turnLog.slice(0, -1);

  // Build a stable player→index map from the log
  const playerOrder: string[] = [];
  for (const entry of turnLog) {
    if (!playerOrder.includes(entry.playerId)) {
      playerOrder.push(entry.playerId);
    }
  }

  return (
    <div className="narration-log">
      {previousTurns.map((entry, i) => {
        const playerIndex = playerOrder.indexOf(entry.playerId);
        const color = getPlayerColor(entry.playerId, playerIndex);
        return (
          <div key={i} className="log-entry past">
            <div className="log-player-label" style={{ color }}>
              {entry.playerName}
            </div>
            {entry.chosenAction && (
              <div className="chosen-action">
                &gt; {entry.chosenAction.replace("move:", "Go to ")}
              </div>
            )}
            <p>{entry.narration}</p>
          </div>
        );
      })}
      <div className="log-entry current">
        {currentNarration.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <div ref={endRef} />
    </div>
  );
}
