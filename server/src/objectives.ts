import type { Objective } from "../../shared/types.js";

const OBJECTIVES: Objective[] = [
  { id: "first_to_boss", description: "Be the first player to enter the boss room" },
  { id: "collector", description: "End the game with 2 or more items in your inventory" },
  { id: "explorer", description: "Visit every room in the dungeon" },
  { id: "untouched", description: "Finish the game with full HP" },
  { id: "speedrunner", description: "Reach the goal room within 10 turns" },
  { id: "pacifist", description: "Never choose a 'fight' action" },
];

export function assignObjectives(playerCount: number): Objective[] {
  const pool =
    playerCount === 1
      ? OBJECTIVES.filter((o) => o.id !== "first_to_boss")
      : [...OBJECTIVES];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, playerCount);
}
