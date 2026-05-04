'use client';

import { useRef, useEffect } from 'react';
import { useGameStore } from '../hooks/useGameState';
import { ROLES } from '../lib/gameConfig';

export default function EventFeed({ players }) {
  const { eventHistory, actionHistory } = useGameStore();
  const listRef = useRef(null);

  // Combine events and actions, sorted by timestamp
  const allItems = [
    ...eventHistory.map(e => ({ ...e, type: 'event' })),
    ...actionHistory.map(a => ({ ...a, type: 'action' })),
  ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)).slice(-30);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [allItems.length]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="event-feed">
      <div className="event-feed-header">
        <span>📡 LIVE FEED</span>
        <span style={{ color: 'var(--text-muted)' }}>{allItems.length}</span>
      </div>

      <div className="event-feed-list" ref={listRef}>
        {allItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: '0.45rem', color: 'var(--text-muted)' }}>
            Waiting for events...
          </div>
        )}
        {allItems.map((item, i) => (
          <div
            key={`${item.type}-${i}`}
            className={`event-item ${item.type === 'event' ? `severity-${item.severity || 'info'}` : 'type-action'}`}
          >
            <span className="event-time">[{formatTime(item.timestamp)}]</span>{' '}
            <span className="event-text">
              {item.type === 'event'
                ? `${item.name || item.eventId} — ${item.description || ''}`
                : `${item.actionEmoji || '⚡'} ${item.playerName} used ${item.actionName}`
              }
            </span>
          </div>
        ))}
      </div>

      {/* Player list */}
      {players && Object.keys(players).length > 0 && (
        <div className="player-list-sidebar">
          <h4>👥 TEAM</h4>
          {Object.values(players).map((p) => {
            const role = Object.values(ROLES).find(r => r.id === p.role);
            return (
              <div key={p.id} className="player-mini">
                <span className="role-dot" style={{ background: role?.color || '#666' }} />
                <span>{role?.emoji || '?'}</span>
                <span>{p.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
