import { randomUUID } from "crypto";
import type { GameState, PlayerState, DMEffects, Lobby, Objective } from "../../shared/types.js";
import { getTheme } from "../../shared/themes/index.js";
import { areNeighbors } from "./dungeon.js";

const games = new Map<string, GameState>();

export function createGame(lobby: Lobby, objectives: Objective[]): GameState {
  const theme = getTheme(lobby.theme);
  const players: PlayerState[] = lobby.players.map((lp, i) => ({
    id: lp.id,
    socketId: lp.socketId,
    name: lp.name,
    hp: 8,
    maxHp: 8,
    currentRoomId: theme.startRoom,
    inventory: [],
    visitedRooms: [theme.startRoom],
    objective: objectives[i] ?? null,
    objectiveComplete: false,
    status: "alive",
  }));

  const state: GameState = {
    id: randomUUID(),
    theme: theme.id,
    lobbyId: lobby.id,
    players,
    sharedFlags: {
      doorUnlocked: false,
      metBoss: false,
      solvedPuzzle: false,
      defeatedBoss: false,
    },
    currentTurnIndex: 0,
    turnOrder: players.map((p) => p.id),
    turnDeadline: Date.now() + 45000,
    globalVisitedRooms: [theme.startRoom],
    turnLog: [],
    status: "playing",
  };
  games.set(state.id, state);
  return state;
}

export function getGame(id: string): GameState | undefined {
  return games.get(id);
}

export function deleteGame(id: string): void {
  games.delete(id);
}

export function getActivePlayer(state: GameState): PlayerState {
  const playerId = state.turnOrder[state.currentTurnIndex];
  return state.players.find((p) => p.id === playerId)!;
}

export function advanceTurn(state: GameState): string {
  const total = state.turnOrder.length;
  let next = (state.currentTurnIndex + 1) % total;
  let attempts = 0;
  while (attempts < total) {
    const playerId = state.turnOrder[next];
    const player = state.players.find((p) => p.id === playerId);
    if (player && player.status === "alive") {
      state.currentTurnIndex = next;
      state.turnDeadline = Date.now() + 45000;
      return playerId;
    }
    next = (next + 1) % total;
    attempts++;
  }
  state.currentTurnIndex = next;
  return state.turnOrder[next];
}

export function applyEffects(
  state: GameState,
  playerId: string,
  effects: DMEffects
): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;

  if (effects.hpChange !== undefined) {
    player.hp = Math.max(0, Math.min(player.maxHp, player.hp + effects.hpChange));
    if (player.hp <= 0) player.status = "dead";
  }

  if (effects.addItems) {
    for (const item of effects.addItems) {
      if (!player.inventory.includes(item)) player.inventory.push(item);
    }
  }

  if (effects.removeItems) {
    player.inventory = player.inventory.filter(
      (i) => !effects.removeItems!.includes(i)
    );
  }

  if (effects.setFlags) {
    Object.assign(state.sharedFlags, effects.setFlags);
  }

  if (effects.moveToRoom) {
    const target = effects.moveToRoom;
    if (areNeighbors(state.theme, player.currentRoomId, target)) {
      player.currentRoomId = target;
      if (!player.visitedRooms.includes(target)) player.visitedRooms.push(target);
      if (!state.globalVisitedRooms.includes(target))
        state.globalVisitedRooms.push(target);
    }
  }

  checkEndConditions(state);
}

export function applySharedConsequences(
  state: GameState,
  roomId: string,
  effects: DMEffects
): string[] {
  const affected: string[] = [];
  if (effects.hpChange === undefined || effects.hpChange >= 0) return affected;

  for (const player of state.players) {
    if (player.currentRoomId === roomId && player.status === "alive") {
      player.hp = Math.max(0, player.hp + effects.hpChange);
      if (player.hp <= 0) player.status = "dead";
      affected.push(player.id);
    }
  }
  checkEndConditions(state);
  return affected;
}

export function movePlayer(
  state: GameState,
  playerId: string,
  targetRoomId: string
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  if (!areNeighbors(state.theme, player.currentRoomId, targetRoomId)) return false;
  player.currentRoomId = targetRoomId;
  if (!player.visitedRooms.includes(targetRoomId))
    player.visitedRooms.push(targetRoomId);
  if (!state.globalVisitedRooms.includes(targetRoomId))
    state.globalVisitedRooms.push(targetRoomId);
  checkEndConditions(state);
  return true;
}

export function checkEndConditions(state: GameState): void {
  const theme = getTheme(state.theme);
  const alivePlayers = state.players.filter((p) => p.status === "alive");
  if (alivePlayers.length === 0) {
    state.status = "lost";
    return;
  }
  const winner = alivePlayers.find(
    (p) => p.currentRoomId === theme.goalRoom && state.sharedFlags.defeatedBoss
  );
  if (winner) state.status = "won";
}

export function checkObjectives(state: GameState): void {
  const theme = getTheme(state.theme);
  const totalRooms = theme.rooms.length;

  for (const player of state.players) {
    if (player.objectiveComplete || !player.objective) continue;
    const obj = player.objective;

    switch (obj.id) {
      case "first_to_boss": {
        const bossRoom = theme.rooms.find((r) => r.tag === "boss");
        if (bossRoom && player.currentRoomId === bossRoom.id) {
          player.objectiveComplete = true;
        }
        break;
      }
      case "collector":
        if (player.inventory.length >= 2) player.objectiveComplete = true;
        break;
      case "explorer":
        if (player.visitedRooms.length >= totalRooms) player.objectiveComplete = true;
        break;
      case "untouched":
        if (state.status !== "playing" && player.hp === player.maxHp)
          player.objectiveComplete = true;
        break;
      case "speedrunner": {
        const playerTurns = state.turnLog.filter((e) => e.playerId === player.id).length;
        if (player.currentRoomId === theme.goalRoom && playerTurns <= 10)
          player.objectiveComplete = true;
        break;
      }
      case "pacifist": {
        const fought = state.turnLog.some(
          (e) => e.playerId === player.id && e.chosenAction === "fight_boss"
        );
        if (!fought && state.status !== "playing") player.objectiveComplete = true;
        break;
      }
    }
  }
}
