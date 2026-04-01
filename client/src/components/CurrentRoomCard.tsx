import type { Room } from "../../../shared/types.js";
import { TAG_COLORS } from "./DungeonMap.js";

interface Props {
  room: Room;
}

const TAG_LABELS: Record<string, string> = {
  safe:   "Safe Zone",
  puzzle: "Puzzle",
  danger: "Danger",
  boss:   "Boss",
  goal:   "Goal",
};

const TAG_ICONS: Record<string, string> = {
  safe:   "\u{1F6E1}",
  puzzle: "\u{1F9E9}",
  danger: "\u{1F480}",
  boss:   "\u{1F432}",
  goal:   "\u{1F451}",
};

export function CurrentRoomCard({ room }: Props) {
  const color = TAG_COLORS[room.tag] || "#888";
  const icon = TAG_ICONS[room.tag] || "?";
  const tagLabel = TAG_LABELS[room.tag] || room.tag;

  return (
    <div className="room-card" style={{ borderColor: color }}>
      <div className="room-card-header">
        <span className="room-card-icon">{icon}</span>
        <h3 className="room-card-name">{room.name}</h3>
      </div>
      <p className="room-card-desc">{room.description}</p>
      <div className="room-card-meta">
        <span className="room-card-tag" style={{ color }}>
          {tagLabel}
        </span>
        <span className="room-card-exits">
          {room.neighbors.length} {room.neighbors.length === 1 ? "exit" : "exits"}
        </span>
      </div>
    </div>
  );
}
