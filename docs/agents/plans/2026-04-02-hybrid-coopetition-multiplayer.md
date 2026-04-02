---
date: "2026-04-02T08:37:59.999483+00:00"
git_commit: 124bcee67c81938b0511c6a93a7d941d8baf1e21
branch: main
topic: "Hybrid Co-opetition Multiplayer (2-4 Players)"
tags: [plan, multiplayer, socket-io, game-engine, ui]
status: draft
---

# Hybrid Co-opetition Multiplayer Implementation Plan

## Overview

Add multiplayer support (2-4 players) using the Hybrid Co-opetition model: players share a dungeon with shared flags/consequences but have individual HP, inventory, position, and hidden personal objectives. Real-time communication via Socket.io, round-robin turns with 45s timeouts, and end-game scoring with objective reveals.

## Current State Analysis

- **Single player only**: `GameState.player` is a single `Player`, `DMContext` sends one player's info
- **REST-only**: No WebSocket, no real-time push. Express server in `index.ts` uses `app.listen()`
- **In-memory state**: `Map<gameId, GameState>` in `game.ts` — no persistence, no lobby
- **DM is single-player aware**: Both `MockDungeonMaster` and `LLMDungeonMaster` produce narration for one player
- **3 themes**: dungeon, office, mansion — each with 8-room graph, shared room/flag structure

## Desired End State

- 2-4 players join a lobby via room code, ready up, host starts the game
- Players share a dungeon: shared flags (`doorUnlocked`, `solvedPuzzle`, `defeatedBoss`) and room discovery
- Each player has individual: HP, inventory, position (can be in different rooms), hidden objective
- Round-robin turns (45s timeout, skip on expiry), real-time updates via Socket.io
- Actions in a room with shared consequences (traps, combat) affect all players in that room
- DM narrates per-active-player but is aware of all players' states
- Game ends when any player claims the prize or all are eliminated; scoring + objective reveal

## What We're NOT Doing

- **No authentication/accounts** — players are identified by socket connection + name only
- **No persistence/database** — lobby and game state remain in-memory
- **No spectator mode** — all connected players are active participants
- **No chat system** — players communicate outside the game
- **No dynamic objective generation** — predefined objective pool per theme
- **No PvP combat** — players cannot directly attack each other; competition is indirect via objectives
- **No simultaneous submit mode** — round-robin only for this iteration
- **No reconnection** — if a player disconnects mid-game, they are eliminated (future enhancement)

## Architecture and Code Reuse

### Communication: Socket.io over existing Express

Socket.io attaches to the existing `http.Server` created from the Express app. REST endpoints (`GET /api/dungeon`, `GET /api/game/:id`) remain for stateless queries. All game mutations move to Socket.io events.

```
Client                          Server
  |                               |
  |-- socket.connect() ---------->|
  |-- "lobby:create" ------------>|  creates Lobby, returns roomCode
  |-- "lobby:join" {code} ------->|  adds player to Lobby
  |-- "lobby:ready" ------------->|  marks player ready
  |-- "lobby:start" ------------->|  host starts game (all must be ready)
  |                               |
  |<- "game:started" {state} -----|  broadcasts initial state + objectives
  |<- "game:turn" {playerId,acts}-|  announces whose turn + actions (to active player)
  |-- "game:action" {actionId} -->|  active player submits action
  |<- "game:update" {state,narr} -|  broadcasts updated state + narration to all
  |<- "game:turn" {playerId,acts}-|  next player's turn + their actions
  |                               |  (45s timeout → auto-skip)
  |<- "game:ended" {scores} ------|  game over, objective reveal
```

### State Model

```
Lobby {
  id, roomCode, hostPlayerId,
  players: LobbyPlayer[],    // {id, socketId, name, ready}
  status: waiting | in-progress | finished
}

GameState (expanded) {
  id, theme, lobbyId,
  players: PlayerState[],     // individual HP, inventory, position, objective
  sharedFlags: GameFlags,     // doorUnlocked, solvedPuzzle, defeatedBoss, etc.
  currentTurnIndex: number,
  turnOrder: string[],        // player IDs
  turnDeadline: number,       // timestamp
  globalVisitedRooms: string[],
  turnLog: TurnLogEntry[],
  status: playing | won | lost
}

PlayerState {
  id, socketId, name,
  hp, maxHp,
  currentRoomId,
  inventory: string[],
  visitedRooms: string[],
  objective: Objective,
  objectiveComplete: boolean,
  status: alive | dead
}
```

### Affected Files Overview

- `shared/`
  - `types.ts` — Add `PlayerState`, `Lobby`, `Objective`, `ScoreEntry`, expand `GameState`, new socket event types
- `server/`
  - `package.json` — Add `socket.io` dependency
  - `src/index.ts` — Attach Socket.io to HTTP server
  - `src/lobby.ts` — **New**: Lobby management (create, join, ready, start)
  - `src/game.ts` — Refactor for multi-player: `players[]`, shared flags, turn management
  - `src/objectives.ts` — **New**: Objective pool + assignment + evaluation
  - `src/scoring.ts` — **New**: Score calculation
  - `src/socket-handlers.ts` — **New**: Socket.io event handlers (lobby + game)
  - `src/routes.ts` — Keep REST for stateless queries; remove game mutation routes (moved to sockets)
  - `src/ai.ts` — Update `MockDungeonMaster` for multi-player context
  - `src/llm-dm.ts` — Update prompts for multi-player awareness
- `client/`
  - `package.json` — Add `socket.io-client` dependency
  - `src/socket.ts` — **New**: Socket.io client singleton
  - `src/App.tsx` — Add lobby/game phase routing, socket state
  - `src/components/LobbyPage.tsx` — **New**: Create/join lobby, ready-up, player list
  - `src/components/GameView.tsx` — Add turn indicator, multi-player HUD, other players on map
  - `src/components/PlayerHUD.tsx` — Show all players' status (HP, room, items)
  - `src/components/DungeonMap.tsx` — Show multiple player positions
  - `src/components/NarrationLog.tsx` — Add player name/color attribution to narration entries
  - `src/components/ScoreBoard.tsx` — **New**: End-game scoring + objective reveal

### Reuse

- `applyEffects()` in `game.ts` — refactor to take `(state: GameState, playerId: string, effects: DMEffects)` and look up the player internally
- `sanitizeActions()` in `routes.ts` — reuse as-is (takes inventory array)
- `buildContext()` in `routes.ts` → extract to shared utility, expand for multi-player
- `DungeonMaster` interface — keep unchanged; the _caller_ builds richer context
- All theme definitions — unchanged; objectives are a new layer on top
- `DungeonMap.tsx` grid rendering — extend, not replace

## Performance Considerations

- **State broadcast**: Full state broadcast on each action is fine for 2-4 players with small state objects (<10KB). No delta sync needed.
- **Turn timeout**: Single `setTimeout` per turn, cleared and reset on action. No polling.
- **Socket.io rooms**: One room per lobby. Broadcasts scoped to room, not global.
- **LLM calls**: One call per player turn (same as single-player). No parallel LLM calls needed.

## Migration Notes

- **Single-player preserved**: The existing single-player REST flow is removed in favor of Socket.io, but a player can create a 1-player lobby and play solo. The game logic works with `players.length === 1`.
- **No database migration**: All state is in-memory, so there's nothing to migrate.
- **Existing tests**: `game.test.ts` and `routes.test.ts` will need updates to match new multi-player signatures.

---

## Phase 1: Shared Types & Data Model

Expand the type system to support multi-player, lobbies, objectives, and scoring. This is pure types — no runtime logic yet.

**Tasks**:
- [x] Add `socket.io` to `server/package.json` dependencies and `socket.io-client` to `client/package.json` dependencies
  ```bash
  cd server && npm install socket.io
  cd ../client && npm install socket.io-client
  ```
- [x] In `shared/types.ts`, add `PlayerState` interface
  ```ts
  export interface PlayerState {
    id: string;
    socketId: string;
    name: string;
    hp: number;
    maxHp: number;
    currentRoomId: string;
    inventory: string[];
    visitedRooms: string[];
    objective: Objective | null;  // null until game starts
    objectiveComplete: boolean;
    status: "alive" | "dead";
  }
  ```
- [x] In `shared/types.ts`, add `Objective` and `ScoreEntry` interfaces
  ```ts
  export interface Objective {
    id: string;
    description: string;  // shown to the player who holds it
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
  ```
- [x] In `shared/types.ts`, add `LobbyPlayer` and `Lobby` interfaces
  ```ts
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
  ```
- [x] In `shared/types.ts`, refactor `GameState` for multi-player
  ```ts
  export interface GameState {
    id: string;
    theme: string;
    lobbyId: string;
    players: PlayerState[];
    sharedFlags: GameFlags;
    currentTurnIndex: number;
    turnOrder: string[];        // player IDs
    turnDeadline: number;       // Unix timestamp ms
    globalVisitedRooms: string[];
    turnLog: TurnLogEntry[];
    status: "playing" | "won" | "lost";
  }
  ```
  Remove the old `player`, `inventory`, `flags`, `currentRoomId`, `visitedRooms` fields.
- [x] In `shared/types.ts`, expand `DMContext` for multi-player awareness
  ```ts
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
    playersInSameRoom: string[];  // names of other players in this room
    // Shared state
    flags: GameFlags;
    visitedRooms: string[];
    note: string;
  }
  ```
- [x] In `shared/types.ts`, add socket event type maps for type-safe Socket.io
  ```ts
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
  ```
- [x] In `shared/types.ts`, update `StartGameRequest` / `StartGameResponse` / `ActionRequest` / `ActionResponse` — mark as deprecated or remove since game flow moves to sockets. Keep `ActionResponse` shape for internal reuse.
- [x] In `shared/types.ts`, update `TurnLogEntry` to include `playerId` and `playerName`
  ```ts
  export interface TurnLogEntry {
    playerId: string;
    playerName: string;
    roomId: string;
    narration: string;
    chosenAction?: string;
  }
  ```

**Automated Verification**:
- [x] `npm run build:server` compiles without errors (type-checking all new interfaces)
- [x] `npm run build:client` compiles without errors
- [x] `npm run lint` passes

---

## Phase 2: Lobby System (Server + Client)

Socket.io setup, lobby creation/joining, ready-up flow, and lobby UI.

Dependencies: **Phase 1**

**Tasks**:
- [x] In `server/src/index.ts`, create HTTP server and attach Socket.io
  ```ts
  import { createServer } from "http";
  import { Server } from "socket.io";

  const server = createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  // Pass io to socket handler registration
  registerSocketHandlers(io);
  server.listen(PORT, ...);  // replace app.listen
  ```
- [x] Create `server/src/lobby.ts` — lobby state management
  - `const lobbies = new Map<string, Lobby>()`
  - `generateRoomCode(): string` — 4-char alphanumeric, collision-checked
  - `createLobby(hostSocketId, hostName, theme): Lobby`
  - `joinLobby(roomCode, socketId, playerName): Lobby` — validates room exists, not full (max 4), not in-progress
  - `setReady(lobbyId, playerId, ready): Lobby`
  - `canStart(lobby): boolean` — all players ready, >= 1 player
  - `getLobbyBySocketId(socketId): Lobby | undefined`
  - `removePlayer(socketId): Lobby | null` — handles disconnect, promotes new host if host leaves
- [x] Create `server/src/socket-handlers.ts` — register Socket.io event handlers
  - `registerSocketHandlers(io: Server)` — sets up `connection` handler
  - Handle `lobby:create`: create lobby, join socket to room, emit `lobby:created`
  - Handle `lobby:join`: join lobby, join socket to room, broadcast `lobby:updated`
  - Handle `lobby:ready`: toggle ready, broadcast `lobby:updated`
  - Handle `lobby:start`: validate `canStart()`, transition lobby to in-progress, create game (Phase 3 will implement), emit `game:started`
  - Handle `disconnect`: remove player from lobby, broadcast `lobby:updated` or clean up empty lobby
- [x] Create `client/src/socket.ts` — Socket.io client singleton
  ```ts
  import { io, Socket } from "socket.io-client";
  import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/types.js";

  const API_URL = import.meta.env.VITE_API_URL || "";
  export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(API_URL, {
    autoConnect: false,
  });
  ```
- [x] Create `client/src/components/LobbyPage.tsx`
  - Two modes: **Create** (enter name, pick theme, get room code) and **Join** (enter name + room code)
  - Show player list with ready indicators
  - Ready/unready toggle button
  - Host sees "Start Game" button (enabled when all ready)
  - Room code displayed prominently for sharing
  ```
  ┌──────────────────────────────────────┐
  │         ⚔ DUNGEON CRAWLER ⚔         │
  │                                      │
  │  [Create Lobby]    [Join Lobby]      │
  │                                      │
  │  ── OR after creating/joining: ──    │
  │                                      │
  │  Room Code:  ABCD                    │
  │  Theme: Classic Dungeon              │
  │                                      │
  │  Players:                            │
  │  ● Player1 (Host)      ✓ Ready      │
  │  ● Player2             ✗ Not Ready   │
  │  ● Player3             ✓ Ready       │
  │                                      │
  │  [Ready Up]     [Start Game] (host)  │
  └──────────────────────────────────────┘
  ```
- [x] Update `client/src/App.tsx` — add lobby phase
  - State machine: `landing → lobby → game → scoreboard`
  - Connect socket on lobby create/join, disconnect on back/restart
  - Listen for `lobby:created`, `lobby:updated`, `game:started` events
  - Pass game state to `GameView` on `game:started`

**Automated Verification**:
- [x] `lobby.test.ts` (Unit): create lobby → returns valid roomCode and lobby structure
- [x] `lobby.test.ts` (Unit): join lobby → adds player, rejects when full (>4), rejects invalid code
- [x] `lobby.test.ts` (Unit): setReady → toggles ready state correctly
- [x] `lobby.test.ts` (Unit): canStart → true only when all ready
- [x] `lobby.test.ts` (Unit): removePlayer → removes player, promotes host if host leaves
- [x] `npm run build:server` passes
- [x] `npm run build:client` passes
- [x] `npm run lint` passes
- [x] `npm test` passes

**Manual Verification**:
- [ ] Open two browser tabs, create lobby in tab 1, join with code in tab 2
  1. `npm run dev`
  2. Tab 1: enter name, click Create Lobby → room code appears
  3. Tab 2: enter name + room code, click Join → both tabs show both players
  4. Both tabs: click Ready → ready indicators update in real-time
  5. Tab 1 (host): click Start Game → (will show error or blank since Phase 3 isn't done yet, but lobby flow completes)

---

## Phase 3: Multi-Player Game Engine

Convert game creation, turn management, action processing, and shared consequences to multi-player.

Dependencies: **Phase 2**

**Tasks**:
- [x] In `server/src/objectives.ts`, create objective pool and assignment
  ```ts
  const OBJECTIVES: Objective[] = [
    { id: "first_to_boss", description: "Be the first player to enter the boss room" },
    { id: "collector", description: "End the game with 2 or more items in your inventory" },
    { id: "explorer", description: "Visit every room in the dungeon" },
    { id: "untouched", description: "Finish the game with full HP" },
    { id: "speedrunner", description: "Reach the goal room within 10 turns" },
    { id: "pacifist", description: "Never choose a 'fight' action" },
  ];

  export function assignObjectives(playerCount: number): Objective[]
  // Randomly select `playerCount` unique objectives from the pool
  // Filter out competitive objectives (e.g., "first_to_boss") when playerCount === 1
  ```
- [x] In `server/src/scoring.ts`, create score calculation
  ```ts
  export function calculateScores(state: GameState): ScoreEntry[]
  // +3 objective complete, +2 reached goal room, +1 survived, +1 most HP remaining
  ```
- [x] Refactor `server/src/game.ts` — multi-player game creation
  - `createGame(lobby: Lobby, objectives: Objective[]): GameState` — creates `PlayerState[]` from lobby players, assigns objectives, sets turn order, shared flags
  - `getActivePlayer(state: GameState): PlayerState` — returns player at `currentTurnIndex`
  - `advanceTurn(state: GameState): string` — increments turn index (skipping dead players), returns next active player ID
  - `applyEffects(state: GameState, playerId: string, effects: DMEffects): void` — apply effects to specific player; if room has shared consequences (trap damage), apply to all players in same room
  - `applySharedConsequences(state: GameState, roomId: string, effects: DMEffects): string[]` — apply HP damage from traps/danger to all players in the room, return affected player IDs
  - `movePlayer(state: GameState, playerId: string, targetRoomId: string): boolean`
  - `checkEndConditions(state: GameState): void` — game lost if all dead; game can be won when any alive player is in goal room with `defeatedBoss`
  - `checkObjectives(state: GameState): void` — evaluate each player's objective after each turn
- [x] Update `server/src/socket-handlers.ts` — game action flow
  - On `lobby:start`: call `createGame()`, assign objectives, broadcast `game:started` (each player gets their own `playerId` + objective in a targeted emit), emit `game:turn`
  - On `game:action`: validate it's the active player's turn, process action (movement / healing potion / DM action), apply effects + shared consequences, broadcast `game:update`, call `advanceTurn()`, emit `game:turn` or `game:ended`
  - Turn timeout: `setTimeout(45000)` on each `game:turn`. On expiry, skip turn, broadcast skip narration, advance turn.
  - Handle disconnect mid-game: mark player as dead, skip their turns, broadcast update
- [x] Extract `buildContext()` from `server/src/routes.ts` into a shared utility or keep in socket-handlers — expand for multi-player
  ```ts
  function buildContext(state: GameState, playerId: string, note: string): DMContext {
    const player = state.players.find(p => p.id === playerId)!;
    const playersInRoom = state.players.filter(p => p.currentRoomId === player.currentRoomId && p.id !== playerId && p.status === "alive");
    return {
      ...roomFields,
      playerName: player.name,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      inventory: [...player.inventory],
      allPlayers: state.players.map(p => ({ name: p.name, hp: p.hp, maxHp: p.maxHp, currentRoomId: p.currentRoomId, status: p.status })),
      playersInSameRoom: playersInRoom.map(p => p.name),
      flags: { ...state.sharedFlags },
      visitedRooms: [...state.globalVisitedRooms],
      note,
    };
  }
  ```
- [x] Update `server/src/routes.ts` — remove `POST /game/start` and `POST /game/action` (moved to sockets). Keep `GET /api/game/:id` and `GET /api/dungeon` as REST. Keep `sanitizeActions()` export for reuse in socket handlers.

**Automated Verification**:
- [x] `game.test.ts` (Unit): `createGame()` with 2-4 lobby players creates correct `PlayerState[]`, assigns objectives, initializes shared flags
- [x] `game.test.ts` (Unit): `advanceTurn()` skips dead players, wraps around
- [x] `game.test.ts` (Unit): `applyEffects()` applies damage to specific player only
- [x] `game.test.ts` (Unit): `applySharedConsequences()` damages all players in the same room
- [x] `game.test.ts` (Unit): `checkEndConditions()` — game lost when all dead, won when alive player in goal with boss defeated
- [x] `objectives.test.ts` (Unit): `assignObjectives()` returns correct count, no duplicates
- [x] `scoring.test.ts` (Unit): `calculateScores()` correctly computes points for each criterion
- [x] `npm run build:server` passes
- [x] `npm run lint` passes
- [x] `npm test` passes

**Manual Verification**:
- [ ] Two-player game flows through complete turn cycle
  1. `npm run dev`
  2. Tab 1: Create lobby, Tab 2: Join lobby
  3. Both ready, start game
  4. Tab 1: sees "Your turn" indicator, submits action → narration appears in both tabs
  5. Tab 2: sees "Your turn" indicator, submits action → narration appears in both tabs
  6. Verify shared consequences: both players enter danger room, one triggers combat → both take damage

---

## Phase 4: DM Multi-Player Awareness

Update both Mock and LLM Dungeon Masters to handle multi-player context.

Dependencies: **Phase 3**

**Tasks**:
- [x] Update `server/src/ai.ts` — `MockDungeonMaster` multi-player support
  - `enterRoom()`: narration mentions other players in the room (e.g., "You see PlayerB examining the walls.")
  - `handleAction()`: `face_danger` and `fight_boss` apply shared consequences text (e.g., "The explosion catches everyone in the room!")
  - Keep existing logic for tag-based responses; add conditional text when `ctx.playersInSameRoom.length > 0`
  - Note: win condition is enforced by `checkEndConditions()` in `game.ts` (requires `defeatedBoss` + goal room), so `claim_prize` in MockDM doesn't need gating — the game engine handles it
- [x] Update `server/src/llm-dm.ts` — `buildSystemPrompt()` additions
  - Add multiplayer section to system prompt:
    ```
    === MULTIPLAYER ===
    Multiple players explore the dungeon simultaneously. You are narrating for the ACTIVE player only.
    - Reference other players in the same room by name if present
    - Shared consequences: traps and combat in a room affect all present players. Describe this.
    - Do NOT narrate actions for other players — only describe their presence
    ```
- [x] Update `server/src/llm-dm.ts` — `buildUserMessage()` additions
  - Add `Other players in this room: [names]` line
  - Add `All players: [name (HP, room) for each]` summary line
  - Keep per-message inventory reminder for active player only

**Automated Verification**:
- [x] `ai.test.ts` (Unit): `MockDungeonMaster.enterRoom()` with `playersInSameRoom` includes other player names in narration
- [x] `ai.test.ts` (Unit): `MockDungeonMaster.handleAction()` for `face_danger` references shared damage when others present
- [x] `npm run build:server` passes
- [x] `npm run lint` passes
- [x] `npm test` passes

---

## Phase 5: Client Multi-Player UI

Update the client to show lobby flow, all players' status, turn indicators, multiple positions on the map, and end-game scoreboard.

Dependencies: **Phase 3**, **Phase 4**

**Tasks**:
- [x] Update `client/src/components/DungeonMap.tsx` — show multiple player positions
  - Each player gets a colored marker (fixed color per player index: gold, cyan, magenta, lime)
  - Show player initial or icon on each room where a player is present
  - Multiple players in the same room: stack markers with slight offset
  - Current player's marker is highlighted/larger
- [x] Update `client/src/components/PlayerHUD.tsx` — show all players
  - Display a card/row for each player: name, HP bar, current room, inventory count
  - Highlight the active player's turn
  - Dim dead players (greyed out with "Eliminated" label)
  - Show own hidden objective (only to the owning player) in a subtle tooltip/section
  ```
  ┌─ Players ──────────────────────────────┐
  │ ⚔ Player1 (You)  ████████ 8/8  📦 2  │
  │   Objective: Visit every room          │
  │ 🗡 Player2        ██████░░ 6/8  📦 1  │  ← active turn
  │ 💀 Player3        ░░░░░░░░ 0/8  DEAD  │
  └────────────────────────────────────────┘
  ```
- [x] Update `client/src/components/GameView.tsx` — multi-player game flow
  - Receive game updates via socket events (`game:update`, `game:turn`)
  - Show "Waiting for [PlayerName]..." when it's another player's turn (disable action buttons)
  - Show "Your turn! (Xs remaining)" when it's your turn with countdown timer
  - Display action buttons only for the active player
  - Show shared consequence notifications (e.g., "You took 2 damage from the trap triggered by Player1!")
- [x] Update `client/src/components/NarrationLog.tsx` — attribute narrations to players
  - Prefix each narration entry with player name and color-coded indicator
  - Show system messages for shared events (player eliminated, objective completed)
- [x] Create `client/src/components/ScoreBoard.tsx` — end-game results
  - Triggered by `game:ended` event
  - Show each player's score breakdown: objective (+3), reached goal (+2), survived (+1), most HP (+1)
  - Reveal all hidden objectives
  - Highlight the winner
  - "Play Again" button returns to lobby
  ```
  ┌─────────── GAME OVER ──────────────────┐
  │                                        │
  │  🏆 Player2 wins! (6 pts)             │
  │                                        │
  │  Player    Obj  Goal  Alive  HP  Total │
  │  Player2   ✓+3  ✓+2   ✓+1   +1    7  │
  │  Player1   ✗ 0  ✓+2   ✓+1    0    3  │
  │  Player3   ✓+3  ✗ 0   ✗ 0    0    3  │
  │                                        │
  │  Hidden Objectives Revealed:           │
  │  Player1: "Visit every room" ✗        │
  │  Player2: "Full HP at end" ✓          │
  │  Player3: "2+ items in inventory" ✓   │
  │                                        │
  │            [Play Again]                │
  └────────────────────────────────────────┘
  ```
- [x] Update `client/src/App.tsx` — integrate scoreboard phase
  - On `game:ended` event, transition to scoreboard view
  - "Play Again" creates a new lobby with same players

**Automated Verification**:
- [x] `npm run build:client` passes
- [x] `npm run lint` passes

**Manual Verification**:
- [ ] Full 2-player game from lobby to scoreboard
  1. `npm run dev`
  2. Tab 1: Create lobby (Classic Dungeon), Tab 2: Join with room code
  3. Both ready, host starts → both see game with their objectives
  4. Play alternating turns — verify turn indicator switches, action buttons enable/disable
  5. Verify dungeon map shows both player positions with different colors
  6. Both players enter same room → narration mentions the other player
  7. One triggers danger → both take damage (shared consequence visible in both tabs)
  8. Play to game end → scoreboard shows with objective reveal and correct scores
  9. Click "Play Again" → returns to lobby

---

## Phase 6: Cleanup, Edge Cases & Documentation

Polish edge cases, update CLAUDE.md, and ensure all tests pass.

Dependencies: **Phase 5**

**Tasks**:
- [x] Handle mid-game disconnection gracefully
  - Player disconnects → marked as dead, turn skipped, broadcast "PlayerX has disconnected"
  - If all remaining players disconnect → game cleaned up from memory
  - Reconnection: out of scope (see "What We're NOT Doing")
- [x] Handle lobby edge cases
  - Host disconnects in lobby → promote next player to host, or clean up if empty
  - Player joins during game in-progress → reject with error message
  - Duplicate player names → append number suffix (e.g., "Player (2)")
- [x] Update turn timeout to handle edge cases
  - If timed-out player was the last alive → check end conditions
  - Timeout narration: "[PlayerName] hesitates too long... the moment passes."
- [x] Update `CLAUDE.md` — document new multiplayer architecture
  - Add Socket.io to architecture section
  - Document lobby flow and socket events
  - Update key design decisions section
- [x] Update `server/src/routes.test.ts` — update tests for reduced REST surface (removed mutation endpoints)
- [x] Verify all existing tests pass with updated signatures

**Automated Verification**:
- [x] `npm run build:server` passes
- [x] `npm run build:client` passes
- [x] `npm run lint` passes
- [x] `npm test` passes (all existing + new tests)

**Manual Verification**:
- [ ] Disconnection handling works
  1. Start 2-player game
  2. Close Tab 2 mid-game → Tab 1 sees "Player2 disconnected" message
  3. Game continues with Player1 only, turns advance normally
- [ ] 3-player game completes successfully
  1. Open 3 tabs, create and join lobby
  2. Play through full game with 3 players
  3. Verify turn rotation, shared consequences, and scoring all work with 3 players

---

## References

- [Multiplayer Research](../research/2026-04-02-multiplayer-gameplay-options.md) — Model C analysis, implementation patterns
- Current single-player game engine: `server/src/game.ts`
- Current DM interface: `server/src/ai.ts`
- Current REST routes: `server/src/routes.ts`
- Socket.io docs: https://socket.io/docs/v4/
