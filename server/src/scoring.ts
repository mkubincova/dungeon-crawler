import type { GameState, ScoreEntry } from "../../shared/types.js";
import { getTheme } from "../../shared/themes/index.js";

export function calculateScores(state: GameState): ScoreEntry[] {
  const theme = getTheme(state.theme);
  const maxHpRemaining = Math.max(...state.players.map((p) => p.hp));

  return state.players.map((player) => {
    const reachedGoal =
      player.currentRoomId === theme.goalRoom && state.sharedFlags.defeatedBoss;
    const survived = player.status === "alive";
    const objectiveComplete = player.objectiveComplete;

    let totalScore = 0;
    if (objectiveComplete) totalScore += 3;
    if (reachedGoal) totalScore += 2;
    if (survived) totalScore += 1;
    if (player.hp === maxHpRemaining && player.hp > 0) totalScore += 1;

    return {
      playerId: player.id,
      playerName: player.name,
      objective: player.objective ?? { id: "none", description: "No objective" },
      objectiveComplete,
      reachedGoal,
      survived,
      hpRemaining: player.hp,
      totalScore,
    };
  });
}
