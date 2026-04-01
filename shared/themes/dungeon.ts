import type { ThemeDefinition } from "./types.js";

export const dungeon: ThemeDefinition = {
  id: "dungeon",
  title: "Dungeon Crawler",
  subtitle: "A solo adventure guided by an AI Dungeon Master",
  emoji: "\u{1F5E1}\uFE0F",
  dmTitle: "Dungeon Master",
  promptFlavor:
    "You are the Dungeon Master for a classic fantasy dungeon crawl. The setting is a dark, ancient underground dungeon filled with traps, monsters, and treasure. Use dramatic fantasy language.",
  startRoom: "entrance",
  goalRoom: "treasure_vault",
  rooms: [
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
  ],
  icons: {
    entrance: "\u{1F6AA}",
    torch_corridor: "\u{1F525}",
    goblin_den: "\u{1F47A}",
    puzzle_chamber: "\u{1F9E9}",
    armory: "\u{1F6E1}",
    underground_river: "\u{1F30A}",
    boss_lair: "\u{1F432}",
    treasure_vault: "\u{1F451}",
  },
  gridPositions: {
    entrance: { col: 0, row: 0 },
    torch_corridor: { col: 1, row: 0 },
    puzzle_chamber: { col: 2, row: 0 },
    goblin_den: { col: 0, row: 1 },
    armory: { col: 1, row: 1 },
    underground_river: { col: 2, row: 1 },
    boss_lair: { col: 3, row: 1 },
    treasure_vault: { col: 3, row: 2 },
  },
  gridSize: { cols: 4, rows: 3 },
};
