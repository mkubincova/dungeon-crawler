import { describe, it, expect } from "vitest";
import { sanitizeActions } from "./routes.js";
import type { DMAction } from "../../shared/types.js";

describe("sanitizeActions", () => {
  it("filters out actions containing 'potion'", () => {
    const actions: DMAction[] = [
      { id: "use_potion", label: "Use potion" },
      { id: "explore", label: "Explore room" },
    ];
    const result = sanitizeActions(actions, []);
    expect(result).toEqual([{ id: "explore", label: "Explore room" }]);
  });

  it("filters out actions containing 'healing'", () => {
    const actions: DMAction[] = [
      { id: "drink_healing", label: "Drink healing brew" },
    ];
    const result = sanitizeActions(actions, []);
    expect(result).toEqual([]);
  });

  it("filters take_ actions for items already in inventory", () => {
    const actions: DMAction[] = [
      { id: "take_shield", label: "Take the shield" },
    ];
    const result = sanitizeActions(actions, ["shield"]);
    expect(result).toEqual([]);
  });

  it("keeps take_ actions for items not in inventory", () => {
    const actions: DMAction[] = [
      { id: "take_shield", label: "Take the shield" },
    ];
    const result = sanitizeActions(actions, []);
    expect(result).toEqual([{ id: "take_shield", label: "Take the shield" }]);
  });

  it("filters grab_, pick_up_, collect_, loot_ for owned items", () => {
    const prefixes = ["grab_sword", "pick_up_sword", "collect_sword", "loot_sword"];
    for (const id of prefixes) {
      const result = sanitizeActions([{ id, label: "x" }], ["sword"]);
      expect(result).toEqual([]);
    }
  });

  it("injects healing potion action when in inventory", () => {
    const actions: DMAction[] = [{ id: "explore", label: "Explore" }];
    const result = sanitizeActions(actions, ["healing_potion"]);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      id: "use_healing_potion",
      label: "Drink healing potion (+2 HP)",
    });
  });

  it("does not inject healing potion when not in inventory", () => {
    const result = sanitizeActions([{ id: "explore", label: "Explore" }], []);
    expect(result).toHaveLength(1);
  });

  it("handles empty actions array", () => {
    const result = sanitizeActions([], []);
    expect(result).toEqual([]);
  });
});
