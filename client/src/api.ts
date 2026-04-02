import type { DungeonMap } from "../../shared/types.js";

const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

export async function fetchDungeonMap(theme: string = "dungeon"): Promise<DungeonMap> {
  const res = await fetch(`${BASE}/dungeon?theme=${encodeURIComponent(theme)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
