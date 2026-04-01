import { describe, it, expect } from "vitest";
import { applyEffects, movePlayer } from "./game.js";
import type { GameState } from "../../shared/types.js";

function makeState(overrides?: Partial<GameState>): GameState {
  return {
    id: "test-id",
    currentRoomId: "entrance",
    player: { name: "Tester", hp: 8, maxHp: 8 },
    inventory: [],
    flags: {
      doorUnlocked: false,
      metBoss: false,
      solvedPuzzle: false,
      defeatedBoss: false,
    },
    visitedRooms: ["entrance"],
    turnLog: [],
    status: "playing",
    ...overrides,
  };
}

describe("applyEffects", () => {
  it("applies HP damage and clamps to 0", () => {
    const state = makeState();
    applyEffects(state, { hpChange: -100 });
    expect(state.player.hp).toBe(0);
    expect(state.status).toBe("lost");
  });

  it("applies HP healing and clamps to maxHp", () => {
    const state = makeState({
      player: { name: "Tester", hp: 3, maxHp: 8 },
    });
    applyEffects(state, { hpChange: 100 });
    expect(state.player.hp).toBe(8);
  });

  it("adds items without duplicates", () => {
    const state = makeState({ inventory: ["sword"] });
    applyEffects(state, { addItems: ["sword", "shield"] });
    expect(state.inventory).toEqual(["sword", "shield"]);
  });

  it("removes items from inventory", () => {
    const state = makeState({ inventory: ["sword", "shield"] });
    applyEffects(state, { removeItems: ["sword"] });
    expect(state.inventory).toEqual(["shield"]);
  });

  it("merges flags", () => {
    const state = makeState();
    applyEffects(state, { setFlags: { solvedPuzzle: true } });
    expect(state.flags.solvedPuzzle).toBe(true);
    expect(state.flags.doorUnlocked).toBe(false);
  });

  it("moves to a valid neighbor room", () => {
    const state = makeState(); // entrance neighbors: torch_corridor, goblin_den
    applyEffects(state, { moveToRoom: "torch_corridor" });
    expect(state.currentRoomId).toBe("torch_corridor");
    expect(state.visitedRooms).toContain("torch_corridor");
  });

  it("rejects move to non-neighbor room", () => {
    const state = makeState();
    applyEffects(state, { moveToRoom: "boss_lair" });
    expect(state.currentRoomId).toBe("entrance");
  });

  it("triggers win when entering goal room with boss defeated", () => {
    const state = makeState({
      currentRoomId: "boss_lair",
      visitedRooms: ["entrance", "boss_lair"],
      flags: {
        doorUnlocked: false,
        metBoss: true,
        solvedPuzzle: false,
        defeatedBoss: true,
      },
    });
    applyEffects(state, { moveToRoom: "treasure_vault" });
    expect(state.status).toBe("won");
  });
});

describe("movePlayer", () => {
  it("returns true and moves for valid neighbor", () => {
    const state = makeState();
    const result = movePlayer(state, "torch_corridor");
    expect(result).toBe(true);
    expect(state.currentRoomId).toBe("torch_corridor");
    expect(state.visitedRooms).toContain("torch_corridor");
  });

  it("returns false and stays put for non-neighbor", () => {
    const state = makeState();
    const result = movePlayer(state, "boss_lair");
    expect(result).toBe(false);
    expect(state.currentRoomId).toBe("entrance");
  });

  it("does not duplicate visited rooms", () => {
    const state = makeState({ visitedRooms: ["entrance", "torch_corridor"] });
    movePlayer(state, "torch_corridor");
    expect(
      state.visitedRooms.filter((r) => r === "torch_corridor").length
    ).toBe(1);
  });
});
