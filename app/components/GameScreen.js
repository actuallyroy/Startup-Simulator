'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import { ACTIONS, ROLES, METRICS_CONFIG, EVENTS, WORLD_STAGES } from '../lib/gameConfig';
import MetricsBar from './MetricsBar';
import ActionPanel from './ActionPanel';
import EventFeed from './EventFeed';
import PixelWorld from './PixelWorld';

export default function GameScreen() {
  const { metrics, activeEvents, tick, stage, timeRemaining, players } = useGameStore();
  const [flashRed, setFlashRed] = useState(false);
  const prevErrors = useRef(metrics?.errors || 0);

  // Flash red on error spike
  useEffect(() => {
    if (metrics && metrics.errors > prevErrors.current + 10) {
      setFlashRed(true);
      setTimeout(() => setFlashRed(false), 500);
    }
    prevErrors.current = metrics?.errors || 0;
  }, [metrics?.errors]);

  if (!metrics) {
    return (
      <div className="home-container">
        <h2 style={{ color: 'var(--accent-blue)', animation: 'pulse 1s infinite' }}>
          ⏳ Waiting for game state...
        </h2>
      </div>
    );
  }

  return (
    <div className="game-container">
      <MetricsBar
        metrics={metrics}
        timeRemaining={timeRemaining}
        tick={tick}
        stage={stage}
      />
      <div className={`canvas-area ${flashRed ? 'flash-red' : ''}`}>
        <PixelWorld
          metrics={metrics}
          stage={stage}
          activeEvents={activeEvents}
          players={players}
        />
      </div>
      <EventFeed players={players} />
      <ActionPanel />
    </div>
  );
}
