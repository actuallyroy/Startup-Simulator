'use client';

import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import { ROLES } from '../lib/gameConfig';

export default function LobbyScreen() {
  const { socket } = useSocket();
  const { room, roomCode, isHost, myRole, playerName, setNotification, setRoom } = useGameStore();

  if (!room) return null;

  const players = Object.values(room.players);
  const takenRoles = players.filter(p => p.id !== socket?.id).map(p => p.role).filter(Boolean);
  const myPlayer = room.players[socket?.id];
  const isReady = myPlayer?.ready;

  const handleSelectRole = (roleId) => {
    if (takenRoles.includes(roleId)) return;
    socket.emit('room:selectRole', { roomCode, roleId }, (res) => {
      if (!res.success) setNotification({ message: res.error, type: 'error' });
    });
  };

  const handleReady = () => {
    if (!myRole) {
      setNotification({ message: 'Select a role first!', type: 'error' });
      return;
    }
    socket.emit('room:ready', { roomCode, ready: !isReady }, (res) => {
      if (!res.success) setNotification({ message: res.error, type: 'error' });
    });
  };

  const handleStart = () => {
    socket.emit('room:start', { roomCode }, (res) => {
      if (!res.success) setNotification({ message: res.error, type: 'error' });
    });
  };

  const allReady = players.length >= 1 && players.every(p => p.role && p.ready);

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h2>⚡ GAME LOBBY</h2>
        <div className="room-code-display">{roomCode}</div>
        <p style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Share this code with your team
        </p>
      </div>

      <div className="lobby-content">
        {/* Players */}
        <div className="lobby-section">
          <h3>👥 PLAYERS ({players.length}/5)</h3>
          {players.map((p) => {
            const role = p.role ? Object.values(ROLES).find(r => r.id === p.role) : null;
            return (
              <div key={p.id} className="player-slot animate-slide-up">
                <span className="player-name">
                  {p.name} {p.id === room.host ? '👑' : ''}
                </span>
                <span className="player-role">
                  {role ? `${role.emoji} ${role.name}` : 'No role'}
                </span>
                <span className="ready-badge">
                  {p.ready ? '✅ READY' : '⏳'}
                </span>
              </div>
            );
          })}
          {Array.from({ length: 5 - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="player-slot" style={{ opacity: 0.3 }}>
              <span className="player-name">Empty slot</span>
            </div>
          ))}
        </div>

        {/* Roles */}
        <div className="lobby-section">
          <h3>🎭 SELECT ROLE</h3>
          <div className="role-grid">
            {Object.values(ROLES).map((role) => {
              const taken = takenRoles.includes(role.id);
              const selected = myRole === role.id;
              return (
                <div
                  key={role.id}
                  className={`role-card ${selected ? 'selected' : ''} ${taken ? 'taken' : ''}`}
                  onClick={() => !taken && handleSelectRole(role.id)}
                >
                  <span className="role-emoji">{role.emoji}</span>
                  <div className="role-info">
                    <div className="role-name" style={{ color: role.color }}>{role.name}</div>
                    <div className="role-desc">{role.description}</div>
                  </div>
                  {taken && <span style={{ fontSize: '0.45rem', color: 'var(--accent-red)' }}>TAKEN</span>}
                  {selected && <span style={{ fontSize: '0.45rem', color: 'var(--accent-green)' }}>YOU</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lobby-actions">
        <button className={`btn-secondary`} onClick={handleReady} disabled={!myRole}>
          {isReady ? '❌ NOT READY' : '✅ READY UP'}
        </button>
        {isHost && (
          <button className="btn-primary" onClick={handleStart} disabled={!allReady}>
            🎮 START GAME
          </button>
        )}
      </div>
    </div>
  );
}
