'use client';

import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import { ACTIONS, ACTION_CATEGORIES, ROLE_BONUSES, GAME_CONFIG, METRICS_CONFIG, IDEA_CATEGORIES } from '../lib/gameConfig';

// Format an effect delta for display: "👥 +80", "🐛 −15", "💰 −$10".
function formatEffect(metric, delta) {
  const cfg = METRICS_CONFIG[metric];
  if (!cfg) return null;
  const sign = delta > 0 ? '+' : '−';
  const abs = Math.abs(delta);
  const value = cfg.unit === '$' ? `$${abs}` : cfg.unit === 'ms' ? `${abs}ms` : cfg.unit === '%' ? `${abs}%` : abs;
  return { emoji: cfg.emoji, label: `${sign}${value}`, isGood: isPositive(metric, delta) };
}

// "Good" depends on the metric — fewer errors/latency is good.
function isPositive(metric, delta) {
  const inverted = metric === 'errors' || metric === 'latency';
  return inverted ? delta < 0 : delta > 0;
}

export default function ActionPanel() {
  const { socket } = useSocket();
  const {
    roomCode, myRole, myActionsUsed, setNotification,
    activeActionTab, setActiveActionTab, players, socketId,
    myBusyRemaining, myBusyTotal, myBusyAction, phase, actionCounts,
    myMotivation, mySalary, preparationPoints,
  } = useGameStore();
  const [delegateMode, setDelegateMode] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  if (!myRole) return null;

  const roleBonusActions = ROLE_BONUSES[myRole] || [];
  const ideaPhase = phase === 'idea';
  // During idea phase show three sub-tabs (product/research/pitch). Otherwise the normal 6 categories.
  const categoryKeys = ideaPhase ? Object.keys(IDEA_CATEGORIES) : Object.keys(ACTION_CATEGORIES);
  const categories = ideaPhase ? IDEA_CATEGORIES : ACTION_CATEGORIES;
  // If the current tab isn't valid for this phase, default to the first one.
  const effectiveTab = categoryKeys.includes(activeActionTab) ? activeActionTab : categoryKeys[0];
  const tabActions = ideaPhase
    ? Object.values(ACTIONS).filter(a => a.phase === 'idea' && a.category === effectiveTab)
    : Object.values(ACTIONS).filter(a => a.category === effectiveTab && a.phase !== 'idea');

  // Estimated funding from current prep points
  const fundingEstimate = ideaPhase ? Math.min(
    GAME_CONFIG.FUNDING_CAP,
    GAME_CONFIG.FUNDING_BASE + (preparationPoints || 0) * GAME_CONFIG.FUNDING_PER_POINT,
  ) : 0;

  const isBusy = myBusyRemaining > 0;
  const busyAction = myBusyAction ? ACTIONS[myBusyAction] : null;
  const busyPct = myBusyTotal > 0 ? ((myBusyTotal - myBusyRemaining) / myBusyTotal) * 100 : 0;

  const handleAction = (actionId) => {
    if (delegateMode) return;
    if (!socket) return;
    socket.emit('game:action', { roomCode, actionId }, (res) => {
      if (!res.success) {
        setNotification({
          message: res.cooldownRemaining ? `Busy: ${res.cooldownRemaining}s remaining` : res.error,
          type: 'error',
        });
      }
    });
  };

  const handleDelegate = (actionId) => setDelegateMode(actionId);
  const handleDelegateTarget = (targetId) => {
    if (!socket || !delegateMode) return;
    socket.emit('game:delegate', { roomCode, toPlayerId: targetId, actionId: delegateMode }, (res) => {
      if (!res.success) setNotification({ message: res.error, type: 'error' });
      else setNotification({ message: '📤 Delegation sent!', type: 'success' });
    });
    setDelegateMode(null);
  };

  const otherPlayers = Object.entries(players || {}).filter(([id]) => id !== socketId);
  const maxedOut = myActionsUsed >= GAME_CONFIG.MAX_ACTIONS_PER_ROUND;

  return (
    <div className={`action-panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="action-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Show actions' : 'Hide actions'}
      >
        {collapsed ? '▲' : '▼'}
      </button>
      {/* Tab Bar */}
      <div className="action-tabs">
        {categoryKeys.map((key) => (
          <button
            key={key}
            className={`action-tab ${effectiveTab === key ? 'active' : ''}`}
            onClick={() => setActiveActionTab(key)}
          >
            {categories[key].name}
          </button>
        ))}
        <span className="actions-counter">
          <span className={`motivation-pill ${myMotivation < 40 ? 'low' : myMotivation > 80 ? 'high' : ''}`}
            title={`Salary $${mySalary}/tick → motivation ${myMotivation}`}>
            {myMotivation > 80 ? '🔥' : myMotivation < 40 ? '😞' : '😐'} {myMotivation}
          </span>
          ⚙️ {myActionsUsed}/{GAME_CONFIG.MAX_ACTIONS_PER_ROUND}
        </span>
      </div>
      {ideaPhase && (
        <div className="prep-banner">
          <span className="prep-pill">💡 Pre-Launch — work on Product / Research / Pitch, then pitch investors</span>
          <span className="prep-funding">
            <span className="prep-points">📊 {preparationPoints || 0} prep pts</span>
            <span className="prep-funding-amount">→ ~${fundingEstimate.toLocaleString()} funding</span>
          </span>
        </div>
      )}

      {/* Global busy banner */}
      {isBusy && busyAction && (
        <div className="busy-banner">
          <span className="busy-emoji">{busyAction.emoji}</span>
          <span className="busy-text">
            <strong>{busyAction.name}</strong> — {myBusyRemaining}s remaining
          </span>
          <div className="busy-progress">
            <div className="busy-progress-fill" style={{ width: `${busyPct}%` }} />
          </div>
        </div>
      )}

      {/* Delegation target selector */}
      {delegateMode && (
        <div className="delegation-bar">
          <span>🤝 Delegate <strong>{ACTIONS[delegateMode]?.name}</strong> to:</span>
          {otherPlayers.map(([id, p]) => (
            <button key={id} className="delegate-target-btn" onClick={() => handleDelegateTarget(id)}>
              {p.name}
            </button>
          ))}
          <button className="delegate-cancel-btn" onClick={() => setDelegateMode(null)}>✕</button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {tabActions.map((action) => {
          const locked = action.roleLock && action.roleLock !== myRole;
          const used = actionCounts?.[action.id] || 0;
          const exhausted = action.maxUses && used >= action.maxUses;
          const motLocked = action.motivationFloor && myMotivation < action.motivationFloor;
          const disabled = locked || isBusy || maxedOut || exhausted || motLocked;
          const hasBonus = roleBonusActions.includes(action.id);
          // Adjusted duration based on motivation
          const motMul = 1 + (1 - myMotivation / 100) * 0.6;
          const adjDuration = Math.max(1, Math.ceil(action.cooldown * motMul));

          // Effect chips, sorted: positives first, negatives last
          const effectChips = Object.entries(action.effects || {})
            .map(([m, d]) => ({ metric: m, ...formatEffect(m, d) }))
            .filter(Boolean)
            .sort((a, b) => (a.isGood === b.isGood ? 0 : a.isGood ? -1 : 1));

          const titleText = locked
            ? `${action.roleLock.toUpperCase()} only — ${action.description}`
            : `${action.description}${hasBonus ? ' (1.5x Role Bonus!)' : ''}`;

          return (
            <div key={action.id} className={`action-btn-wrapper ${hasBonus ? 'has-bonus' : ''}`}>
              <button
                className={`action-btn ${disabled ? 'disabled' : ''} ${hasBonus ? 'bonus' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => handleAction(action.id)}
                disabled={disabled}
                title={titleText}
              >
                <div className="action-header">
                  <span className="action-emoji">{action.emoji}</span>
                  <span className="action-duration">
                    {action.maxUses ? `${used}/${action.maxUses}` : `⏱ ${adjDuration}s`}
                  </span>
                </div>
                <span className="action-name">{action.name}</span>
                <div className="action-effects">
                  {effectChips.map((e) => (
                    <span key={e.metric} className={`effect-chip ${e.isGood ? 'good' : 'bad'}`}>
                      <span className="effect-icon">{e.emoji}</span>
                      <span className="effect-value">{e.label}</span>
                    </span>
                  ))}
                </div>
                {hasBonus && !locked && <span className="bonus-badge">1.5x</span>}
                {locked && <span className="lock-badge">🔒 {action.roleLock.toUpperCase()}</span>}
                {motLocked && !locked && <span className="lock-badge mot-lock">😐 {action.motivationFloor}+ MOT</span>}
              </button>
              {otherPlayers.length > 0 && !locked && !isBusy && (
                <button
                  className="delegate-btn"
                  onClick={() => handleDelegate(action.id)}
                  title="Delegate to teammate"
                >
                  🤝
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="action-effects-hint">
        <span className="effects-hint-text">
          {categories[effectiveTab]?.description || ''}
          {!ideaPhase && hasBonus(effectiveTab, myRole) ? ' • ⭐ Your role gets a bonus here!' : ''}
        </span>
      </div>
    </div>
  );
}

function hasBonus(category, role) {
  const bonusActions = ROLE_BONUSES[role] || [];
  return Object.values(ACTIONS).some(a => a.category === category && bonusActions.includes(a.id));
}
