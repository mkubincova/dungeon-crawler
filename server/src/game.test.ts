import { describe, it, expect } from "vitest";
import {
  createGame,
  applyEffects,
  movePlayer,
  getActivePlayer,
  advanceTurn,
  checkObjectives,
} from "./game.js";
import type { GameState, Lobby, Objective } from "../../shared/types.js";

function makeLobby(playerCount: number = 1): Lobby {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    socketId: `socket-${i}`,
    name: `Player${i + 1}`,
    ready: true,
  }));
  return {
    id: "lobby-1",
    roomCode: "TEST",
    hostPlayerId: "player-0",
    players,
    theme: "dungeon",
    status: "waiting",
  };
}

function makeObjectives(count: number): Objective[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `obj-${i}`,
    description: `Objective ${i}`,
  }));
}

function makeState(overrides?: Partial<GameState>): GameState {
  const lobby = makeLobby(1);
  const state = createGame(lobby, makeObjectives(1));
  return { ...state, ...overrides };
}

describe("createGame", () => {
  it("creates game with correct player count from lobby", () => {
    const lobby = makeLobby(3);
    const state = createGame(lobby, makeObjectives(3));
    expect(state.players).toHaveLength(3);
    expect(state.turnOrder).toHaveLength(3);
    expect(state.currentTurnIndex).toBe(0);
  });

  it("assigns objectives to players", () => {
    const lobby = makeLobby(2);
    const objectives = makeObjectives(2);
    const state = createGame(lobby, objectives);
    expect(state.players[0].objective?.id).toBe("obj-0");
    expect(state.players[1].objective?.id).toBe("obj-1");
  });

  it("initializes shared flags", () => {
    const state = makeState();
    expect(state.sharedFlags.doorUnlocked).toBe(false);
    expect(state.sharedFlags.defeatedBoss).toBe(false);
  });
});

describe("applyEffects", () => {
  it("applies HP damage and clamps to 0, sets status to dead", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    applyEffects(state, playerId, { hpChange: -100 });
    expect(state.players[0].hp).toBe(0);
    expect(state.players[0].status).toBe("dead");
    expect(state.status).toBe("lost");
  });

  it("applies HP healing and clamps to maxHp", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    state.players[0].hp = 3;
    applyEffects(state, playerId, { hpChange: 100 });
    expect(state.players[0].hp).toBe(8);
  });

  it("adds items without duplicates", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    state.players[0].inventory = ["sword"];
    applyEffects(state, playerId, { addItems: ["sword", "shield"] });
    expect(state.players[0].inventory).toEqual(["sword", "shield"]);
  });

  it("removes items from inventory", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    state.players[0].inventory = ["sword", "shield"];
    applyEffects(state, playerId, { removeItems: ["sword"] });
    expect(state.players[0].inventory).toEqual(["shield"]);
  });

  it("merges shared flags", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    applyEffects(state, playerId, { setFlags: { solvedPuzzle: true } });
    expect(state.sharedFlags.solvedPuzzle).toBe(true);
    expect(state.sharedFlags.doorUnlocked).toBe(false);
  });

  it("moves to a valid neighbor room", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    applyEffects(state, playerId, { moveToRoom: "torch_corridor" });
    expect(state.players[0].currentRoomId).toBe("torch_corridor");
    expect(state.players[0].visitedRooms).toContain("torch_corridor");
  });

  it("rejects move to non-neighbor room", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    applyEffects(state, playerId, { moveToRoom: "boss_lair" });
    expect(state.players[0].currentRoomId).toBe("entrance");
  });

  it("triggers win when player enters goal room with boss defeated", () => {
    const lobby = makeLobby(1);
    const state = createGame(lobby, makeObjectives(1));
    state.players[0].currentRoomId = "boss_lair";
    state.players[0].visitedRooms = ["entrance", "boss_lair"];
    state.sharedFlags.defeatedBoss = true;
    applyEffects(state, state.players[0].id, { moveToRoom: "treasure_vault" });
    expect(state.status).toBe("won");
  });
});

describe("movePlayer", () => {
  it("returns true and moves for valid neighbor", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    const result = movePlayer(state, playerId, "torch_corridor");
    expect(result).toBe(true);
    expect(state.players[0].currentRoomId).toBe("torch_corridor");
    expect(state.globalVisitedRooms).toContain("torch_corridor");
  });

  it("returns false and stays put for non-neighbor", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    const result = movePlayer(state, playerId, "boss_lair");
    expect(result).toBe(false);
    expect(state.players[0].currentRoomId).toBe("entrance");
  });

  it("does not duplicate visited rooms", () => {
    const state = makeState();
    const playerId = state.players[0].id;
    state.players[0].visitedRooms = ["entrance", "torch_corridor"];
    movePlayer(state, playerId, "torch_corridor");
    expect(
      state.players[0].visitedRooms.filter((r) => r === "torch_corridor").length
    ).toBe(1);
  });
});

describe("advanceTurn", () => {
  it("advances to next player", () => {
    const lobby = makeLobby(2);
    const state = createGame(lobby, makeObjectives(2));
    expect(state.currentTurnIndex).toBe(0);
    advanceTurn(state);
    expect(state.currentTurnIndex).toBe(1);
  });

  it("wraps around to first player", () => {
    const lobby = makeLobby(2);
    const state = createGame(lobby, makeObjectives(2));
    advanceTurn(state);
    advanceTurn(state);
    expect(state.currentTurnIndex).toBe(0);
  });

  it("skips dead players", () => {
    const lobby = makeLobby(3);
    const state = createGame(lobby, makeObjectives(3));
    state.players[1].status = "dead";
    advanceTurn(state);
    // Should skip index 1 (dead) and land on index 2
    expect(state.currentTurnIndex).toBe(2);
  });
});

describe("getActivePlayer", () => {
  it("returns player at currentTurnIndex", () => {
    const lobby = makeLobby(2);
    const state = createGame(lobby, makeObjectives(2));
    const active = getActivePlayer(state);
    expect(active.id).toBe(state.turnOrder[0]);
  });
});

describe("checkObjectives", () => {
  it("marks collector objective complete when 2+ items", () => {
    const state = makeState();
    state.players[0].objective = { id: "collector", description: "Collect items" };
    state.players[0].inventory = ["sword", "shield"];
    checkObjectives(state);
    expect(state.players[0].objectiveComplete).toBe(true);
  });

  it("does not mark collector complete with fewer than 2 items", () => {
    const state = makeState();
    state.players[0].objective = { id: "collector", description: "Collect items" };
    state.players[0].inventory = ["sword"];
    checkObjectives(state);
    expect(state.players[0].objectiveComplete).toBe(false);
  });
});
