// ── Dungeon Layout ──

export interface Room {
  id: string;
  name: string;
  tag: "safe" | "puzzle" | "danger" | "boss" | "goal";
  neighbors: string[]; // room ids
  description: string; // short flavor text for AI context
}

export type DungeonMap = Record<string, Room>;

// ── Player & Game State ──

export interface Player {
  name: string;
  hp: number;
  maxHp: number;
}

export interface GameFlags {
  doorUnlocked: boolean;
  metBoss: boolean;
  solvedPuzzle: boolean;
  defeatedBoss: boolean;
  [key: string]: boolean;
}

export interface GameState {
  id: string;
  currentRoomId: string;
  player: Player;
  inventory: string[];
  flags: GameFlags;
  visitedRooms: string[];
  turnLog: TurnLogEntry[];
  status: "playing" | "won" | "lost";
}

export interface TurnLogEntry {
  roomId: string;
  narration: string;
  chosenAction?: string;
}

// ── AI DM Communication ──

export interface DMContext {
  roomId: string;
  roomTag: Room["tag"];
  roomName: string;
  roomDescription: string;
  playerName: string;
  playerHp: number;
  playerMaxHp: number;
  inventory: string[];
  flags: GameFlags;
  visitedRooms: string[];
  note: string; // e.g. "The player has just entered this room from X."
}

export interface DMAction {
  id: string;
  label: string;
}

export interface DMResponse {
  narration: string;
  actions: DMAction[];
  effects?: DMEffects;
}

export interface DMEffects {
  hpChange?: number;
  addItems?: string[];
  removeItems?: string[];
  setFlags?: Partial<GameFlags>;
  moveToRoom?: string; // if the action causes movement
}

// ── API DTOs ──

export interface StartGameRequest {
  playerName: string;
}

export interface StartGameResponse {
  gameState: GameState;
  narration: string;
  actions: DMAction[];
}

export interface ActionRequest {
  gameId: string;
  actionId: string;
}

export interface ActionResponse {
  gameState: GameState;
  narration: string;
  actions: DMAction[];
}
