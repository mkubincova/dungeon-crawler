import { Router, type Request, type Response } from "express";
import type {
  StartGameRequest,
  StartGameResponse,
  ActionRequest,
  ActionResponse,
  DMContext,
  DMAction,
} from "../../shared/types.js";
import { createGame, getGame, applyEffects, movePlayer } from "./game.js";
import { getRoom, DUNGEON } from "./dungeon.js";
import { MockDungeonMaster, type DungeonMaster } from "./ai.js";
import { LLMDungeonMaster } from "./llm-dm.js";
import { isLLMConfigured } from "./config.js";

const router = Router();
const dm: DungeonMaster = isLLMConfigured()
  ? new LLMDungeonMaster()
  : new MockDungeonMaster();

console.log(`DM mode: ${isLLMConfigured() ? "LLM" : "Mock"}`);

function buildContext(
  state: ReturnType<typeof getGame>,
  note: string
): DMContext {
  const room = getRoom(state!.currentRoomId);
  return {
    roomId: room.id,
    roomTag: room.tag,
    roomName: room.name,
    roomDescription: room.description,
    playerName: state!.player.name,
    playerHp: state!.player.hp,
    playerMaxHp: state!.player.maxHp,
    inventory: [...state!.inventory],
    flags: { ...state!.flags },
    visitedRooms: [...state!.visitedRooms],
    note,
  };
}

// POST /api/game/start
router.post("/game/start", async (req: Request, res: Response) => {
  const { playerName } = req.body as StartGameRequest;
  const state = createGame(playerName);

  const ctx = buildContext(state, "The player has just entered the dungeon.");
  const dmResponse = await dm.enterRoom(ctx);

  state.turnLog.push({
    roomId: state.currentRoomId,
    narration: dmResponse.narration,
  });

  if (dmResponse.effects) {
    applyEffects(state, dmResponse.effects);
  }

  // Add healing potion action if player has one
  const actions = maybeAddPotionAction(dmResponse.actions, state.inventory);

  const response: StartGameResponse = {
    gameState: state,
    narration: dmResponse.narration,
    actions,
  };
  res.json(response);
});

// POST /api/game/action
router.post("/game/action", async (req: Request, res: Response) => {
  const { gameId, actionId } = req.body as ActionRequest;
  const state = getGame(gameId);

  if (!state) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  if (state.status !== "playing") {
    res.status(400).json({ error: `Game is over: ${state.status}` });
    return;
  }

  // Handle movement actions
  if (actionId.startsWith("move:")) {
    const targetRoom = actionId.slice(5);
    const room = getRoom(state.currentRoomId);
    if (!room.neighbors.includes(targetRoom)) {
      res.status(400).json({ error: "Cannot move to that room" });
      return;
    }

    movePlayer(state, targetRoom);

    const ctx = buildContext(
      state,
      `The player has just entered this room from ${room.name}.`
    );
    const dmResponse = await dm.enterRoom(ctx);

    state.turnLog.push({
      roomId: state.currentRoomId,
      narration: dmResponse.narration,
      chosenAction: actionId,
    });

    if (dmResponse.effects) {
      applyEffects(state, dmResponse.effects);
    }

    const actions = maybeAddPotionAction(dmResponse.actions, state.inventory);

    const response: ActionResponse = {
      gameState: state,
      narration: dmResponse.narration,
      actions,
    };
    res.json(response);
    return;
  }

  // Handle healing potion directly (server-injected action, not AI-managed)
  if (actionId === "use_healing_potion") {
    if (!state.inventory.includes("healing_potion")) {
      res.status(400).json({ error: "No healing potion in inventory" });
      return;
    }
    applyEffects(state, { hpChange: 4, removeItems: ["healing_potion"] });

    const narration = `${state.player.name} drinks the healing potion. A warm sensation spreads through your body as wounds close. (+4 HP)`;
    state.turnLog.push({ roomId: state.currentRoomId, narration, chosenAction: actionId });

    // Re-enter the current room to get fresh actions
    const ctx = buildContext(state, "The player just used a healing potion.");
    const dmResponse = await dm.enterRoom(ctx);
    const actions = maybeAddPotionAction(dmResponse.actions, state.inventory);

    const response: ActionResponse = { gameState: state, narration, actions };
    res.json(response);
    return;
  }

  // Handle non-movement actions
  const ctx = buildContext(state, `The player chose: "${actionId}".`);
  const dmResponse = await dm.handleAction(ctx, actionId);

  state.turnLog.push({
    roomId: state.currentRoomId,
    narration: dmResponse.narration,
    chosenAction: actionId,
  });

  if (dmResponse.effects) {
    applyEffects(state, dmResponse.effects);
  }

  // If action resulted in movement, get the new room entry narration
  let narration = dmResponse.narration;
  let actions = dmResponse.actions;

  if (dmResponse.effects?.moveToRoom) {
    const newCtx = buildContext(
      state,
      `The player has just arrived from a nearby area.`
    );
    const entryResponse = await dm.enterRoom(newCtx);
    narration += "\n\n" + entryResponse.narration;
    actions = entryResponse.actions;

    state.turnLog.push({
      roomId: state.currentRoomId,
      narration: entryResponse.narration,
    });

    if (entryResponse.effects) {
      applyEffects(state, entryResponse.effects);
    }
  }

  actions = maybeAddPotionAction(actions, state.inventory);

  const response: ActionResponse = {
    gameState: state,
    narration,
    actions,
  };
  res.json(response);
});

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
router.get("/dungeon", (_req: Request, res: Response) => {
  res.json(DUNGEON);
});

function maybeAddPotionAction(
  actions: DMAction[],
  inventory: string[]
): DMAction[] {
  // Strip any potion-related actions the LLM may have generated
  const filtered = actions.filter(
    (a) => !a.id.includes("potion") && !a.id.includes("healing")
  );

  if (inventory.includes("healing_potion")) {
    filtered.push({
      id: "use_healing_potion",
      label: "Drink healing potion (+4 HP)",
    });
  }

  return filtered;
}

export default router;
