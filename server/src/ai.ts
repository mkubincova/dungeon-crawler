import type { DMContext, DMResponse, DMAction, DMEffects } from "../../shared/types.js";

// ── AI Interface ──

export interface DungeonMaster {
  enterRoom(ctx: DMContext): Promise<DMResponse>;
  handleAction(ctx: DMContext, actionId: string): Promise<DMResponse>;
}

// ── Mock AI DM ──
// Provides hand-crafted responses per room type. Swap this with a real LLM later.

export class MockDungeonMaster implements DungeonMaster {
  async enterRoom(ctx: DMContext): Promise<DMResponse> {
    // The room is always in visitedRooms by the time the AI is called,
    // so "first visit" means it appears exactly once (just added).
    const visitCount = ctx.visitedRooms.filter((r) => r === ctx.roomId).length;
    const isFirstVisit = visitCount <= 1;
    return getRoomEntry(ctx, isFirstVisit);
  }

  async handleAction(ctx: DMContext, actionId: string): Promise<DMResponse> {
    return getActionOutcome(ctx, actionId);
  }
}

function getRoomEntry(ctx: DMContext, firstVisit: boolean): DMResponse {
  switch (ctx.roomId) {
    case "entrance":
      return {
        narration: firstVisit
          ? `${ctx.playerName} steps through the crumbling archway into the Entrance Hall. Dust motes dance in the faint light filtering through cracks above. Two passages lead deeper into the dungeon.`
          : `${ctx.playerName} returns to the Entrance Hall. The familiar crumbling pillars stand silent.`,
        actions: [
          { id: "move:torch_corridor", label: "Take the left passage (Torch Corridor)" },
          { id: "move:goblin_den", label: "Take the right passage (Goblin Den)" },
          { id: "look_around", label: "Search the entrance hall" },
        ],
      };

    case "torch_corridor":
      return {
        narration: firstVisit
          ? `The Torch Corridor stretches ahead, lined with sputtering torches. ${ctx.playerName} spots pressure plates on the floor and tiny dart holes in the walls. One wrong step could be painful.`
          : `The Torch Corridor is still treacherous. Spent darts litter the floor, but more traps surely remain.`,
        actions: [
          { id: "move:entrance", label: "Go back to the Entrance Hall" },
          { id: "dash_through", label: "Sprint through the corridor" },
          { id: "careful_advance", label: "Carefully pick your way through" },
        ],
      };

    case "goblin_den":
      return {
        narration: firstVisit
          ? `${ctx.playerName} enters a foul-smelling cave. Three goblins snarl and brandish crude weapons! "Intruder!" one shrieks.`
          : `The Goblin Den is quiet now, littered with the aftermath of the earlier skirmish.`,
        actions: firstVisit
          ? [
              { id: "fight_goblins", label: "Draw your weapon and fight!" },
              { id: "sneak_past", label: "Try to sneak past the goblins" },
              { id: "move:entrance", label: "Retreat to the Entrance Hall" },
            ]
          : [
              { id: "move:entrance", label: "Go to the Entrance Hall" },
              { id: "move:armory", label: "Head to the Armory" },
              { id: "search_den", label: "Search the goblin den" },
            ],
      };

    case "puzzle_chamber":
      if (ctx.flags.solvedPuzzle) {
        return {
          narration: `The Puzzle Chamber's runes glow with a steady green light. The central mechanism stands open, its puzzle already solved.`,
          actions: [
            { id: "move:torch_corridor", label: "Go back to the Torch Corridor" },
            { id: "move:underground_river", label: "Descend to the Underground River" },
            { id: "move:boss_lair", label: "Enter the Boss Lair" },
          ],
        };
      }
      return {
        narration: `${ctx.playerName} enters a circular chamber covered in glowing runes. In the center, a stone mechanism with three rotating rings awaits. The symbols on the rings seem to tell a story of elements: fire, water, and earth.`,
        actions: [
          { id: "solve_puzzle", label: "Attempt to solve the rune puzzle" },
          { id: "move:torch_corridor", label: "Go back to the Torch Corridor" },
          ...(ctx.inventory.includes("rune_fragment")
            ? [{ id: "use_rune_fragment", label: "Use the rune fragment on the mechanism" }]
            : []),
        ],
      };

    case "armory":
      return {
        narration: `Rows of weapon racks line the walls, most empty or holding only rust. ${
          !ctx.inventory.includes("iron_shield")
            ? "One sturdy iron shield catches your eye."
            : "You've already claimed the best gear here."
        }`,
        actions: [
          ...(!ctx.inventory.includes("iron_shield")
            ? [{ id: "take_shield", label: "Take the iron shield" }]
            : []),
          ...(!ctx.inventory.includes("healing_potion")
            ? [{ id: "search_armory", label: "Search the shelves for supplies" }]
            : []),
          { id: "move:goblin_den", label: "Go to the Goblin Den" },
          { id: "move:underground_river", label: "Head to the Underground River" },
        ],
      };

    case "underground_river":
      return {
        narration: `A roaring underground river cuts through the cavern. The current is fierce and the rocks are slippery. ${
          ctx.inventory.includes("iron_shield")
            ? "Your shield could help brace against the current."
            : "Crossing without protection looks dangerous."
        }`,
        actions: [
          { id: "cross_river", label: "Attempt to cross the river" },
          { id: "move:armory", label: "Go to the Armory" },
          { id: "move:puzzle_chamber", label: "Go to the Puzzle Chamber" },
          { id: "move:boss_lair", label: "Follow the cavern to the Boss Lair" },
        ],
      };

    case "boss_lair":
      if (ctx.flags.defeatedBoss) {
        return {
          narration: `The Boss Lair is quiet. The shadow dragon lies defeated, its dark essence dissipating. The path to the Treasure Vault stands open.`,
          actions: [
            { id: "move:treasure_vault", label: "Enter the Treasure Vault" },
            { id: "move:puzzle_chamber", label: "Go back to the Puzzle Chamber" },
            { id: "move:underground_river", label: "Go to the Underground River" },
          ],
        };
      }
      return {
        narration: `${ctx.playerName} enters a vast chamber with scorched walls. A massive SHADOW DRAGON unfurls its wings and fixes its burning eyes upon you! "You dare enter my domain, mortal?"`,
        actions: [
          { id: "fight_boss", label: "Fight the Shadow Dragon!" },
          { id: "talk_boss", label: "Try to reason with the dragon" },
          { id: "move:puzzle_chamber", label: "Flee to the Puzzle Chamber" },
          { id: "move:underground_river", label: "Flee to the Underground River" },
        ],
        effects: { setFlags: { metBoss: true } },
      };

    case "treasure_vault":
      return {
        narration: `Golden light fills ${ctx.playerName}'s vision. Mountains of coins, gems, and ancient artifacts surround you. At the center, on a marble pedestal, rests the legendary Crown of Ages. You have conquered the dungeon!`,
        actions: [
          { id: "claim_crown", label: "Claim the Crown of Ages" },
        ],
      };

    default:
      return {
        narration: `${ctx.playerName} finds themselves in an unfamiliar place.`,
        actions: [{ id: "look_around", label: "Look around" }],
      };
  }
}

function getActionOutcome(ctx: DMContext, actionId: string): DMResponse {
  // Movement actions
  if (actionId.startsWith("move:")) {
    const targetRoom = actionId.slice(5);
    return {
      narration: `${ctx.playerName} moves onward...`,
      actions: [],
      effects: { moveToRoom: targetRoom },
    };
  }

  switch (actionId) {
    // Entrance
    case "look_around":
      return {
        narration: `${ctx.playerName} searches the area carefully. Among the rubble, you find a faintly glowing rune fragment!`,
        actions: [
          { id: "move:torch_corridor", label: "Take the left passage" },
          { id: "move:goblin_den", label: "Take the right passage" },
        ],
        effects: { addItems: ["rune_fragment"] },
      };

    // Torch Corridor
    case "dash_through":
      return {
        narration: `${ctx.playerName} sprints down the corridor! Darts whistle past — one catches your shoulder, another grazes your leg. You stumble into the Puzzle Chamber, bleeding.`,
        actions: [],
        effects: { hpChange: -2, moveToRoom: "puzzle_chamber" },
      };

    case "careful_advance":
      if (Math.random() > 0.5) {
        return {
          narration: `${ctx.playerName} moves slowly, testing each stone before stepping. You spot a pressure plate just in time and step over it. Safe — for now.`,
          actions: [
            { id: "move:puzzle_chamber", label: "Continue to the Puzzle Chamber" },
          ],
        };
      }
      return {
        narration: `${ctx.playerName} carefully picks a path through the corridor, but a hidden plate clicks underfoot. A volley of darts slams into you!`,
        actions: [
          { id: "move:puzzle_chamber", label: "Push on to the Puzzle Chamber" },
          { id: "move:entrance", label: "Stagger back to the Entrance" },
        ],
        effects: { hpChange: -1 },
      };

    // Goblin Den
    case "fight_goblins":
      return {
        narration: `${ctx.playerName} charges into battle! The goblins swarm you — one slashes your arm, another bites your leg. You cut them down, but you're badly wounded.`,
        actions: [
          { id: "move:entrance", label: "Return to the Entrance" },
          { id: "move:armory", label: "Proceed to the Armory" },
          { id: "search_den", label: "Search the goblin den" },
        ],
        effects: { hpChange: -4 },
      };

    case "sneak_past":
      if (Math.random() > 0.5) {
        return {
          narration: `${ctx.playerName} moves like a shadow, slipping past the distracted goblins undetected. You reach the far passage safely.`,
          actions: [
            { id: "move:armory", label: "Continue to the Armory" },
            { id: "move:entrance", label: "Sneak back to the Entrance" },
          ],
        };
      }
      return {
        narration: `A goblin spots you! "THERE!" They swarm you with crude daggers. You fight them off, but take serious hits.`,
        actions: [
          { id: "move:armory", label: "Push through to the Armory" },
          { id: "move:entrance", label: "Retreat to the Entrance" },
        ],
        effects: { hpChange: -3 },
      };

    case "search_den":
      return {
        narration: `Rummaging through the goblin hoard, you find a small healing potion tucked behind a pile of bones.`,
        actions: [
          { id: "move:entrance", label: "Go to the Entrance" },
          { id: "move:armory", label: "Go to the Armory" },
        ],
        effects: { addItems: ["healing_potion"] },
      };

    // Puzzle Chamber
    case "solve_puzzle":
      if (ctx.inventory.includes("rune_fragment")) {
        return {
          narration: `Using the rune fragment as a guide, ${ctx.playerName} aligns the rings: fire-water-earth. The mechanism clicks, runes flash green, and new passages reveal themselves!`,
          actions: [
            { id: "move:underground_river", label: "Descend to the Underground River" },
            { id: "move:boss_lair", label: "Enter the Boss Lair" },
            { id: "move:torch_corridor", label: "Go back" },
          ],
          effects: { setFlags: { solvedPuzzle: true, doorUnlocked: true } },
        };
      }
      return {
        narration: `${ctx.playerName} studies the rings but the symbols are too cryptic. Perhaps there's a clue elsewhere in the dungeon...`,
        actions: [
          { id: "move:torch_corridor", label: "Go back to search for clues" },
        ],
      };

    case "use_rune_fragment":
      return {
        narration: `The rune fragment fits perfectly into a slot on the mechanism! The rings spin on their own, aligning with a satisfying click. The puzzle is solved!`,
        actions: [
          { id: "move:underground_river", label: "Descend to the Underground River" },
          { id: "move:boss_lair", label: "Enter the Boss Lair" },
        ],
        effects: {
          setFlags: { solvedPuzzle: true, doorUnlocked: true },
          removeItems: ["rune_fragment"],
        },
      };

    // Armory
    case "take_shield":
      return {
        narration: `${ctx.playerName} lifts the iron shield. It's heavy but solid — this will come in handy.`,
        actions: [
          { id: "move:goblin_den", label: "Go to the Goblin Den" },
          { id: "move:underground_river", label: "Head to the Underground River" },
        ],
        effects: { addItems: ["iron_shield"] },
      };

    case "search_armory":
      return {
        narration: `Behind a collapsed shelf, you discover a dusty healing potion. Still good!`,
        actions: [
          { id: "move:goblin_den", label: "Go to the Goblin Den" },
          { id: "move:underground_river", label: "Head to the Underground River" },
        ],
        effects: { addItems: ["healing_potion"] },
      };

    // Underground River
    case "cross_river":
      if (ctx.inventory.includes("iron_shield")) {
        return {
          narration: `Using the iron shield to brace against the current, ${ctx.playerName} wades across the river safely. Well done!`,
          actions: [
            { id: "move:boss_lair", label: "Head to the Boss Lair" },
            { id: "move:puzzle_chamber", label: "Go to the Puzzle Chamber" },
          ],
        };
      }
      return {
        narration: `${ctx.playerName} plunges into the icy current. The river slams you against jagged rocks — you nearly drown before dragging yourself to the far bank, gasping and bleeding.`,
        actions: [
          { id: "move:boss_lair", label: "Head to the Boss Lair" },
          { id: "move:puzzle_chamber", label: "Go to the Puzzle Chamber" },
        ],
        effects: { hpChange: -4 },
      };

    // Boss Lair
    case "fight_boss":
      if (ctx.inventory.includes("iron_shield") && ctx.playerHp > 4) {
        return {
          narration: `An epic battle ensues! ${ctx.playerName} dodges jets of shadow flame, shield raised against the darkness. The dragon's claws tear through your defenses, but you land a devastating blow. The creature roars and dissolves into shadow. Victory — but at a cost.`,
          actions: [
            { id: "move:treasure_vault", label: "Enter the Treasure Vault!" },
          ],
          effects: { hpChange: -4, setFlags: { defeatedBoss: true } },
        };
      }
      if (ctx.playerHp > 6) {
        return {
          narration: `${ctx.playerName} fights the Shadow Dragon without protection! Its claws and shadow fire ravage you. Through sheer will, you land a killing blow — but you can barely stand.`,
          actions: [
            { id: "move:treasure_vault", label: "Enter the Treasure Vault!" },
          ],
          effects: { hpChange: -6, setFlags: { defeatedBoss: true } },
        };
      }
      return {
        narration: `${ctx.playerName} fights valiantly but the Shadow Dragon is too powerful! Its shadow breath engulfs you...`,
        actions: [],
        effects: { hpChange: -ctx.playerHp },
      };

    case "talk_boss":
      return {
        narration: `"Brave mortal," the dragon rumbles. "Few dare speak instead of strike. I will give you one chance. Bring me proof of wisdom — solve the ancient puzzle — and I may let you pass." ${
          ctx.flags.solvedPuzzle
            ? 'You show the dragon evidence of the solved puzzle. "Impressive... You have earned passage, mortal." The dragon steps aside.'
            : "You have no proof to offer. The dragon growls impatiently."
        }`,
        actions: ctx.flags.solvedPuzzle
          ? [
              { id: "move:treasure_vault", label: "Enter the Treasure Vault!" },
            ]
          : [
              { id: "fight_boss", label: "Fight the dragon" },
              { id: "move:puzzle_chamber", label: "Flee to solve the puzzle first" },
            ],
        effects: ctx.flags.solvedPuzzle
          ? { setFlags: { defeatedBoss: true } }
          : undefined,
      };

    // Treasure Vault (win)
    case "claim_crown":
      return {
        narration: `${ctx.playerName} lifts the Crown of Ages from its pedestal. A warm golden light fills the chamber. The dungeon trembles as ancient magic acknowledges its new master. YOU WIN! The dungeon's secrets are yours, brave adventurer!`,
        actions: [],
        effects: { addItems: ["crown_of_ages"] },
      };

    // Healing potion (generic)
    case "use_healing_potion":
      if (ctx.inventory.includes("healing_potion")) {
        return {
          narration: `${ctx.playerName} drinks the healing potion. A warm sensation spreads through your body as wounds close.`,
          actions: [],
          effects: { hpChange: 4, removeItems: ["healing_potion"] },
        };
      }
      return {
        narration: `You don't have a healing potion!`,
        actions: [],
      };

    default:
      return {
        narration: `${ctx.playerName} considers their options...`,
        actions: [{ id: "look_around", label: "Look around" }],
      };
  }
}
