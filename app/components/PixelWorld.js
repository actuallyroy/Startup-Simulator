'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../hooks/useGameState';
import { subscribe as sceneSubscribe } from '../lib/sceneBus';

export default function PixelWorld() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const lastEmittedRef = useRef(0);
  const { socket } = useSocket();

  useEffect(() => {
    let cancelled = false;
    let unsub = null;

    const mount = async () => {
      if (!containerRef.current || gameRef.current) return;
      // Dynamic import — Phaser touches window/document on import.
      const { startPhaserGame } = await import('../lib/phaserScene.js');
      if (cancelled || !containerRef.current) return;

      const game = startPhaserGame(containerRef.current, {
        onMove: (pos) => {
          const s = useGameStore.getState();
          s.setMyPosition(pos);
          // Throttle to ~20Hz
          const now = performance.now();
          if (now - lastEmittedRef.current > 50 && socket && s.roomCode) {
            socket.emit('game:move', { roomCode: s.roomCode, position: pos });
            lastEmittedRef.current = now;
          }
        },
      });
      gameRef.current = game;

      // Send the current store snapshot once Phaser is ready, then on every change.
      const push = (state) => {
        game.events.emit('state:update', {
          metrics: state.metrics,
          activeEvents: state.activeEvents,
          players: state.players,
          socketId: state.socketId,
          upgrades: state.upgrades,
        });
      };

      // Wait one tick so the scene has had `create()` run.
      setTimeout(() => push(useGameStore.getState()), 0);

      // Forward bus events into Phaser
      const unsubBus = sceneSubscribe((name, payload) => {
        if (gameRef.current) gameRef.current.events.emit(name, payload);
      });

      const unsubStore = useGameStore.subscribe((state, prev) => {
        if (
          state.players === prev.players &&
          state.metrics === prev.metrics &&
          state.activeEvents === prev.activeEvents &&
          state.upgrades === prev.upgrades
        ) return;
        push(state);
      });

      unsub = () => { unsubBus(); unsubStore(); };
    };

    mount();

    return () => {
      cancelled = true;
      if (unsub) unsub();
      if (gameRef.current) {
        try { gameRef.current.destroy(true); } catch {}
        gameRef.current = null;
      }
    };
  }, [socket]);

  // Hook the chat-bubble store value into Phaser (separate subscription)
  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      if (state.chatBubbles === prev.chatBubbles) return;
      if (!gameRef.current) return;
      // Find any new/changed bubbles and forward
      for (const [pid, bub] of Object.entries(state.chatBubbles || {})) {
        const old = prev.chatBubbles?.[pid];
        if (!old || old.timestamp !== bub.timestamp) {
          gameRef.current.events.emit('chat:bubble', { playerId: pid, message: bub.message });
        }
      }
    });
  }, []);

  return (
    <div className="pixel-world phaser-host">
      <div ref={containerRef} className="phaser-canvas" />
      <div className="pw-move-hint">WASD/arrows to move · drag to pan · double-click to recenter</div>
    </div>
  );
}
