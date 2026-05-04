// Game engine — tick-based loop that drives the game

import { GAME_CONFIG, ACTIONS, ROOM_STATES } from '../lib/gameConfig.js';
import { createInitialState, applyAction, applyEvent, tickState, calculateScores } from './stateReducer.js';
import { createEventGenerator } from './eventGenerator.js';

export class GameEngine {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.state = createInitialState();
    this.eventGenerator = createEventGenerator();
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[GameEngine] Starting game for room ${this.room.code}`);

    // Broadcast initial state
    this.broadcastState();

    // Start tick loop
    this.intervalId = setInterval(() => this.tick(), GAME_CONFIG.TICK_RATE);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log(`[GameEngine] Stopped game for room ${this.room.code}`);
  }

  tick() {
    if (!this.isRunning) return;

    // Update cooldowns for all players
    this.updateCooldowns();

    // Natural state evolution
    this.state = tickState(this.state);

    // Check for events
    if (this.eventGenerator.shouldTriggerEvent(this.state.tick)) {
      const eventId = this.eventGenerator.generateEvent(this.state.tick, this.state.metrics);
      this.state = applyEvent(this.state, eventId);

      // Broadcast event notification
      this.io.to(this.room.code).emit('game:event', {
        eventId,
        tick: this.state.tick,
      });
    }

    // Check for game end
    if (this.state.tick >= GAME_CONFIG.ROUND_DURATION) {
      this.endGame();
      return;
    }

    // Check for critical failure (too many errors)
    if (this.state.metrics.errors >= 100) {
      this.endGame('critical_failure');
      return;
    }

    // Broadcast state
    this.broadcastState();
  }

  handlePlayerAction(socketId, actionId) {
    const player = this.room.players[socketId];
    if (!player) return { error: 'Player not found' };

    const action = ACTIONS[actionId];
    if (!action) return { error: 'Invalid action' };

    // Check if action is available for player's role
    if (!action.roles.includes(player.role)) {
      return { error: 'Action not available for your role' };
    }

    // Check cooldown
    if (player.cooldowns[actionId] && player.cooldowns[actionId] > 0) {
      return { error: 'Action on cooldown', cooldownRemaining: player.cooldowns[actionId] };
    }

    // Check max actions
    if (player.actionsUsed >= GAME_CONFIG.MAX_ACTIONS_PER_ROUND) {
      return { error: 'Max actions reached for this round' };
    }

    // Apply action
    this.state = applyAction(this.state, actionId, socketId);

    // Set cooldown
    player.cooldowns[actionId] = action.cooldown;
    player.actionsUsed = (player.actionsUsed || 0) + 1;

    // Broadcast action notification
    this.io.to(this.room.code).emit('game:action', {
      playerId: socketId,
      playerName: player.name,
      actionId,
      actionName: action.name,
      actionEmoji: action.emoji,
      tick: this.state.tick,
    });

    // Immediately broadcast updated state
    this.broadcastState();

    return { success: true, cooldown: action.cooldown };
  }

  updateCooldowns() {
    for (const player of Object.values(this.room.players)) {
      if (!player.cooldowns) player.cooldowns = {};
      for (const actionId in player.cooldowns) {
        if (player.cooldowns[actionId] > 0) {
          player.cooldowns[actionId]--;
        }
      }
    }
  }

  endGame(reason = 'round_complete') {
    this.stop();
    this.room.state = ROOM_STATES.SCORING;

    const scores = calculateScores(this.state, this.room.players);

    this.io.to(this.room.code).emit('game:end', {
      reason,
      scores,
      finalState: this.state,
    });

    console.log(`[GameEngine] Game ended for room ${this.room.code} - reason: ${reason}`);
  }

  broadcastState() {
    // Build player data with cooldowns
    const players = {};
    for (const [id, p] of Object.entries(this.room.players)) {
      players[id] = {
        id: p.id,
        name: p.name,
        role: p.role,
        actionsUsed: p.actionsUsed || 0,
        cooldowns: { ...p.cooldowns },
      };
    }

    this.io.to(this.room.code).emit('game:state', {
      metrics: this.state.metrics,
      activeEvents: this.state.activeEvents,
      tick: this.state.tick,
      stage: this.state.stage,
      timeRemaining: GAME_CONFIG.ROUND_DURATION - this.state.tick,
      players,
    });
  }
}
