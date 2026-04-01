import type { DungeonMap, GameState } from "../../../shared/types.js";
import { getTheme, type ThemeId } from "../../../shared/themes/index.js";

interface Props {
  dungeonMap: DungeonMap;
  gameState: GameState;
  themeId: ThemeId;
}

const CELL = 120;
const PAD = 36;

export const TAG_COLORS: Record<string, string> = {
  safe:   "#33aa77",
  puzzle: "#7777cc",
  danger: "#cc5555",
  boss:   "#aa33aa",
  goal:   "#ccaa55",
};

export function getThemeIcons(themeId: ThemeId): Record<string, string> {
  return getTheme(themeId).icons;
}

export function DungeonMapView({ dungeonMap, gameState, themeId }: Props) {
  const theme = getTheme(themeId);
  const gridPositions = theme.gridPositions;
  const icons = theme.icons;
  const { cols, rows } = theme.gridSize;

  const rooms = Object.values(dungeonMap);
  const svgW = cols * CELL + PAD * 2;
  const svgH = rows * CELL + PAD * 2;

  function center(roomId: string): { cx: number; cy: number } | null {
    const g = gridPositions[roomId];
    if (!g) return null;
    return { cx: PAD + g.col * CELL + CELL / 2, cy: PAD + g.row * CELL + CELL / 2 };
  }

  // Deduplicated edges
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
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="fog">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Corridors */}
        {edges.map(([a, b]) => {
          const pa = center(a);
          const pb = center(b);
          if (!pa || !pb) return null;
          const aVisited = gameState.visitedRooms.includes(a);
          const bVisited = gameState.visitedRooms.includes(b);
          const bothVisited = aVisited && bVisited;
          const eitherVisited = aVisited || bVisited;
          return (
            <line
              key={`${a}-${b}`}
              x1={pa.cx}
              y1={pa.cy}
              x2={pb.cx}
              y2={pb.cy}
              stroke={bothVisited ? "#445" : "#2a2a3a"}
              strokeWidth={bothVisited ? 4 : 2}
              strokeLinecap="round"
              opacity={eitherVisited ? 0.8 : 0.25}
            />
          );
        })}

        {/* Room tiles */}
        {rooms.map((room) => {
          const pos = gridPositions[room.id];
          if (!pos) return null;
          const c = center(room.id)!;
          const isCurrent = room.id === gameState.currentRoomId;
          const isVisited = gameState.visitedRooms.includes(room.id);
          const isAdjacent = !isVisited && rooms.some(
            (r) =>
              r.id === gameState.currentRoomId &&
              r.neighbors.includes(room.id)
          );
          const color = TAG_COLORS[room.tag] || "#888";
          const icon = icons[room.id] || "?";
          const tileSize = 36;

          if (!isVisited && !isAdjacent) {
            // Completely hidden
            return (
              <g key={room.id}>
                <rect
                  x={c.cx - tileSize}
                  y={c.cy - tileSize}
                  width={tileSize * 2}
                  height={tileSize * 2}
                  rx={6}
                  fill="#1a1a28"
                  stroke="#252535"
                  strokeWidth={1}
                  opacity={0.4}
                />
              </g>
            );
          }

          if (!isVisited && isAdjacent) {
            // Fog — adjacent but unvisited
            return (
              <g key={room.id}>
                <rect
                  x={c.cx - tileSize}
                  y={c.cy - tileSize}
                  width={tileSize * 2}
                  height={tileSize * 2}
                  rx={6}
                  fill="#222238"
                  stroke="#333350"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
                <text
                  x={c.cx}
                  y={c.cy + 5}
                  textAnchor="middle"
                  fill="#555"
                  fontSize={18}
                >
                  ?
                </text>
              </g>
            );
          }

          // Visited room
          return (
            <g key={room.id}>
              {/* Current room glow */}
              {isCurrent && (
                <rect
                  x={c.cx - tileSize - 4}
                  y={c.cy - tileSize - 4}
                  width={(tileSize + 4) * 2}
                  height={(tileSize + 4) * 2}
                  rx={9}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  filter="url(#glow)"
                  opacity={0.8}
                />
              )}

              {/* Tile background */}
              <rect
                x={c.cx - tileSize}
                y={c.cy - tileSize}
                width={tileSize * 2}
                height={tileSize * 2}
                rx={6}
                fill={isCurrent ? color : "#2a2a40"}
                fillOpacity={isCurrent ? 0.25 : 0.9}
                stroke={isCurrent ? color : "#3a3a55"}
                strokeWidth={isCurrent ? 2.5 : 1.5}
              />

              {/* Room icon */}
              <text
                x={c.cx}
                y={c.cy - 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
              >
                {icon}
              </text>

              {/* Room name */}
              <text
                x={c.cx}
                y={c.cy + tileSize + 18}
                textAnchor="middle"
                fill={isCurrent ? "#eee" : "#888"}
                fontSize={9}
                fontWeight={isCurrent ? "bold" : "normal"}
              >
                {room.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
