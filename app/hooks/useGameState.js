'use client';

import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Connection state
  playerName: '',
  roomCode: null,
  socketId: null,

  // Room state
  room: null,
  isHost: false,

  // Game state
  gamePhase: 'home', // home | lobby | playing | scoring
  metrics: null,
  activeEvents: [],
  eventHistory: [],
  actionHistory: [],
  tick: 0,
  stage: 0,
  timeRemaining: 300,
  players: {},
  scores: null,

  // My player state
  myRole: null,
  myCooldowns: {},
  myActionsUsed: 0,

  // UI state
  notification: null,

  // Actions
  setPlayerName: (name) => set({ playerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  setSocketId: (id) => set({ socketId: id }),

  setRoom: (room) => {
    const state = get();
    set({
      room,
      isHost: room?.host === state.socketId,
      myRole: room?.players?.[state.socketId]?.role || null,
    });
  },

  setGamePhase: (phase) => set({ gamePhase: phase }),

  updateGameState: (gameState) => {
    const state = get();
    const myPlayer = gameState.players?.[state.socketId];
    set({
      metrics: gameState.metrics,
      activeEvents: gameState.activeEvents || [],
      tick: gameState.tick,
      stage: gameState.stage,
      timeRemaining: gameState.timeRemaining,
      players: gameState.players,
      myCooldowns: myPlayer?.cooldowns || {},
      myActionsUsed: myPlayer?.actionsUsed || 0,
    });
  },

  addEvent: (event) => {
    set((state) => ({
      eventHistory: [...state.eventHistory.slice(-50), {
        ...event,
        timestamp: Date.now(),
      }],
    }));
  },

  addAction: (action) => {
    set((state) => ({
      actionHistory: [...state.actionHistory.slice(-50), {
        ...action,
        timestamp: Date.now(),
      }],
    }));
  },

  setScores: (scores) => set({ scores, gamePhase: 'scoring' }),

  setNotification: (notification) => {
    set({ notification });
    if (notification) {
      setTimeout(() => {
        set((state) => {
          if (state.notification === notification) {
            return { notification: null };
          }
          return {};
        });
      }, 3000);
    }
  },

  reset: () => set({
    roomCode: null,
    room: null,
    isHost: false,
    gamePhase: 'home',
    metrics: null,
    activeEvents: [],
    eventHistory: [],
    actionHistory: [],
    tick: 0,
    stage: 0,
    timeRemaining: 300,
    players: {},
    scores: null,
    myRole: null,
    myCooldowns: {},
    myActionsUsed: 0,
    notification: null,
  }),
}));
