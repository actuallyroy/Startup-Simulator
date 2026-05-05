'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from './useGameState';
import { publish as scenePublish } from '../lib/sceneBus';

let globalSocket = null;

export function useSocket() {
  const socketRef = useRef(null);
  const {
    setSocketId, setRoom, setGamePhase, updateGameState, addEvent,
    addAction, addActionToast, setChatBubble, setPendingDelegation,
    setScores, setNotification,
  } = useGameStore();

  useEffect(() => {
    // Reuse the existing socket across re-renders AND React StrictMode
    // double-mounts. Listeners are registered once on the first mount.
    if (globalSocket) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
      transports: ['websocket', 'polling'],
    });
    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketId(socket.id);
      console.log('[Socket] Connected:', socket.id);
    });

    // Room events
    socket.on('room:update', (room) => setRoom(room));
    socket.on('room:playerLeft', ({ playerId }) => {
      addActionToast({ message: `A player left the room`, type: 'info' });
    });

    // Game lifecycle
    socket.on('game:start', () => setGamePhase('playing'));
    socket.on('game:state', (gs) => updateGameState(gs));
    socket.on('game:end', ({ reason, scores }) => setScores(scores, reason));
    socket.on('game:reset', () => {
      const s = useGameStore.getState();
      // Reset per-round state but keep playerName / roomCode / avatar.
      useGameStore.setState({
        gamePhase: 'lobby',
        scores: null, endReason: null,
        metrics: null, activeEvents: [], eventHistory: [], actionHistory: [],
        tick: 0, stage: 0, timeRemaining: 300, phase: 'idea',
        milestone: null, winCondition: null, lastBurn: 0, lastIncome: 0, arpu: 0,
        preparationPoints: 0, fundingRaised: 0,
        actionCounts: {}, upgrades: [], objectives: [], objectivesCompleted: 0,
        bonusScore: 0, pendingDelegation: null, actionToasts: [], chatBubbles: {},
        myActionsUsed: 0, myBusyRemaining: 0, myBusyTotal: 0, myBusyAction: null,
        myMotivation: 70, mySalary: 50,
      });
    });

    // Events
    socket.on('game:event', ({ eventId, event }) => {
      addEvent({ id: eventId, ...event });
      addActionToast({
        message: `⚠️ ${event?.name || eventId}`,
        type: event?.severity === 'critical' ? 'error' : 'warning',
      });
      if (event?.severity === 'critical') {
        scenePublish('event:critical', { eventId });
      }
    });

    socket.on('game:eventResponse', ({ eventId, playerName }) => {
      addActionToast({ message: `✅ ${playerName} responded to event!`, type: 'success' });
    });

    // Actions performed by other players
    socket.on('game:actionPerformed', ({ playerName, actionName, actionEmoji, hasRoleBonus, playerId }) => {
      const myId = useGameStore.getState().socketId;
      if (playerId !== myId) {
        addActionToast({
          message: `${actionEmoji} ${playerName} used ${actionName}${hasRoleBonus ? ' (BONUS!)' : ''}`,
          type: hasRoleBonus ? 'success' : 'info',
        });
      }
      addAction({ playerName, actionName, actionEmoji, hasRoleBonus });
      setChatBubble(playerId, `${actionEmoji} ${actionName}!`);
      scenePublish('action:performed', { playerId, actionEmoji });
    });

    // Action outcome (probability roll result)
    socket.on('game:actionOutcome', ({ playerName, actionName, actionEmoji, result, hadBug }) => {
      const myId = useGameStore.getState().socketId;
      // Only toast notable outcomes — successes are the default and would spam.
      if (result === 'critical') {
        addActionToast({ message: `🌟 ${playerName} CRUSHED ${actionEmoji} ${actionName}!`, type: 'success' });
      } else if (result === 'failure') {
        addActionToast({ message: `💥 ${playerName} botched ${actionEmoji} ${actionName}`, type: 'warning' });
      }
      if (hadBug) {
        addActionToast({ message: `🐞 Bugs introduced by ${actionName}!`, type: 'error' });
      }
    });

    // Upgrades
    socket.on('game:upgradePurchased', ({ upgradeName, upgradeEmoji, playerName }) => {
      addActionToast({
        message: `${upgradeEmoji} ${playerName} bought ${upgradeName}!`,
        type: 'success',
      });
    });

    // Pitch funding
    socket.on('game:funded', ({ funding, prep }) => {
      addActionToast({
        message: `💰 Investors funded $${funding.toLocaleString()} (${prep} prep pts)!`,
        type: 'success',
      });
    });

    // Phase milestones
    socket.on('game:milestoneComplete', ({ description, reward }) => {
      addActionToast({
        message: `🏁 Milestone: ${description}! +$${reward?.revenue || 0}`,
        type: 'success',
      });
    });

    // Objectives
    socket.on('game:objectiveComplete', ({ objective }) => {
      addActionToast({
        message: `🎯 Objective complete: ${objective.description}! +$${objective.reward?.revenue || 0}`,
        type: 'success',
      });
    });

    // Delegation
    socket.on('game:delegationRequest', (delegation) => {
      setPendingDelegation(delegation);
    });

    socket.on('game:delegationComplete', ({ fromName, toName, actionName, actionEmoji, hasRoleBonus }) => {
      addActionToast({
        message: `🤝 ${fromName} → ${toName}: ${actionEmoji} ${actionName}${hasRoleBonus ? ' (BONUS!)' : ''}`,
        type: 'success',
      });
    });

    socket.on('game:delegationDeclined', ({ toName, actionName }) => {
      setNotification({ message: `${toName} declined ${actionName}`, type: 'error' });
    });

    socket.on('game:delegationExpired', () => {
      setNotification({ message: 'Delegation expired', type: 'error' });
    });

    // Chat bubbles
    socket.on('game:chatBubble', ({ playerId, message }) => {
      setChatBubble(playerId, message);
    });

    socket.on('disconnect', () => console.log('[Socket] Disconnected'));

    return () => {
      // Don't disconnect — keep alive across re-renders
    };
  }, []);

  return { socket: socketRef.current || globalSocket };
}
