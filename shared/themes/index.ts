import type { ThemeId, ThemeDefinition } from "./types.js";
import { dungeon } from "./dungeon.js";
import { office } from "./office.js";
import { mansion } from "./mansion.js";

export type { ThemeId, ThemeDefinition };

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  dungeon,
  office,
  mansion,
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export function getTheme(id: string): ThemeDefinition {
  const theme = THEMES[id as ThemeId];
  if (!theme) throw new Error(`Unknown theme: ${id}`);
  return theme;
}
