import type { DungeonMap, Room } from "../../shared/types.js";

/**
 * Fixed dungeon layout: 8 rooms forming a small graph.
 *
 *   [Entrance] ──── [Torch Corridor] ──── [Puzzle Chamber]
 *       │                                    │         │
 *   [Goblin Den] ── [Armory]                 │    [Boss Lair] ── [Treasure Vault]
 *                      │                     │         │
 *                   [Underground River] ──────┘────────┘
 */

export const START_ROOM = "entrance";
export const GOAL_ROOM = "treasure_vault";

const rooms: Room[] = [
  {
    id: "entrance",
    name: "Entrance Hall",
    tag: "safe",
    neighbors: ["torch_corridor", "goblin_den"],
    description:
      "A dimly lit stone hall with crumbling pillars. Cobwebs hang from the ceiling.",
  },
  {
    id: "torch_corridor",
    name: "Torch Corridor",
    tag: "danger",
    neighbors: ["entrance", "puzzle_chamber"],
    description:
      "A long hallway lined with flickering torches. Pressure plates line the floor and dart holes dot the walls.",
  },
  {
    id: "goblin_den",
    name: "Goblin Den",
    tag: "danger",
    neighbors: ["entrance", "armory"],
    description:
      "A filthy cave littered with bones and crude weapons. Goblins lurk here.",
  },
  {
    id: "puzzle_chamber",
    name: "Puzzle Chamber",
    tag: "puzzle",
    neighbors: ["torch_corridor", "underground_river", "boss_lair"],
    description:
      "A circular room with strange runes on the walls and a locked mechanism in the center.",
  },
  {
    id: "armory",
    name: "Armory",
    tag: "safe",
    neighbors: ["goblin_den", "underground_river"],
    description:
      "Racks of rusted weapons and dented shields. A few items still look usable.",
  },
  {
    id: "underground_river",
    name: "Underground River",
    tag: "danger",
    neighbors: ["puzzle_chamber", "armory", "boss_lair"],
    description:
      "A roaring underground river cuts through the cavern. The current is treacherous.",
  },
  {
    id: "boss_lair",
    name: "Boss Lair",
    tag: "boss",
    neighbors: ["puzzle_chamber", "underground_river", "treasure_vault"],
    description:
      "A vast chamber with scorched walls. A massive shadow dragon awaits.",
  },
  {
    id: "treasure_vault",
    name: "Treasure Vault",
    tag: "goal",
    neighbors: ["boss_lair"],
    description:
      "A golden chamber filled with ancient treasures and the legendary Crown of Ages.",
  },
];

export const DUNGEON: DungeonMap = Object.fromEntries(
  rooms.map((r) => [r.id, r])
);

export function getRoom(id: string): Room {
  const room = DUNGEON[id];
  if (!room) throw new Error(`Unknown room: ${id}`);
  return room;
}

export function areNeighbors(from: string, to: string): boolean {
  return getRoom(from).neighbors.includes(to);
}
