import type { GameState, ScoreEntry } from "../../../shared/types.js";

interface Props {
  scores: ScoreEntry[];
  gameState: GameState;
  myPlayerId: string | null;
  onPlayAgain: () => void;
}

export function ScoreBoard({ scores, gameState, myPlayerId, onPlayAgain }: Props) {
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sorted[0];
  const isWon = gameState.status === "won";

  return (
    <div className="scoreboard">
      <div className="scoreboard-content">
        <h1 className="scoreboard-title">
          {isWon ? "Victory!" : "Game Over"}
        </h1>

        {winner && (
          <div className="winner-banner">
            <span className="trophy">🏆</span>
            <span>
              {winner.playerName} wins! ({winner.totalScore} pts)
            </span>
          </div>
        )}

        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Objective</th>
              <th>Goal</th>
              <th>Survived</th>
              <th>HP</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const isMe = entry.playerId === myPlayerId;
              return (
                <tr
                  key={entry.playerId}
                  className={`score-row ${isMe ? "me" : ""} ${entry.playerId === winner?.playerId ? "winner" : ""}`}
                >
                  <td>
                    {entry.playerName}
                    {isMe ? " (You)" : ""}
                  </td>
                  <td>
                    {entry.objectiveComplete ? (
                      <span className="score-check">✓ +3</span>
                    ) : (
                      <span className="score-cross">✗ 0</span>
                    )}
                  </td>
                  <td>
                    {entry.reachedGoal ? (
                      <span className="score-check">✓ +2</span>
                    ) : (
                      <span className="score-cross">✗ 0</span>
                    )}
                  </td>
                  <td>
                    {entry.survived ? (
                      <span className="score-check">✓ +1</span>
                    ) : (
                      <span className="score-cross">✗ 0</span>
                    )}
                  </td>
                  <td>{entry.hpRemaining}</td>
                  <td className="score-total">{entry.totalScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="objectives-reveal">
          <h3>Objectives Revealed</h3>
          {sorted.map((entry) => (
            <div key={entry.playerId} className="objective-reveal-row">
              <span className="objective-player">{entry.playerName}:</span>
              <span
                className={`objective-desc ${entry.objectiveComplete ? "complete" : "incomplete"}`}
              >
                "{entry.objective.description}"
                {entry.objectiveComplete ? " ✓" : " ✗"}
              </span>
            </div>
          ))}
        </div>

        <button className="btn-primary play-again" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
