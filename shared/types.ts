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

// ── Multi-player Types ──

export interface Objective {
  id: string;
  description: string; // shown to the player who holds it
}

export interface ScoreEntry {
  playerId: string;
  playerName: string;
  objective: Objective;
  objectiveComplete: boolean;
  reachedGoal: boolean;
  survived: boolean;
  hpRemaining: number;
  totalScore: number;
}

export interface PlayerState {
  id: string;
  socketId: string;
  name: string;
  hp: number;
  maxHp: number;
  currentRoomId: string;
  inventory: string[];
  visitedRooms: string[];
  objective: Objective | null; // null until game starts
  objectiveComplete: boolean;
  status: "alive" | "dead";
}

export interface LobbyPlayer {
  id: string;
  socketId: string;
  name: string;
  ready: boolean;
}

export interface Lobby {
  id: string;
  roomCode: string;
  hostPlayerId: string;
  players: LobbyPlayer[];
  theme: string;
  status: "waiting" | "in-progress" | "finished";
}

export interface TurnLogEntry {
  playerId: string;
  playerName: string;
  roomId: string;
  narration: string;
  chosenAction?: string;
}

export interface GameState {
  id: string;
  theme: string;
  lobbyId: string;
  players: PlayerState[];
  sharedFlags: GameFlags;
  currentTurnIndex: number;
  turnOrder: string[]; // player IDs
  turnDeadline: number; // Unix timestamp ms
  globalVisitedRooms: string[];
  turnLog: TurnLogEntry[];
  status: "playing" | "won" | "lost";
}

// ── AI DM Communication ──

export interface DMContext {
  themeId: string;
  roomId: string;
  roomTag: Room["tag"];
  roomName: string;
  roomDescription: string;
  // Active player
  playerName: string;
  playerHp: number;
  playerMaxHp: number;
  inventory: string[];
  // Multi-player context
  allPlayers: { name: string; hp: number; maxHp: number; currentRoomId: string; status: "alive" | "dead" }[];
  playersInSameRoom: string[]; // names of other players in this room
  // Shared state
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

// ── Socket Event Types ──

export interface ClientToServerEvents {
  "lobby:create": (data: { playerName: string; theme?: string }) => void;
  "lobby:join": (data: { roomCode: string; playerName: string }) => void;
  "lobby:ready": () => void;
  "lobby:start": () => void;
  "game:action": (data: { actionId: string }) => void;
}

export interface ServerToClientEvents {
  "lobby:created": (data: { lobby: Lobby; playerId: string }) => void;
  "lobby:updated": (data: { lobby: Lobby }) => void;
  "lobby:error": (data: { message: string }) => void;
  "game:started": (data: { gameState: GameState; narration: string; playerId: string }) => void;
  "game:turn": (data: { activePlayerId: string; deadline: number; actions: DMAction[] }) => void;
  "game:update": (data: { gameState: GameState; narration: string }) => void;
  "game:player:eliminated": (data: { playerId: string; playerName: string }) => void;
  "game:ended": (data: { gameState: GameState; scores: ScoreEntry[] }) => void;
}

// ── API DTOs (kept for internal reuse) ──

/** @deprecated Game flow moves to sockets */
export interface StartGameRequest {
  playerName: string;
  theme?: string;
}

/** @deprecated Game flow moves to sockets */
export interface StartGameResponse {
  gameState: GameState;
  narration: string;
  actions: DMAction[];
}

/** @deprecated Game flow moves to sockets */
export interface ActionRequest {
  gameId: string;
  actionId: string;
}

export interface ActionResponse {
  gameState: GameState;
  narration: string;
  actions: DMAction[];
}
