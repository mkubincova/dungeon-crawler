import type { DMContext, DMResponse } from "../../shared/types.js";
import type { DungeonMaster } from "./ai.js";
import { getRoom } from "./dungeon.js";
import { config } from "./config.js";

const SYSTEM_PROMPT = `You are the Dungeon Master for a mini D&D dungeon crawler. You narrate scenes and offer the player choices.

RULES:
- You control ONLY the narrative and the choices offered. You do NOT control game rules, room layout, or movement.
- Keep narration vivid but concise (2-4 sentences).
- Offer 2-5 actions the player can take. Each action needs an "id" (snake_case identifier) and a "label" (short human-readable text).
- For movement options, use the id format "move:<room_id>" where room_id is one of the neighboring rooms provided in the context.
- You may suggest effects that the backend will apply:
  - hpChange: integer (negative for damage, positive for healing)
  - addItems: array of item id strings (snake_case)
  - removeItems: array of item id strings to remove
  - setFlags: object of flag_name: boolean pairs (available flags: doorUnlocked, metBoss, solvedPuzzle, defeatedBoss)
  - moveToRoom: a neighboring room_id to move the player to (only if the action causes movement)
- Only suggest effects that make sense for the action. Most room entries have no effects.
- Keep items and flags consistent with what already exists in the game state.
- This dungeon is DANGEROUS. The player should frequently take damage from traps, combat, and hazards. Do not be generous — most risky actions should cost HP.
- Damage should be meaningful: -1 to -2 for minor hazards, -2 to -3 for combat or traps, -3 to -4 for major encounters. Only heal the player in rare, exceptional circumstances (+1 at most).
- The dungeon has a boss (Shadow Dragon). Setting defeatedBoss=true should require genuine effort (combat or clever diplomacy) and should always cost significant HP (-4 or more without a shield).
- The player wins by reaching the treasure_vault room with defeatedBoss=true.
- If the player's HP is low, make combat even more dangerous — they are weakened and enemies sense it.
- Rooms tagged "danger" should almost always deal damage on entry or through interactions. Safe rooms are a brief respite, not a guarantee.
- NEVER offer actions for using inventory items (e.g. healing potions). The backend adds those automatically. Your actions should only be room interactions and movement options.
- NEVER duplicate actions. Each action id must be unique in the list.
- When the player finds an item, add it via "addItems" in effects IMMEDIATELY — do NOT offer a separate "take" or "pick up" action. The narration should describe the player finding and taking the item, and the effects should include it. Never offer an action to pick up an item that is already in the player's inventory.

You MUST respond with valid JSON matching this schema exactly:
{
  "narration": "string",
  "actions": [{ "id": "string", "label": "string" }],
  "effects": { "hpChange": number, "addItems": ["string"], "removeItems": ["string"], "setFlags": { "flag": true }, "moveToRoom": "room_id" }
}

The "effects" field is optional — omit it or set individual fields only when the situation warrants a state change. Respond with ONLY the JSON object, no markdown fences or extra text.`;

function buildUserMessage(ctx: DMContext, actionId?: string): string {
  const room = getRoom(ctx.roomId);
  const neighbors = room.neighbors.map((n) => {
    const nr = getRoom(n);
    return `${nr.id} (${nr.name}, ${nr.tag})`;
  });

  const parts = [
    `Room: ${ctx.roomId} (${ctx.roomName}) [${ctx.roomTag}]`,
    `Description: ${ctx.roomDescription}`,
    `Neighbors: ${neighbors.join(", ")}`,
    `Player: ${ctx.playerName} | HP: ${ctx.playerHp}/${ctx.playerMaxHp}`,
    `Inventory: ${ctx.inventory.length ? ctx.inventory.join(", ") : "empty"}`,
    `Flags: ${Object.entries(ctx.flags)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none"}`,
    `Visited rooms: ${ctx.visitedRooms.join(", ")}`,
    `Context: ${ctx.note}`,
  ];

  if (actionId) {
    parts.push(`Player chose action: "${actionId}"`);
  }

  return parts.join("\n");
}

async function callLLM(messages: Array<{ role: string; content: string }>): Promise<DMResponse> {
  const { apiKey, baseUrl, model } = config.llm;

  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences if the model wraps its response
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(cleaned) as DMResponse;

  // Validate required fields
  if (typeof parsed.narration !== "string" || !Array.isArray(parsed.actions)) {
    throw new Error("LLM response missing required fields (narration, actions)");
  }

  return parsed;
}

export class LLMDungeonMaster implements DungeonMaster {
  async enterRoom(ctx: DMContext): Promise<DMResponse> {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserMessage(ctx),
      },
    ];
    return callLLM(messages);
  }

  async handleAction(ctx: DMContext, actionId: string): Promise<DMResponse> {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserMessage(ctx, actionId),
      },
    ];
    return callLLM(messages);
  }
}
