'use client';
import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Connection
  playerName: '', roomCode: null, socketId: null,
  // Room
  room: null, isHost: false,
  // Game phase
  gamePhase: 'home', // home | lobby | playing | scoring
  // Metrics & state
  metrics: null, activeEvents: [], eventHistory: [], actionHistory: [],
  tick: 0, stage: 0, timeRemaining: 300, players: {}, phase: 'idea',
  gameType: 'product', gameSubtype: 'saas',
  // New systems
  upgrades: [], objectives: [], objectivesCompleted: 0, bonusScore: 0,
  pendingDelegation: null, // incoming delegation request
  actionToasts: [],        // floating action notifications
  chatBubbles: {},         // playerId -> {message, timestamp}
  scores: null,
  // My state
  myRole: null, myActionsUsed: 0,
  myBusyRemaining: 0, myBusyTotal: 0, myBusyAction: null,
  myPosition: { x: 200, y: 250 }, myAvatar: null,
  // UI
  notification: null, activeActionTab: 'engineering',

  // Setters
  setPlayerName: (name) => set({ playerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  setSocketId: (id) => set({ socketId: id }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setActiveActionTab: (tab) => set({ activeActionTab: tab }),

  setRoom: (room) => {
    const state = get();
    const me = room?.players?.[state.socketId];
    set({
      room, isHost: room?.host === state.socketId,
      myRole: me?.role || null,
      myAvatar: me?.avatar || state.myAvatar || null,
    });
  },

  updateGameState: (gs) => {
    const state = get();
    const myPlayer = gs.players?.[state.socketId];
    set({
      metrics: gs.metrics, activeEvents: gs.activeEvents || [],
      tick: gs.tick, stage: gs.stage, timeRemaining: gs.timeRemaining,
      players: gs.players, upgrades: gs.upgrades || [],
      objectives: gs.objectives || [], objectivesCompleted: gs.objectivesCompleted || 0,
      bonusScore: gs.bonusScore || 0,
      phase: gs.phase || 'idea',
      gameType: gs.gameType || 'product',
      gameSubtype: gs.gameSubtype || 'saas',
      myActionsUsed: myPlayer?.actionsUsed || 0,
      myBusyRemaining: myPlayer?.busyRemaining || 0,
      myBusyTotal: myPlayer?.busyTotal || 0,
      myBusyAction: myPlayer?.busyAction || null,
    });
  },

  addEvent: (event) => set((s) => ({
    eventHistory: [...s.eventHistory.slice(-50), { ...event, timestamp: Date.now() }],
  })),

  addAction: (action) => set((s) => ({
    actionHistory: [...s.actionHistory.slice(-50), { ...action, timestamp: Date.now() }],
  })),

  addActionToast: (toast) => {
    const id = Date.now() + Math.random();
    set((s) => ({ actionToasts: [...s.actionToasts.slice(-5), { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ actionToasts: s.actionToasts.filter(t => t.id !== id) }));
    }, 4000);
  },

  setChatBubble: (playerId, message) => {
    set((s) => ({ chatBubbles: { ...s.chatBubbles, [playerId]: { message, timestamp: Date.now() } } }));
    setTimeout(() => {
      set((s) => {
        const bubbles = { ...s.chatBubbles };
        if (bubbles[playerId]?.message === message) delete bubbles[playerId];
        return { chatBubbles: bubbles };
      });
    }, 3000);
  },

  setPendingDelegation: (delegation) => set({ pendingDelegation: delegation }),

  setScores: (scores) => set({ scores, gamePhase: 'scoring' }),

  setMyPosition: (pos) => set({ myPosition: pos }),

  setNotification: (notification) => {
    set({ notification });
    if (notification) {
      setTimeout(() => set((s) => s.notification === notification ? { notification: null } : {}), 3000);
    }
  },

  reset: () => set({
    roomCode: null, room: null, isHost: false, gamePhase: 'home',
    metrics: null, activeEvents: [], eventHistory: [], actionHistory: [],
    tick: 0, stage: 0, timeRemaining: 300, players: {}, upgrades: [],
    objectives: [], objectivesCompleted: 0, bonusScore: 0,
    pendingDelegation: null, actionToasts: [], chatBubbles: {},
    scores: null, myRole: null, myActionsUsed: 0,
    myBusyRemaining: 0, myBusyTotal: 0, myBusyAction: null,
    myPosition: { x: 200, y: 250 }, notification: null, activeActionTab: 'engineering',
  }),
}));
