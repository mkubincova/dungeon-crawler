import { randomUUID } from "crypto";
import type { GameState, GameFlags, DMEffects } from "../../shared/types.js";
import { START_ROOM, GOAL_ROOM, getRoom, areNeighbors } from "./dungeon.js";

// In-memory store (single-player, Phase 1)
const games = new Map<string, GameState>();

export function createGame(playerName: string): GameState {
  const state: GameState = {
    id: randomUUID(),
    currentRoomId: START_ROOM,
    player: { name: playerName || "Adventurer", hp: 10, maxHp: 10 },
    inventory: [],
    flags: {
      doorUnlocked: false,
      metBoss: false,
      solvedPuzzle: false,
      defeatedBoss: false,
    },
    visitedRooms: [START_ROOM],
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
    if (areNeighbors(state.currentRoomId, target)) {
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
  if (!areNeighbors(state.currentRoomId, targetRoomId)) {
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
  if (state.player.hp <= 0) {
    state.status = "lost";
  } else if (
    state.currentRoomId === GOAL_ROOM &&
    state.flags.defeatedBoss
  ) {
    state.status = "won";
  }
}
