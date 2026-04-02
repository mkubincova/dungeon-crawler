import type { DungeonMap, GameState } from "../../../shared/types.js";
import { getTheme, type ThemeId } from "../../../shared/themes/index.js";

interface Props {
  dungeonMap: DungeonMap;
  gameState: GameState;
  themeId: ThemeId;
  myPlayerId: string | null;
}

const CELL = 120;
const PAD = 36;

export const TAG_COLORS: Record<string, string> = {
  safe:   "#3a9a60",
  puzzle: "#7b5ea7",
  danger: "#b83a3a",
  boss:   "#9a2d6e",
  goal:   "#d4a847",
};

const PLAYER_COLORS = ["#d4a847", "#4fc3f7", "#e040fb", "#69f0ae"];

export function getThemeIcons(themeId: ThemeId): Record<string, string> {
  return getTheme(themeId).icons;
}

export function DungeonMapView({ dungeonMap, gameState, themeId, myPlayerId }: Props) {
  const theme = getTheme(themeId);
  const gridPositions = theme.gridPositions;
  const icons = theme.icons;
  const { cols, rows } = theme.gridSize;

  const rooms = Object.values(dungeonMap);
  const svgW = cols * CELL + PAD * 2;
  const svgH = rows * CELL + PAD * 2;

  // Use globalVisitedRooms for fog-of-war
  const visitedRooms = gameState.globalVisitedRooms;

  // My player's current room for adjacency
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const myCurrentRoomId = myPlayer?.currentRoomId ?? gameState.players[0]?.currentRoomId ?? "";

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

  // Players in each room (alive only)
  const playersByRoom = new Map<string, typeof gameState.players>();
  for (const player of gameState.players) {
    if (player.status === "alive") {
      const existing = playersByRoom.get(player.currentRoomId) ?? [];
      existing.push(player);
      playersByRoom.set(player.currentRoomId, existing);
    }
  }

  return (
    <div className="dungeon-map">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="fog">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id="innerShadow">
            <feOffset dx="0" dy="1" />
            <feGaussianBlur stdDeviation="1" result="shadow" />
            <feComposite in="SourceGraphic" in2="shadow" operator="over" />
          </filter>
          <radialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212,168,71,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={svgW} height={svgH} fill="url(#ambientGlow)" />

        {/* Corridors */}
        {edges.map(([a, b]) => {
          const pa = center(a);
          const pb = center(b);
          if (!pa || !pb) return null;
          const aVisited = visitedRooms.includes(a);
          const bVisited = visitedRooms.includes(b);
          const bothVisited = aVisited && bVisited;
          const eitherVisited = aVisited || bVisited;
          return (
            <line
              key={`${a}-${b}`}
              x1={pa.cx}
              y1={pa.cy}
              x2={pb.cx}
              y2={pb.cy}
              stroke={bothVisited ? "#4a3d28" : "#1a1510"}
              strokeWidth={bothVisited ? 4 : 2}
              strokeLinecap="round"
              strokeDasharray={bothVisited ? "none" : "4 4"}
              opacity={eitherVisited ? 0.9 : 0.2}
            />
          );
        })}

        {/* Room tiles */}
        {rooms.map((room) => {
          const pos = gridPositions[room.id];
          if (!pos) return null;
          const c = center(room.id)!;
          const isMyRoom = room.id === myCurrentRoomId;
          const isVisited = visitedRooms.includes(room.id);
          const isAdjacent =
            !isVisited &&
            rooms.some(
              (r) => r.id === myCurrentRoomId && r.neighbors.includes(room.id)
            );
          const color = TAG_COLORS[room.tag] || "#888";
          const icon = icons[room.id] || "?";
          const tileSize = 36;
          const playersHere = playersByRoom.get(room.id) ?? [];

          if (!isVisited && !isAdjacent) {
            return (
              <g key={room.id} opacity={0.3}>
                <rect
                  x={c.cx - tileSize}
                  y={c.cy - tileSize}
                  width={tileSize * 2}
                  height={tileSize * 2}
                  rx={3}
                  fill="#0d0a07"
                  stroke="#1a1510"
                  strokeWidth={1}
                />
              </g>
            );
          }

          if (!isVisited && isAdjacent) {
            return (
              <g key={room.id}>
                <rect
                  x={c.cx - tileSize}
                  y={c.cy - tileSize}
                  width={tileSize * 2}
                  height={tileSize * 2}
                  rx={3}
                  fill="#1a1510"
                  stroke="#2a231a"
                  strokeWidth={1.5}
                  opacity={0.8}
                />
                <text
                  x={c.cx}
                  y={c.cy + 5}
                  textAnchor="middle"
                  fill="#5a4a35"
                  fontSize={16}
                  fontFamily="Cinzel, serif"
                >
                  ?
                </text>
              </g>
            );
          }

          return (
            <g key={room.id}>
              {isMyRoom && (
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
              <rect
                x={c.cx - tileSize}
                y={c.cy - tileSize}
                width={tileSize * 2}
                height={tileSize * 2}
                rx={3}
                fill={isMyRoom ? color : "#1e1914"}
                fillOpacity={isMyRoom ? 0.2 : 0.95}
                stroke={isMyRoom ? color : "#2a231a"}
                strokeWidth={isMyRoom ? 2.5 : 1.5}
              />
              <text
                x={c.cx}
                y={c.cy - 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
              >
                {icon}
              </text>
              <text
                x={c.cx}
                y={c.cy + tileSize + 18}
                textAnchor="middle"
                fill={isMyRoom ? "#e0d5c4" : "#6a6050"}
                fontSize={9}
                fontWeight={isMyRoom ? "bold" : "normal"}
                fontFamily="Cinzel, serif"
                letterSpacing="0.5"
              >
                {room.name}
              </text>

              {/* Player markers */}
              {playersHere.map((player, i) => {
                const playerIndex = gameState.players.findIndex((p) => p.id === player.id);
                const pColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
                const isMe = player.id === myPlayerId;
                const offsetX = (i - (playersHere.length - 1) / 2) * 14;
                return (
                  <g key={player.id} transform={`translate(${c.cx + offsetX}, ${c.cy - tileSize + 10})`}>
                    <circle
                      r={isMe ? 7 : 5}
                      fill={pColor}
                      stroke="#0d0a07"
                      strokeWidth={1.5}
                      opacity={0.95}
                    />
                    <text
                      x={0}
                      y={1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isMe ? 8 : 7}
                      fill="#0d0a07"
                      fontWeight="bold"
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
