import { useEffect, useRef, useState } from "react";
import type { TurnLogEntry } from "../../../shared/types.js";

interface Props {
  turnLog: TurnLogEntry[];
  currentNarration: string;
}

function useTypewriter(text: string, charsPerTick = 2, intervalMs = 18) {
  const [displayed, setDisplayed] = useState("");
  const prevTextRef = useRef(text);

  useEffect(() => {
    // If the text changed, start typing from scratch
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
      setDisplayed("");
    }
  }, [text]);

  useEffect(() => {
    if (displayed.length >= text.length) return;
    const id = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + charsPerTick));
    }, intervalMs);
    return () => clearTimeout(id);
  }, [displayed, text, charsPerTick, intervalMs]);

  return { displayed, done: displayed.length >= text.length };
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
  const logRef = useRef<HTMLDivElement>(null);
  const { displayed, done } = useTypewriter(currentNarration, 2, 18);

  const scrollToEnd = () =>
    endRef.current?.scrollIntoView({ behavior: "smooth" });

  // Scroll as text types and when typing finishes
  useEffect(scrollToEnd, [turnLog.length, displayed, done]);

  // Re-scroll when the log container resizes (e.g. action panel appearing
  // below shrinks available height, pushing the end out of view)
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const ro = new ResizeObserver(scrollToEnd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const previousTurns = turnLog.slice(0, -1);

  // Build a stable player→index map from the log
  const playerOrder: string[] = [];
  for (const entry of turnLog) {
    if (!playerOrder.includes(entry.playerId)) {
      playerOrder.push(entry.playerId);
    }
  }

  return (
    <div className="narration-log" ref={logRef}>
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
        {displayed.split("\n\n").map((para, i) => (
          <p key={i}>
            {para}
            {!done && i === displayed.split("\n\n").length - 1 && (
              <span className="typing-cursor" />
            )}
          </p>
        ))}
      </div>
      <div ref={endRef} />
    </div>
  );
}
