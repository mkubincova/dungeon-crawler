# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run both client and server concurrently (from root)
npm run dev

# Run individually
npm run dev:server   # Express on :3001 (tsx watch)
npm run dev:client   # Vite on :5173 (proxies /api → :3001)

# Build
npm run build:server
npm run build:client

# Lint & test
npm run lint         # ESLint (flat config, typescript-eslint)
npm run lint:fix     # ESLint with auto-fix
npm test             # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

Run `npm test` after modifying game logic or route handling. Pre-commit hooks (husky + lint-staged) run ESLint and `tsc --noEmit` automatically on commit.

## Architecture

This is a full-stack TypeScript dungeon crawler with an AI Dungeon Master. Three packages share a flat repo (not npm workspaces):

- **`shared/`** — TypeScript interfaces only (no runtime code). Imported via relative path `../../shared/types.js` by both client and server.
- **`server/`** — Express REST API (in-memory game state, no database).
- **`client/`** — React + Vite SPA.

### Server

All routes are mounted under `/api` (see `routes.ts`). Game state lives in a `Map<gameId, GameState>` in `game.ts` — no persistence.

**DungeonMaster abstraction** (`ai.ts` interface): `MockDungeonMaster` provides hand-crafted responses; `LLMDungeonMaster` (`llm-dm.ts`) calls any OpenAI-compatible chat completions API. Selection is automatic based on whether `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` env vars are all set (see `config.ts`). Copy `server/.env.example` → `server/.env` to configure.

**Action sanitization** (`sanitizeActions` in `routes.ts`): The server strips AI-generated actions that conflict with inventory state (e.g., "take shield" when shield is already owned) and injects the healing potion action server-side. This is defense-in-depth against LLM instruction-following failures.

**Dungeon layout** (`dungeon.ts`): Fixed 8-room graph. Room tags (`safe`, `danger`, `puzzle`, `boss`, `goal`) drive both AI behavior and UI coloring. `START_ROOM` and `GOAL_ROOM` constants control game flow.

### Client

`App.tsx` holds top-level state (gameState, narration, actions, dungeonMap). API base URL comes from `VITE_API_URL` env var (empty in dev, Vite proxy handles it).

`DungeonMap.tsx` renders an SVG grid with room positions defined in `GRID_POS`. It exports `TAG_COLORS` and `ROOM_ICONS` which are reused by `CurrentRoomCard.tsx`.

### Deployment

- **Frontend → Vercel** (`vercel.json`): builds from `client/`, SPA rewrites. Set `VITE_API_URL` to the backend URL.
- **Backend → Railway** (`railway.json`): builds from `server/`. Server tsconfig has `rootDir: ".."` so compiled output lands at `dist/server/src/index.js` (the start script accounts for this).

### Key Design Decisions

- Healing potion is handled entirely server-side in `routes.ts`, not delegated to the AI, to avoid unreliable LLM behavior.
- The LLM system prompt in `llm-dm.ts` uses numbered critical rules and per-message inventory reminders because smaller models struggle with implicit instructions.
- `shared/types.ts` is imported via relative paths (not a published package), which requires both tsconfigs to include `../shared` in their scope.
