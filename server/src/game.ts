import { randomUUID } from "crypto";
import type { GameState, DMEffects } from "../../shared/types.js";
import { getTheme } from "../../shared/themes/index.js";
import { areNeighbors } from "./dungeon.js";

// In-memory store (single-player, Phase 1)
const games = new Map<string, GameState>();

export function createGame(playerName: string, themeId: string = "dungeon"): GameState {
  const theme = getTheme(themeId);
  const state: GameState = {
    id: randomUUID(),
    theme: theme.id,
    currentRoomId: theme.startRoom,
    player: { name: playerName || "Adventurer", hp: 8, maxHp: 8 },
    inventory: [],
    flags: {
      doorUnlocked: false,
      metBoss: false,
      solvedPuzzle: false,
      defeatedBoss: false,
    },
    visitedRooms: [theme.startRoom],
    turnLog: [],
    status: "playing",
  };
  games.set(state.id, state);
  return state;
}

export function getGame(id: string): GameState | undefined {
  return games.get(id);
}

export function applyEffects(state: GameState, effects: DMEffects): void {
  if (effects.hpChange) {
    state.player.hp = Math.max(
      0,
      Math.min(state.player.maxHp, state.player.hp + effects.hpChange)
    );
  }

  if (effects.addItems) {
    for (const item of effects.addItems) {
      if (!state.inventory.includes(item)) {
        state.inventory.push(item);
      }
    }
  }

  if (effects.removeItems) {
    state.inventory = state.inventory.filter(
      (i) => !effects.removeItems!.includes(i)
    );
  }

  if (effects.setFlags) {
    Object.assign(state.flags, effects.setFlags);
  }

  if (effects.moveToRoom) {
    const target = effects.moveToRoom;
    if (areNeighbors(state.theme, state.currentRoomId, target)) {
      state.currentRoomId = target;
      if (!state.visitedRooms.includes(target)) {
        state.visitedRooms.push(target);
      }
    }
  }

  // Check win/lose
  checkEndConditions(state);
}

export function movePlayer(state: GameState, targetRoomId: string): boolean {
  if (!areNeighbors(state.theme, state.currentRoomId, targetRoomId)) {
    return false;
  }
  state.currentRoomId = targetRoomId;
  if (!state.visitedRooms.includes(targetRoomId)) {
    state.visitedRooms.push(targetRoomId);
  }
  checkEndConditions(state);
  return true;
}

function checkEndConditions(state: GameState): void {
  const theme = getTheme(state.theme);
  if (state.player.hp <= 0) {
    state.status = "lost";
  } else if (
    state.currentRoomId === theme.goalRoom &&
    state.flags.defeatedBoss
  ) {
    state.status = "won";
  }
}
