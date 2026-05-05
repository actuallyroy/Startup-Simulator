'use client';

import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';

export default function HomeScreen() {
  const { socket } = useSocket();
  const { setPlayerName, setRoomCode, setRoom, setGamePhase } = useGameStore();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!socket) return;
    if (!name.trim()) { setError('Enter your name first'); return; }
    setLoading(true);
    setError('');
    socket.emit('room:create', { playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        setPlayerName(name.trim());
        setRoomCode(res.roomCode);
        setRoom(res.room);
        setGamePhase('lobby');
      } else {
        setError(res.error || 'Failed to create room');
      }
    });
  };

  const handleJoin = () => {
    if (!socket) return;
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (!joinCode.trim()) { setError('Enter a room code'); return; }
    setLoading(true);
    setError('');
    socket.emit('room:join', { roomCode: joinCode.trim().toUpperCase(), playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        setPlayerName(name.trim());
        setRoomCode(res.roomCode);
        setRoom(res.room);
        setGamePhase(res.midGame ? 'playing' : 'lobby');
      } else {
        setError(res.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="home-container">
      <h1 className="home-title">STARTUP</h1>
      <p className="home-subtitle">
        Build your startup. Ship features.<br />
        Fight bugs. Survive the chaos.
      </p>

      <div className="home-actions">
        <div className="input-group">
          <label>YOUR NAME</label>
          <input
            className="pixel-input"
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
          />
        </div>

        {error && <div className="notification-toast error" style={{ position: 'relative', top: 0, left: 0, transform: 'none' }}>{error}</div>}

        <button className="btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? '...' : '🚀 CREATE ROOM'}
        </button>

        <div className="divider"><span>OR</span></div>

        <div className="join-row">
          <input
            className="pixel-input"
            type="text"
            placeholder="ROOM CODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <button className="btn-secondary" onClick={handleJoin} disabled={loading}>
            JOIN
          </button>
        </div>
      </div>

      {/* Decorative floating elements */}
      <div style={{ position: 'absolute', bottom: '2rem', fontSize: '0.45rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        ⚡ Build fast. Break things. Fix them faster.
      </div>
    </div>
  );
}
