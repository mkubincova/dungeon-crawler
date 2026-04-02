---
date: "2026-04-02T08:09:36.338362+00:00"
git_commit: 124bcee67c81938b0511c6a93a7d941d8baf1e21
branch: main
topic: "Multiplayer gameplay options for D&D-style dungeon crawler"
tags: [research, multiplayer, game-design, architecture]
status: complete
---

# Research: Multiplayer Gameplay Options for D&D-Style Dungeon Crawler

## Research Question

What are the options for making the dungeon crawler multiplayer? Compare cooperative vs competitive, shared decisions vs individual actions, round structure, and collaboration/competition models.

## Summary

There are three broad multiplayer models for a D&D-style dungeon crawler: **cooperative party play**, **competitive parallel play**, and **hybrid co-opetition**. Each model implies different round structures, decision-making mechanics, and AI DM adaptations. This document compares them side-by-side with concrete game examples and maps each to the current codebase architecture.

### Current Architecture (Single-Player Baseline)

```
client/          React SPA, REST calls to server
server/
  routes.ts      POST /api/game/start, POST /api/game/action, GET /api/game/:id
  game.ts        Map<gameId, GameState> — one player, one game
  ai.ts          DungeonMaster interface (enterRoom, handleAction)
shared/
  types.ts       Player { name, hp, maxHp }, GameState { player, inventory, ... }
```

Key facts: one `Player` per `GameState`, REST-only (no WebSockets), in-memory state, turn-based action → narration loop.

---

## Multiplayer Models Compared

### Model A: Cooperative Party Play

Players form a party and explore the dungeon together, sharing a single game state.

**How it works in real games:**
- **Baldur's Gate 3**: Up to 4 players, each controls one character. Players can split up within the map. Story decisions go to whoever initiated dialogue; others can request changes but the initiator decides. Host has final override.
- **Divinity: Original Sin 2**: Up to 4 players. Disagreements on dialogue choices resolved via a rock-paper-scissors minigame.
- **Gloomhaven Digital**: Each player secretly and simultaneously selects action cards, then all reveal. Initiative values on cards determine execution order.
- **AI Dungeon (multiplayer mode)**: Players take turns submitting actions. AI narrator receives all actions and produces one unified narrative.

**Round structure options:**

| Pattern | Description | Pros | Cons |
|---|---|---|---|
| **Round-robin turns** | Each player submits one action in sequence; DM narrates after each | Simplest to implement | Slow for 4+ players, others idle |
| **Simultaneous submit** | All players submit actions, DM gets all at once, produces one narration | Best narrative quality, no idle time | Needs commit/reveal logic, DM prompt is more complex |
| **Free-form with host authority** | Any player can act at any time; host resolves conflicts | Most flexible | Hardest to manage, chaotic |

**Decision-making options:**

| Mechanism | Example Game | How it works |
|---|---|---|
| **Individual autonomy + host override** | Baldur's Gate 3 | Each player acts freely, host breaks ties |
| **Conflict resolution minigame** | Divinity: Original Sin 2 | RPS to resolve disagreements |
| **Secret simultaneous selection** | Gloomhaven | No negotiation on specifics, just general strategy talk |
| **Majority vote + tiebreaker** | Jackbox Party Pack | Group votes, random or host breaks ties |
| **Rotating caller** | Classic D&D (1974) | One player decides for the group; role rotates per scene |

**AI DM adaptation**: The DM prompt receives all player actions as a batch and must address each player's action in one cohesive narration. The `DMContext` would expand to include a `players[]` array instead of a single `playerName`/`playerHp`.

---

### Model B: Competitive Parallel Play

Players each run their own dungeon instance but compete on outcomes.

**How it works in real games:**
- **Crawl**: One player is the hero; others control monsters. Killing the hero lets you become the hero.
- **Gauntlet (2014)**: Cooperative dungeon crawling but players compete for gold and food pickups.
- **Spelunky 2 daily challenges**: All players get the same seed, ranked by score.

**Round structure:** Each player takes their own turns independently — no synchronization needed. Competition is measured at the end (fastest clear, most HP remaining, most rooms explored, etc.).

**Implementation notes:**
- Simplest to add: each player gets their own `GameState` as today, just add a shared leaderboard/scoring layer.
- Could share the same dungeon seed/layout so runs are comparable.
- No changes needed to the DM prompt or action loop.

---

### Model C: Hybrid Co-opetition

Players cooperate on some axis but have competing personal objectives.

**How it works in real games:**
- **Munchkin**: Players cooperate situationally in combat but compete to reach level 10 first. Alliances are temporary, betrayal is core.
- **Descent: Journeys in the Dark**: 1-vs-many — one player is the Overlord controlling monsters, the rest cooperate as heroes.
- **Nemesis**: Semi-cooperative with hidden personal objectives. Players may need to sabotage others to win.
- **Dead of Winter**: Cooperative survival with secret personal objectives and an optional traitor.

**Round structure:** Typically turn-based with individual actions, but some actions affect the shared game state (opening a door helps everyone, triggering a trap hurts everyone nearby).

**Decision-making:** Each player acts individually but the shared consequences create emergent cooperation/competition. Hidden objectives add tension without requiring explicit PvP.

---

## Async vs Real-Time

| Approach | Best for | Implementation |
|---|---|---|
| **Real-time (WebSockets)** | Cooperative play, simultaneous action selection | Socket.io with Express, room-based state |
| **Async (play-by-post)** | Casual players, different time zones | REST API with polling or SSE, action deadlines |
| **Hybrid** | Flexible groups | WebSocket when connected, fall back to async with timeouts |

**Async examples**: Rolegate, Storium — players post actions on their own schedule, DM resolves in batches with scene deadlines. This maps naturally to the existing REST architecture.

---

## Technical Implementation Patterns

### Communication Layer

| Technology | Pros | Cons |
|---|---|---|
| **Socket.io** | Built-in rooms, auto-reconnect, Express integration, fallback to polling | ~40KB client bundle |
| **Native WebSocket (`ws`)** | Minimal overhead, native browser API | Manual rooms, reconnection, heartbeats |
| **Colyseus** | Full game framework, schema-based state sync | Framework dependency, may conflict with Express |
| **SSE + REST** | No new dependencies, works with existing REST routes | Server→client only, needs REST for actions |

### State Synchronization

The **authoritative server** pattern fits all models: server owns game state, clients send intents, server validates and broadcasts. For 2-6 players with small state objects, **full-state broadcast** after each action is sufficient (no need for delta/patch sync).

### Turn Management

- **Token-passing**: Server tracks `currentPlayerIndex`. Only the active player's actions are accepted. Simple and deterministic.
- **Simultaneous commit-reveal**: Collect all player choices (hidden), resolve once all are received. Natural fit for the Gloomhaven-style simultaneous model.
- **Timeouts**: `setTimeout` server-side (30-60s). Skip turn or apply default action on expiry.

### Lobby/Room Flow

```
waiting → ready → in-progress → finished
```

Server maintains `Map<roomId, Room>` where `Room` tracks connected players, ready state, and game settings. Players join via room code. Ready-up required from all players before game starts.

---

## Side-by-Side Comparison

| Dimension | A: Cooperative Party | B: Competitive Parallel | C: Hybrid Co-opetition |
|---|---|---|---|
| **Shared state?** | Yes — one GameState, multiple players | No — separate GameState per player | Partially — shared dungeon, individual objectives |
| **Decision model** | Vote / caller / simultaneous | Individual (no coordination) | Individual actions, shared consequences |
| **Round structure** | Sequential turns or simultaneous submit | Independent (async-friendly) | Turn-based with shared effects |
| **DM complexity** | High — must narrate for multiple players | Low — same as single-player | Medium — must track individual + shared state |
| **Implementation effort** | High — Player[], WebSockets, turn mgmt | Low — add scoring/lobby on top of existing | Medium — needs shared state + individual objectives |
| **Player interaction** | Direct collaboration, discussion | Indirect (leaderboard) | Emergent (help/hinder through actions) |
| **Idle time** | Some (during others' turns) unless simultaneous | None | Some |
| **Best player count** | 2-4 | 2-8+ | 3-6 |

---

## How Each Model Maps to Current Codebase

### Model A (Cooperative) — Changes Required

- `shared/types.ts`: `GameState.player` → `GameState.players: Player[]`, add `currentTurnPlayerId`
- `server/game.ts`: Track multiple players, turn order, action collection for simultaneous mode
- `server/routes.ts`: New endpoints for join/leave, or WebSocket events for real-time
- `server/ai.ts` / `llm-dm.ts`: DM prompt must address multiple player actions, reference players by name
- `client/App.tsx`: Show all players' status, indicate whose turn it is, action submission gating

### Model B (Competitive) — Changes Required

- `shared/types.ts`: Add `Lobby` type with player list and scoring
- `server/game.ts`: Add lobby management, shared dungeon seed
- `server/routes.ts`: Lobby endpoints (create, join, start), leaderboard endpoint
- No DM changes needed — each player gets their own narration as today
- `client/`: Add lobby UI, leaderboard display

### Model C (Hybrid) — Changes Required

- Combination of A and B changes, plus:
- `shared/types.ts`: Add `personalObjective` per player, shared vs individual inventory
- `server/game.ts`: Track shared dungeon effects, resolve individual vs shared actions
- `server/ai.ts`: DM must know about shared consequences and hidden objectives

---

## Code References

- `shared/types.ts:13-19` — Current single-`Player` interface
- `shared/types.ts:29-39` — Current `GameState` with single player
- `server/src/game.ts:7` — In-memory `Map<gameId, GameState>` store
- `server/src/game.ts:9-29` — `createGame()` initializes single player
- `server/src/routes.ts:45-69` — `POST /api/game/start` creates single-player game
- `server/src/routes.ts:72-190` — `POST /api/game/action` processes single player action
- `server/src/ai.ts` — `DungeonMaster` interface (enterRoom, handleAction)

## Open Questions

- **Which model best fits the game's identity?** Cooperative party play is most D&D-authentic but highest implementation effort. Competitive parallel is easiest to add.
- **Real-time or async?** If targeting casual web play, async (REST + polling) may be sufficient and avoids WebSocket complexity. Real-time is better for simultaneous action selection.
- **How many players?** 2-player cooperative is significantly simpler than 4-player (fewer turn management edge cases, simpler DM prompts).
- **DM prompt scaling**: With 4 players taking simultaneous actions, the LLM prompt grows substantially. Need to test whether smaller models can handle multi-player narration quality.
