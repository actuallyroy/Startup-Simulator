'use client';

import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import { UPGRADES, EVENT_RESPONSES } from '../lib/gameConfig';

export default function EventFeed() {
  const { socket } = useSocket();
  const { roomCode, actionHistory, activeEvents, objectives, upgrades, metrics,
    players, socketId, objectivesCompleted, myRole } = useGameStore();
  const [sidebarTab, setSidebarTab] = useState('feed'); // feed | objectives | upgrades | team
  const [collapsed, setCollapsed] = useState(false);

  const handleUpgrade = (upgradeId) => {
    if (!socket) return;
    socket.emit('game:upgrade', { roomCode, upgradeId }, (res) => {
      if (!res.success) {
        // Handle error silently — toast will show
      }
    });
  };

  const availableUpgrades = Object.values(UPGRADES).filter(u => !upgrades.includes(u.id))
    .sort((a, b) => a.tier - b.tier || a.cost - b.cost);

  const activeObjectives = (objectives || []).filter(o => !o.completed);
  const completedObjectives = (objectives || []).filter(o => o.completed);

  return (
    <div className={`event-feed ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '◀' : '▶'}
      </button>
      {/* Sidebar tabs */}
      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${sidebarTab === 'feed' ? 'active' : ''}`}
          onClick={() => setSidebarTab('feed')}>📡 Feed</button>
        <button className={`sidebar-tab ${sidebarTab === 'objectives' ? 'active' : ''}`}
          onClick={() => setSidebarTab('objectives')}>🎯 Goals</button>
        <button className={`sidebar-tab ${sidebarTab === 'upgrades' ? 'active' : ''}`}
          onClick={() => setSidebarTab('upgrades')}>🏪 Shop</button>
        <button className={`sidebar-tab ${sidebarTab === 'team' ? 'active' : ''}`}
          onClick={() => setSidebarTab('team')}>👥 Team</button>
      </div>

      {/* Feed Tab */}
      {sidebarTab === 'feed' && (
        <div className="feed-content">
          <div className="feed-scroll">
            {actionHistory.length === 0 && (
              <div className="feed-empty">Waiting for actions...</div>
            )}
            {[...actionHistory].reverse().map((item, i) => (
              <div key={i} className={`feed-item ${item.hasRoleBonus ? 'bonus' : ''}`}>
                <span className="feed-emoji">{item.actionEmoji}</span>
                <span className="feed-text">
                  <strong>{item.playerName}</strong> {item.actionName}
                  {item.hasRoleBonus && <span className="feed-bonus">★</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objectives Tab */}
      {sidebarTab === 'objectives' && (
        <div className="objectives-content">
          <div className="objectives-header">
            🎯 Active Objectives
            <span className="objectives-count">{objectivesCompleted} completed</span>
          </div>
          {activeObjectives.map((obj) => (
            <div key={obj.id} className="objective-card">
              <div className="objective-desc">{obj.description}</div>
              {obj.sustainTicks > 0 && (
                <div className="objective-progress">
                  <div className="progress-bar">
                    <div className="progress-fill"
                      style={{ width: `${Math.min(100, ((obj.sustainProgress || 0) / obj.sustainTicks) * 100)}%` }} />
                  </div>
                  <span className="progress-text">{obj.sustainProgress || 0}/{obj.sustainTicks}s</span>
                </div>
              )}
              <div className="objective-reward">
                💰 +${obj.reward?.revenue || 0} • ⭐ +{obj.reward?.score || 0} pts
              </div>
            </div>
          ))}
          {completedObjectives.length > 0 && (
            <>
              <div className="objectives-header completed-header">✅ Completed</div>
              {completedObjectives.map((obj) => (
                <div key={obj.id} className="objective-card completed">
                  <div className="objective-desc">{obj.description}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Upgrades Tab */}
      {sidebarTab === 'upgrades' && (
        <div className="upgrades-content">
          <div className="upgrades-header">
            🏪 Upgrade Shop
            <span className="revenue-display">💰 ${Math.round(metrics?.revenue || 0)}</span>
          </div>
          {availableUpgrades.map((upgrade) => {
            const canAfford = (metrics?.revenue || 0) >= upgrade.cost;
            return (
              <div key={upgrade.id} className={`upgrade-card tier-${upgrade.tier} ${canAfford ? '' : 'cant-afford'}`}>
                <div className="upgrade-info">
                  <span className="upgrade-emoji">{upgrade.emoji}</span>
                  <div className="upgrade-details">
                    <div className="upgrade-name">{upgrade.name}</div>
                    <div className="upgrade-desc">{upgrade.description}</div>
                  </div>
                </div>
                <button
                  className="upgrade-buy-btn"
                  onClick={() => handleUpgrade(upgrade.id)}
                  disabled={!canAfford}
                >
                  ${upgrade.cost}
                </button>
              </div>
            );
          })}
          {availableUpgrades.length === 0 && (
            <div className="feed-empty">All upgrades purchased! 🎉</div>
          )}
          {/* Show purchased */}
          {upgrades.length > 0 && (
            <>
              <div className="upgrades-header purchased-header">✅ Purchased</div>
              {upgrades.map(id => {
                const u = UPGRADES[id];
                return u ? (
                  <div key={id} className="upgrade-card purchased">
                    <span>{u.emoji} {u.name}</span>
                  </div>
                ) : null;
              })}
            </>
          )}
        </div>
      )}

      {/* Team Tab */}
      {sidebarTab === 'team' && (
        <div className="team-content">
          <div className="team-header">
            👥 Team {myRole === 'hr' && <span className="hr-tag">HR — drag to set salaries</span>}
          </div>
          {Object.entries(players || {}).map(([id, p]) => {
            const motMood = (p.motivation || 70) > 80 ? '🔥' : (p.motivation || 70) < 40 ? '😞' : '😐';
            const onSalary = (e) => {
              const val = Number(e.target.value);
              if (!socket) return;
              socket.emit('game:setSalary', { roomCode, targetPlayerId: id, salary: val }, () => {});
            };
            return (
              <div key={id} className={`team-card ${id === socketId ? 'is-me' : ''}`}>
                <div className="team-card-row">
                  <span className="member-status">●</span>
                  <span className="member-name">{p.name}{id === socketId ? ' (You)' : ''}</span>
                  <span className="member-role">{p.role}</span>
                </div>
                <div className="team-card-row">
                  <span className="member-mot" title={`Motivation ${p.motivation || 70}`}>
                    {motMood} <span className="mot-value">{Math.round(p.motivation || 70)}</span>
                    <span className="mot-bar"><span className="mot-bar-fill" style={{width: `${p.motivation || 70}%`}} /></span>
                  </span>
                </div>
                <div className="team-card-row salary-row">
                  <span className="salary-label">$ {p.salary || 50}/tick</span>
                  {myRole === 'hr' && (
                    <input
                      type="range" min="20" max="250" step="5"
                      defaultValue={p.salary || 50}
                      onChange={onSalary}
                      className="salary-slider"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
