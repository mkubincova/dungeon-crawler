import type { DMContext, DMResponse } from "../../shared/types.js";
import type { DungeonMaster } from "./ai.js";
import { getRoom } from "./dungeon.js";
import { config } from "./config.js";
import { getTheme } from "../../shared/themes/index.js";

function buildSystemPrompt(themeId: string): string {
  const theme = getTheme(themeId);
  return `You are the ${theme.dmTitle} for a mini adventure game.

=== SETTING ===
${theme.promptFlavor}

=== YOUR JOB ===
Write short narration (2-4 sentences) and offer 2-5 actions.

=== ACTIONS FORMAT ===
Each action has "id" (snake_case) and "label" (short text).
Movement actions MUST use format: "move:<room_id>" (room_id from the Neighbors list).
All other actions are interactions: "search_room", "fight_goblins", etc.

=== EFFECTS ===
You may suggest effects the backend applies:
- hpChange: integer (negative = damage, positive = healing)
- addItems: ["item_id"] — adds to inventory
- removeItems: ["item_id"] — removes from inventory
- setFlags: { "flagName": true } — available: doorUnlocked, metBoss, solvedPuzzle, defeatedBoss
- moveToRoom: "room_id" — moves player (must be a neighbor)
Effects are optional. Only include when something changes.

=== DIFFICULTY ===
This adventure is DANGEROUS.
- Minor hazards: -1 to -2 HP
- Combat/traps: -2 to -3 HP
- Major encounters: -3 to -4 HP
- Boss without shield: -4 or more HP
- Healing is extremely rare (+1 at most)
- Danger rooms should almost always cost HP

=== CRITICAL RULES — READ CAREFULLY ===
1. NEVER offer "take", "pick up", or "grab" actions for items. If the player discovers an item, put it in "addItems" in effects and describe taking it in the narration. One step, no separate action.
2. NEVER offer actions for items already in the player's inventory. Check the Inventory list in the user message — if an item is there, do not mention taking it again.
3. NEVER offer actions to use inventory items (potions, etc). The backend handles that automatically.
4. NEVER duplicate action ids.
5. Actions must ONLY be: movement (move:room_id) or room interactions (explore, fight, talk, solve, etc).

=== RESPONSE FORMAT ===
Respond with ONLY this JSON, no other text:
{"narration":"...","actions":[{"id":"...","label":"..."}],"effects":{...}}`;
}

function buildUserMessage(ctx: DMContext, actionId?: string): string {
  const room = getRoom(ctx.themeId, ctx.roomId);
  const neighbors = room.neighbors.map((n) => {
    const nr = getRoom(ctx.themeId, n);
    return `${nr.id} (${nr.name}, ${nr.tag})`;
  });

  const inventoryList = ctx.inventory.length
    ? ctx.inventory.join(", ")
    : "empty";

  const parts = [
    `Room: ${ctx.roomId} (${ctx.roomName}) [${ctx.roomTag}]`,
    `Description: ${ctx.roomDescription}`,
    `Neighbors: ${neighbors.join(", ")}`,
    `Player: ${ctx.playerName} | HP: ${ctx.playerHp}/${ctx.playerMaxHp}`,
    `Inventory: ${inventoryList}`,
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

  if (ctx.inventory.length) {
    parts.push(
      `REMINDER: Player already owns: ${inventoryList}. Do NOT offer actions to take/pick up/grab any of these items.`
    );
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
      { role: "system", content: buildSystemPrompt(ctx.themeId) },
      {
        role: "user",
        content: buildUserMessage(ctx),
      },
    ];
    return callLLM(messages);
  }

  async handleAction(ctx: DMContext, actionId: string): Promise<DMResponse> {
    const messages = [
      { role: "system", content: buildSystemPrompt(ctx.themeId) },
      {
        role: "user",
        content: buildUserMessage(ctx, actionId),
      },
    ];
    return callLLM(messages);
  }
}
