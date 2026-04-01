import type {
  StartGameResponse,
  ActionResponse,
  DungeonMap,
} from "../../shared/types.js";

const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

export async function startGame(
  playerName: string
): Promise<StartGameResponse> {
  const res = await fetch(`${BASE}/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitAction(
  gameId: string,
  actionId: string
): Promise<ActionResponse> {
  const res = await fetch(`${BASE}/game/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, actionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchDungeonMap(): Promise<DungeonMap> {
  const res = await fetch(`${BASE}/dungeon`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
