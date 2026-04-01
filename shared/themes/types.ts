import type { Room } from "../types.js";

export type ThemeId = "dungeon" | "office" | "mansion";

export interface ThemeDefinition {
  id: ThemeId;
  title: string;
  subtitle: string;
  emoji: string;
  dmTitle: string;
  promptFlavor: string;
  startRoom: string;
  goalRoom: string;
  rooms: Room[];
  icons: Record<string, string>;
  gridPositions: Record<string, { col: number; row: number }>;
  gridSize: { cols: number; rows: number };
}
