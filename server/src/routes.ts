import { Router, type Request, type Response } from "express";
import type { DMAction } from "../../shared/types.js";
import { getGame } from "./game.js";
import { getDungeon } from "./dungeon.js";

const router = Router();

// GET /api/game/:id
router.get("/game/:id", (req: Request<{ id: string }>, res: Response) => {
  const state = getGame(req.params.id);
  if (!state) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(state);
});

// GET /api/dungeon - return map for visualization
router.get("/dungeon", (req: Request, res: Response) => {
  const theme = (req.query.theme as string) || "dungeon";
  res.json(getDungeon(theme));
});

export function sanitizeActions(
  actions: DMAction[],
  inventory: string[]
): DMAction[] {
  const takePatterns = /^(take|pick_up|grab|collect|loot)_/;

  const filtered = actions.filter((a) => {
    if (a.id.includes("potion") || a.id.includes("healing")) return false;
    if (takePatterns.test(a.id)) {
      const itemPart = a.id.replace(takePatterns, "");
      if (inventory.includes(itemPart)) return false;
    }
    return true;
  });

  if (inventory.includes("healing_potion")) {
    filtered.push({
      id: "use_healing_potion",
      label: "Drink healing potion (+2 HP)",
    });
  }

  return filtered;
}

export default router;
