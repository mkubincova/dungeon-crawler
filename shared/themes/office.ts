import type { ThemeDefinition } from "./types.js";

export const office: ThemeDefinition = {
  id: "office",
  title: "Corporate Survival",
  subtitle: "Navigate office politics guided by an AI Office Manager",
  emoji: "\u{1F3E2}",
  dmTitle: "Office Manager",
  promptFlavor:
    "You are the Office Manager narrating a darkly comic corporate survival adventure. The setting is a soul-crushing office building where mundane hazards (passive-aggressive emails, microwave explosions, printer jams) are treated with the same gravity as dungeon traps. Use dry corporate humor and office jargon dramatically.",
  startRoom: "lobby",
  goalRoom: "corner_office",
  rooms: [
    {
      id: "lobby",
      name: "Lobby",
      tag: "safe",
      neighbors: ["hallway", "mail_room"],
      description:
        "A sterile reception area with wilting plants and motivational posters. The receptionist ignores you.",
    },
    {
      id: "hallway",
      name: "Hallway",
      tag: "danger",
      neighbors: ["lobby", "open_floor", "break_room"],
      description:
        "A fluorescent-lit corridor. Passive-aggressive sticky notes cover the walls. Someone microwaved fish.",
    },
    {
      id: "mail_room",
      name: "Mail Room",
      tag: "safe",
      neighbors: ["lobby", "break_room"],
      description:
        "Stacks of undelivered packages and a broken stamp machine. At least it's quiet down here.",
    },
    {
      id: "open_floor",
      name: "Open Floor",
      tag: "danger",
      neighbors: ["hallway", "server_room", "corner_office"],
      description:
        "Rows of identical cubicles stretch into the distance. The printer is jammed again and tempers are rising.",
    },
    {
      id: "break_room",
      name: "Break Room",
      tag: "danger",
      neighbors: ["hallway", "mail_room", "server_room"],
      description:
        "A grimy kitchen with a passive-aggressive sign about dishes. The microwave looks like a biohazard.",
    },
    {
      id: "server_room",
      name: "Server Room",
      tag: "puzzle",
      neighbors: ["open_floor", "break_room", "ceo_office"],
      description:
        "Blinking lights and tangled cables everywhere. The AC is arctic. A critical system needs rebooting.",
    },
    {
      id: "ceo_office",
      name: "CEO's Office",
      tag: "boss",
      neighbors: ["server_room", "corner_office"],
      description:
        "A massive mahogany desk, a putting green, and a wall of fake awards. The CEO stares at you over reading glasses.",
    },
    {
      id: "corner_office",
      name: "Corner Office",
      tag: "goal",
      neighbors: ["open_floor", "ceo_office"],
      description:
        "Floor-to-ceiling windows with a city view. A nameplate on the desk reads YOUR NAME. The promotion letter sits on the desk.",
    },
  ],
  icons: {
    lobby: "\u{1F3E2}",
    hallway: "\u{1F4A1}",
    mail_room: "\u{1F4E6}",
    open_floor: "\u{1F5A8}",
    break_room: "\u{2615}",
    server_room: "\u{1F5A5}",
    ceo_office: "\u{1F454}",
    corner_office: "\u{1F3C6}",
  },
  gridPositions: {
    lobby: { col: 0, row: 0 },
    hallway: { col: 1, row: 0 },
    open_floor: { col: 2, row: 0 },
    corner_office: { col: 3, row: 0 },
    mail_room: { col: 0, row: 1 },
    break_room: { col: 1, row: 1 },
    server_room: { col: 2, row: 1 },
    ceo_office: { col: 3, row: 1 },
  },
  gridSize: { cols: 4, rows: 2 },
};
