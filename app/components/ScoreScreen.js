'use client';

import { useGameStore } from '../hooks/useGameState';

export default function ScoreScreen() {
  const { scores, reset, roomCode, endReason } = useGameStore();

  if (!scores) return <div>Calculating scores...</div>;

  const banner =
    endReason === 'victory' ? { text: '🏆 VICTORY — You hit the exit target!', cls: 'victory' }
    : endReason === 'bankruptcy' ? { text: '💸 BANKRUPT — Burned through all your runway', cls: 'bankrupt' }
    : endReason === 'critical_failure' ? { text: '🔥 MELTDOWN — Errors hit critical', cls: 'bankrupt' }
    : null;

  const handlePlayAgain = () => {
    // The host should ideally restart the room, but for now we'll just reset client state
    // and let them create a new room or re-join.
    reset();
    window.location.reload();
  };

  return (
    <div className="score-screen">
      <div className="score-card">
        <h1>Round Complete!</h1>
        {banner && <div className={`end-banner ${banner.cls}`}>{banner.text}</div>}
        <div className="final-grade grade-animation">
          {scores.grade}
        </div>

        <div className="score-details">
          <div className="score-row">
            <span>Uptime (Errors)</span>
            <span>{scores.uptimeScore}</span>
          </div>
          <div className="score-row">
            <span>Growth (Users)</span>
            <span>{scores.growthScore}</span>
          </div>
          <div className="score-row">
            <span>Stability (Latency)</span>
            <span>{scores.stabilityScore}</span>
          </div>
          <div className="score-row">
            <span>Efficiency (Revenue/User)</span>
            <span>{scores.efficiencyScore}</span>
          </div>
          <div className="score-row bonus">
            <span>Objectives Bonus ({scores.objectivesCompleted} done)</span>
            <span>+{scores.objectiveBonus}</span>
          </div>
          <div className="score-row total">
            <span>Total Score</span>
            <span>{scores.totalScore}</span>
          </div>
        </div>

        <div className="team-stats">
          <h2>Team Performance</h2>
          <div className="team-stats-grid">
            {Object.entries(scores.playerStats || {}).map(([id, stat]) => (
              <div key={id} className="player-stat-card">
                <div className="player-stat-name">{stat.name}</div>
                <div className="player-stat-role">{stat.role}</div>
                <div className="player-stat-metrics">
                  <span>⚙️ {stat.actionsUsed} Actions</span>
                  <span>🤝 {stat.delegationsSent} Delegations</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="company-stats">
          <h2>Final Company Stats</h2>
          <div className="final-metrics">
            <span>👥 {scores.finalMetrics.users} Users</span>
            <span>💰 ${Math.round(scores.finalMetrics.revenue)} Revenue</span>
            <span>✨ {scores.upgradesBought} Upgrades Bought</span>
          </div>
        </div>

        <button className="play-again-btn" onClick={handlePlayAgain}>
          Start New Company
        </button>
      </div>
    </div>
  );
}
