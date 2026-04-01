import type { DMContext, DMResponse } from "../../shared/types.js";
import { getRoom } from "./dungeon.js";

// ── AI Interface ──

export interface DungeonMaster {
  enterRoom(ctx: DMContext): Promise<DMResponse>;
  handleAction(ctx: DMContext, actionId: string): Promise<DMResponse>;
}

// ── Mock AI DM ──
// Provides generic tag-based responses. Works for any theme as a fallback.

export class MockDungeonMaster implements DungeonMaster {
  async enterRoom(ctx: DMContext): Promise<DMResponse> {
    const visitCount = ctx.visitedRooms.filter((r) => r === ctx.roomId).length;
    const isFirstVisit = visitCount <= 1;
    return getRoomEntry(ctx, isFirstVisit);
  }

  async handleAction(ctx: DMContext, actionId: string): Promise<DMResponse> {
    return getActionOutcome(ctx, actionId);
  }
}

function getMoveActions(ctx: DMContext): { id: string; label: string }[] {
  const room = getRoom(ctx.themeId, ctx.roomId);
  return room.neighbors.map((n) => {
    const nr = getRoom(ctx.themeId, n);
    return { id: `move:${nr.id}`, label: `Go to ${nr.name}` };
  });
}

function getRoomEntry(ctx: DMContext, firstVisit: boolean): DMResponse {
  const moves = getMoveActions(ctx);

  if (!firstVisit) {
    return {
      narration: `${ctx.playerName} returns to ${ctx.roomName}. ${ctx.roomDescription}`,
      actions: [...moves, { id: "search_room", label: "Search the area" }],
    };
  }

  switch (ctx.roomTag) {
    case "safe":
      return {
        narration: `${ctx.playerName} enters ${ctx.roomName}. ${ctx.roomDescription} This area seems relatively safe.`,
        actions: [...moves, { id: "search_room", label: "Search the area" }],
      };

    case "danger":
      return {
        narration: `${ctx.playerName} enters ${ctx.roomName}. ${ctx.roomDescription} Danger lurks here!`,
        actions: [
          { id: "face_danger", label: "Face the danger head-on" },
          { id: "sneak_past", label: "Try to sneak through" },
          ...moves,
        ],
      };

    case "puzzle":
      return {
        narration: `${ctx.playerName} enters ${ctx.roomName}. ${ctx.roomDescription} A puzzle blocks the way forward.`,
        actions: ctx.flags.solvedPuzzle
          ? moves
          : [
              { id: "solve_puzzle", label: "Attempt the puzzle" },
              ...moves,
            ],
      };

    case "boss":
      if (ctx.flags.defeatedBoss) {
        return {
          narration: `${ctx.roomName} is quiet now. The threat has been dealt with.`,
          actions: moves,
        };
      }
      return {
        narration: `${ctx.playerName} enters ${ctx.roomName}. ${ctx.roomDescription} A powerful enemy bars the way!`,
        actions: [
          { id: "fight_boss", label: "Fight!" },
          { id: "talk_boss", label: "Try to negotiate" },
          ...moves,
        ],
        effects: { setFlags: { metBoss: true } },
      };

    case "goal":
      return {
        narration: `${ctx.playerName} enters ${ctx.roomName}. ${ctx.roomDescription} Victory is within reach!`,
        actions: [{ id: "claim_prize", label: "Claim your reward!" }],
      };

    default:
      return {
        narration: `${ctx.playerName} enters ${ctx.roomName}. ${ctx.roomDescription}`,
        actions: [...moves, { id: "search_room", label: "Look around" }],
      };
  }
}

function getActionOutcome(ctx: DMContext, actionId: string): DMResponse {
  const moves = getMoveActions(ctx);

  if (actionId.startsWith("move:")) {
    return {
      narration: `${ctx.playerName} moves onward...`,
      actions: [],
      effects: { moveToRoom: actionId.slice(5) },
    };
  }

  switch (actionId) {
    case "search_room":
      if (ctx.roomTag === "safe" && !ctx.inventory.includes("healing_potion")) {
        return {
          narration: `${ctx.playerName} searches carefully and finds a small healing potion hidden away.`,
          actions: moves,
          effects: { addItems: ["healing_potion"] },
        };
      }
      return {
        narration: `${ctx.playerName} searches the area but finds nothing of interest.`,
        actions: moves,
      };

    case "face_danger":
      return {
        narration: `${ctx.playerName} confronts the danger! It's a tough fight but you push through, battered and bruised.`,
        actions: moves,
        effects: { hpChange: -3 },
      };

    case "sneak_past":
      if (Math.random() > 0.5) {
        return {
          narration: `${ctx.playerName} moves quietly and slips through undetected. Lucky!`,
          actions: moves,
        };
      }
      return {
        narration: `${ctx.playerName} is spotted! A brief, painful scuffle follows.`,
        actions: moves,
        effects: { hpChange: -2 },
      };

    case "solve_puzzle":
      return {
        narration: `${ctx.playerName} studies the puzzle carefully and solves it! New paths open up.`,
        actions: moves,
        effects: { setFlags: { solvedPuzzle: true, doorUnlocked: true } },
      };

    case "fight_boss":
      if (ctx.playerHp > 4) {
        return {
          narration: `An epic battle! ${ctx.playerName} takes heavy damage but emerges victorious!`,
          actions: moves,
          effects: { hpChange: -4, setFlags: { defeatedBoss: true } },
        };
      }
      return {
        narration: `${ctx.playerName} fights valiantly but is overwhelmed...`,
        actions: [],
        effects: { hpChange: -ctx.playerHp },
      };

    case "talk_boss":
      if (ctx.flags.solvedPuzzle) {
        return {
          narration: `Your intelligence is recognized. The guardian steps aside, impressed by your wisdom.`,
          actions: moves,
          effects: { setFlags: { defeatedBoss: true } },
        };
      }
      return {
        narration: `Negotiation fails. The enemy grows impatient. You must fight or flee!`,
        actions: [
          { id: "fight_boss", label: "Fight!" },
          ...moves,
        ],
      };

    case "claim_prize":
      return {
        narration: `${ctx.playerName} claims the prize! A warm light fills the room. You have won!`,
        actions: [],
      };

    default:
      return {
        narration: `${ctx.playerName} considers the situation...`,
        actions: moves,
      };
  }
}
