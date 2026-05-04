'use client';

import { useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import HomeScreen from './HomeScreen';
import LobbyScreen from './LobbyScreen';
import GameScreen from './GameScreen';
import ScoreScreen from './ScoreScreen';

export default function GameManager() {
  const { socket, isConnected } = useSocket();
  const {
    gamePhase, setSocketId, setRoom, setGamePhase,
    updateGameState, addEvent, addAction, setScores, notification,
  } = useGameStore();

  // Set socket ID when connected
  useEffect(() => {
    if (socket && isConnected) {
      setSocketId(socket.id);
    }
  }, [socket, isConnected, setSocketId]);

  // Room update handler
  const handleRoomUpdate = useCallback((room) => {
    setRoom(room);
  }, [setRoom]);
  useSocketEvent('room:update', handleRoomUpdate);

  // Game start handler
  const handleGameStart = useCallback(() => {
    setGamePhase('playing');
  }, [setGamePhase]);
  useSocketEvent('game:start', handleGameStart);

  // Game state handler
  const handleGameState = useCallback((state) => {
    updateGameState(state);
  }, [updateGameState]);
  useSocketEvent('game:state', handleGameState);

  // Game event handler
  const handleGameEvent = useCallback((event) => {
    const { EVENTS } = require('../lib/gameConfig');
    const eventData = EVENTS[event.eventId];
    if (eventData) {
      addEvent({ ...eventData, ...event });
    }
  }, [addEvent]);
  useSocketEvent('game:event', handleGameEvent);

  // Game action handler
  const handleGameAction = useCallback((action) => {
    addAction(action);
  }, [addAction]);
  useSocketEvent('game:action', handleGameAction);

  // Game end handler
  const handleGameEnd = useCallback((data) => {
    setScores(data.scores);
  }, [setScores]);
  useSocketEvent('game:end', handleGameEnd);

  return (
    <>
      {/* Connection Status */}
      <div className="connection-status">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        {isConnected ? 'ONLINE' : 'OFFLINE'}
      </div>

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
