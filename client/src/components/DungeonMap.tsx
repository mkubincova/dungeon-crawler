import type { DungeonMap, GameState } from "../../../shared/types.js";

interface Props {
  dungeonMap: DungeonMap;
  gameState: GameState;
}

// Hand-positioned coordinates for the 8 rooms (grid-based)
const ROOM_POSITIONS: Record<string, { x: number; y: number }> = {
  entrance:           { x: 60,  y: 30 },
  torch_corridor:     { x: 200, y: 30 },
  goblin_den:         { x: 60,  y: 130 },
  puzzle_chamber:     { x: 340, y: 30 },
  armory:             { x: 200, y: 130 },
  underground_river:  { x: 340, y: 130 },
  boss_lair:          { x: 340, y: 230 },
  treasure_vault:     { x: 480, y: 230 },
};

const TAG_COLORS: Record<string, string> = {
  safe: "#3a7",
  puzzle: "#77c",
  danger: "#c55",
  boss: "#a3a",
  goal: "#ca5",
};

export function DungeonMapView({ dungeonMap, gameState }: Props) {
  const rooms = Object.values(dungeonMap);

  // Build edges (deduplicated)
  const edges: [string, string][] = [];
  const seen = new Set<string>();
  for (const room of rooms) {
    for (const nId of room.neighbors) {
      const key = [room.id, nId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([room.id, nId]);
      }
    }
  }

  return (
    <div className="dungeon-map">
      <h3>Dungeon Map</h3>
      <svg viewBox="0 0 560 280" width="100%">
        {/* Edges */}
        {edges.map(([a, b]) => {
          const pa = ROOM_POSITIONS[a];
          const pb = ROOM_POSITIONS[b];
          if (!pa || !pb) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="#555"
              strokeWidth={2}
            />
          );
        })}

        {/* Room nodes */}
        {rooms.map((room) => {
          const pos = ROOM_POSITIONS[room.id];
          if (!pos) return null;
          const isCurrent = room.id === gameState.currentRoomId;
          const isVisited = gameState.visitedRooms.includes(room.id);
          const color = TAG_COLORS[room.tag] || "#888";

          return (
            <g key={room.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isCurrent ? 18 : 14}
                fill={isVisited ? color : "#333"}
                stroke={isCurrent ? "#fff" : isVisited ? color : "#555"}
                strokeWidth={isCurrent ? 3 : 1.5}
                opacity={isVisited ? 1 : 0.5}
              />
              {isCurrent && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={22}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.6}
                />
              )}
              <text
                x={pos.x}
                y={pos.y + 32}
                textAnchor="middle"
                fill={isVisited ? "#ddd" : "#666"}
                fontSize={10}
              >
                {isVisited ? room.name : "???"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
