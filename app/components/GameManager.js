'use client';

import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import HomeScreen from './HomeScreen';
import LobbyScreen from './LobbyScreen';
import GameScreen from './GameScreen';
import ScoreScreen from './ScoreScreen';

export default function GameManager() {
  // Initialize the socket connection and its listeners
  const { socket } = useSocket();
  const { gamePhase, notification } = useGameStore();

  const isConnected = socket?.connected;

  // Connection pill is only useful before/after a round. Hide during play
  // to avoid overlapping the metrics bar.
  const showConnection = gamePhase === 'home' || gamePhase === 'lobby';

  return (
    <>
      {showConnection && (
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast ${notification.type || ''}`}>
          {notification.message}
        </div>
      )}

      {/* Phase-based rendering */}
      {gamePhase === 'home' && <HomeScreen />}
      {gamePhase === 'lobby' && <LobbyScreen />}
      {gamePhase === 'playing' && <GameScreen />}
      {gamePhase === 'scoring' && <ScoreScreen />}
    </>
  );
}
