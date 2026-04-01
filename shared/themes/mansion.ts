import type { ThemeDefinition } from "./types.js";

export const mansion: ThemeDefinition = {
  id: "mansion",
  title: "Haunted Mansion",
  subtitle: "Survive the night guided by a ghostly Spirit Guide",
  emoji: "\u{1F47B}",
  dmTitle: "Spirit Guide",
  promptFlavor:
    "You are a ghostly Spirit Guide narrating a gothic horror adventure in a haunted Victorian mansion. The setting is a decrepit estate filled with restless spirits, cursed objects, and dark secrets. Use eerie, atmospheric language with occasional dark humor. Every room should feel unsettling.",
  startRoom: "library",
  goalRoom: "crypt",
  rooms: [
    {
      id: "library",
      name: "Library",
      tag: "safe",
      neighbors: ["grand_staircase"],
      description:
        "Towering bookshelves sag under dusty tomes. A fireplace crackles with cold blue flame. Pages turn by themselves.",
    },
    {
      id: "grand_staircase",
      name: "Grand Staircase",
      tag: "safe",
      neighbors: ["library", "attic", "seance_room", "wine_cellar"],
      description:
        "A sweeping marble staircase connects three floors. Portraits on the walls follow you with their eyes.",
    },
    {
      id: "attic",
      name: "Attic",
      tag: "danger",
      neighbors: ["grand_staircase", "master_bedroom"],
      description:
        "Cobweb-draped rafters and forgotten furniture. A rocking chair moves on its own. Something scratches inside the walls.",
    },
    {
      id: "master_bedroom",
      name: "Master Bedroom",
      tag: "boss",
      neighbors: ["attic", "seance_room"],
      description:
        "A four-poster bed with rotting curtains. The ghost of Lady Ashworth paces the room, her wailing shakes the walls.",
    },
    {
      id: "seance_room",
      name: "S\u00E9ance Room",
      tag: "puzzle",
      neighbors: ["grand_staircase", "master_bedroom"],
      description:
        "A round table with a crystal ball and scattered tarot cards. Candles flicker in a circle. The spirits want to communicate.",
    },
    {
      id: "wine_cellar",
      name: "Wine Cellar",
      tag: "safe",
      neighbors: ["grand_staircase", "kitchen"],
      description:
        "Rows of ancient bottles thick with dust. The temperature drops sharply. Some bottles contain things other than wine.",
    },
    {
      id: "kitchen",
      name: "Kitchen",
      tag: "danger",
      neighbors: ["wine_cellar", "crypt"],
      description:
        "Rusted pots hang from hooks. Knives rattle in their block. A poltergeist hurls plates at intruders.",
    },
    {
      id: "crypt",
      name: "Crypt",
      tag: "goal",
      neighbors: ["kitchen"],
      description:
        "A hidden chamber beneath the kitchen. Stone sarcophagi line the walls. The Ashworth family jewels glimmer in the darkness.",
    },
  ],
  icons: {
    library: "\u{1F4DA}",
    grand_staircase: "\u{1F3DA}",
    attic: "\u{1F577}",
    master_bedroom: "\u{1F47B}",
    seance_room: "\u{1F52E}",
    wine_cellar: "\u{1F377}",
    kitchen: "\u{1F52A}",
    crypt: "\u{26B0}\uFE0F",
  },
  gridPositions: {
    attic: { col: 1, row: 0 },
    master_bedroom: { col: 2, row: 0 },
    library: { col: 0, row: 1 },
    grand_staircase: { col: 1, row: 1 },
    seance_room: { col: 2, row: 1 },
    wine_cellar: { col: 0, row: 2 },
    kitchen: { col: 1, row: 2 },
    crypt: { col: 2, row: 2 },
  },
  gridSize: { cols: 3, rows: 3 },
};
