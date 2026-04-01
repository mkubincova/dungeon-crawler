import { useEffect, useRef } from "react";
import type { TurnLogEntry } from "../../../shared/types.js";

interface Props {
  turnLog: TurnLogEntry[];
  currentNarration: string;
}

export function NarrationLog({ turnLog, currentNarration }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnLog.length, currentNarration]);

  // Show previous turns (all but last, since current narration covers the latest)
  const previousTurns = turnLog.slice(0, -1);

  return (
    <div className="narration-log">
      {previousTurns.map((entry, i) => (
        <div key={i} className="log-entry past">
          {entry.chosenAction && (
            <div className="chosen-action">
              &gt; {entry.chosenAction.replace("move:", "Go to ")}
            </div>
          )}
          <p>{entry.narration}</p>
        </div>
      ))}
      <div className="log-entry current">
        {currentNarration.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <div ref={endRef} />
    </div>
  );
}
