'use client';

import { useGameStore } from '../hooks/useGameState';

export default function ScoreScreen() {
  const { scores, reset } = useGameStore();

  if (!scores) return null;

  const handlePlayAgain = () => {
    reset();
  };

  return (
    <div className="score-overlay">
      <div className="score-card animate-slide-up">
        <h2>🏁 ROUND COMPLETE</h2>
        <div className={`score-grade grade-${scores.grade}`}>
          {scores.grade}
        </div>
        <div className="score-total">
          Total Score: {scores.totalScore}/100
        </div>

        <div className="score-breakdown">
          <div className="score-item">
            <div className="score-label">🛡️ Uptime</div>
            <div className="score-value" style={{ color: scores.uptimeScore > 70 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {scores.uptimeScore}
            </div>
          </div>
          <div className="score-item">
            <div className="score-label">📈 Growth</div>
            <div className="score-value" style={{ color: scores.growthScore > 50 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
              {scores.growthScore}
            </div>
          </div>
          <div className="score-item">
            <div className="score-label">⚡ Stability</div>
            <div className="score-value" style={{ color: scores.stabilityScore > 70 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {scores.stabilityScore}
            </div>
          </div>
          <div className="score-item">
            <div className="score-label">💰 Efficiency</div>
            <div className="score-value" style={{ color: scores.efficiencyScore > 50 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
              {scores.efficiencyScore}
            </div>
          </div>
        </div>

        {/* Final metrics */}
        {scores.finalMetrics && (
          <div style={{
            fontSize: '0.45rem', color: 'var(--text-muted)', marginBottom: '1rem',
            display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <span>👥 {scores.finalMetrics.users} users</span>
            <span>🐛 {scores.finalMetrics.errors} errors</span>
            <span>⚡ {Math.round(scores.finalMetrics.latency)}ms</span>
            <span>💰 ${scores.finalMetrics.revenue}</span>
          </div>
        )}

        {/* Player stats */}
        {scores.playerStats && Object.values(scores.playerStats).length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>TEAM</div>
            {Object.values(scores.playerStats).map((p, i) => (
              <div key={i} style={{
                fontSize: '0.45rem', color: 'var(--text-secondary)', padding: '0.2rem',
              }}>
                {p.name} ({p.role}) — {p.actionsUsed} actions
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary" onClick={handlePlayAgain}>
          🔄 PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
