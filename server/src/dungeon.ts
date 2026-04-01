import type { DungeonMap, Room } from "../../shared/types.js";
import { getTheme } from "../../shared/themes/index.js";

// Build dungeon map from theme rooms
export function getDungeon(themeId: string): DungeonMap {
  const theme = getTheme(themeId);
  return Object.fromEntries(theme.rooms.map((r) => [r.id, r]));
}

export function getRoom(themeId: string, roomId: string): Room {
  const dungeon = getDungeon(themeId);
  const room = dungeon[roomId];
  if (!room) throw new Error(`Unknown room: ${roomId} in theme: ${themeId}`);
  return room;
}

export function areNeighbors(
  themeId: string,
  from: string,
  to: string
): boolean {
  return getRoom(themeId, from).neighbors.includes(to);
}
