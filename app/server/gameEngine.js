// Game engine — tick-based loop with upgrades, objectives, delegation, event responses

import { GAME_CONFIG, ACTIONS, EVENTS, ROOM_STATES, UPGRADES, METRICS_CONFIG, OBJECTIVES_POOL, ROLE_BONUSES } from '../lib/gameConfig.js';
import { createInitialState, applyAction, applyEventResponseClean, applyUpgrade, tickState, calculateScores } from './stateReducer.js';
import { createEventGenerator } from './eventGenerator.js';

export class GameEngine {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.state = createInitialState(room.gameType, room.gameSubtype);
    this.eventGenerator = createEventGenerator();
    this.intervalId = null;
    this.isRunning = false;
    this.pendingDelegations = new Map();
    this.initObjectives();
  }

  initObjectives() {
    const shuffled = [...OBJECTIVES_POOL].sort(() => Math.random() - 0.5);
    this.state.objectives = shuffled.slice(0, 3).map(obj => ({
      id: obj.id, type: obj.type, description: obj.description,
      reward: obj.reward, sustainTicks: obj.sustainTicks || 0,
      progress: 0, completed: false, sustainProgress: 0,
    }));
    this.objectiveChecks = {};
    for (const obj of OBJECTIVES_POOL) {
      this.objectiveChecks[obj.id] = obj.check;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[GameEngine] Starting game for room ${this.room.code}`);
    // Assign each player a fixed desk position so avatars don't teleport
    const desks = [
      { x: 80, y: 220 }, { x: 200, y: 220 }, { x: 320, y: 220 },
      { x: 80, y: 280 }, { x: 200, y: 280 },
    ];
    Object.values(this.room.players).forEach((p, i) => {
      if (!p.position) p.position = { ...(desks[i] || desks[0]) };
    });
    // Stagger initial bot action timers so they don't all fire on the same tick
    for (const p of Object.values(this.room.players)) {
      if (p.isBot) p.nextActionTick = 4 + Math.floor(Math.random() * 8);
    }
    this.broadcastState();
    this.intervalId = setInterval(() => this.tick(), GAME_CONFIG.TICK_RATE);
  }

  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.isRunning = false;
  }

  tick() {
    if (!this.isRunning) return;
    this.updateCooldowns();
    this.state = tickState(this.state);
    this.checkObjectives();
    this.runBots();

    // Auto-promote to growth phase once user threshold is hit
    if (this.state.phase === 'launch' && this.state.metrics.users >= GAME_CONFIG.LAUNCH_USER_THRESHOLD) {
      this.state = { ...this.state, phase: 'growth' };
      this.io.to(this.room.code).emit('game:phaseChange', { phase: 'growth', tick: this.state.tick });
    }

    // No random events during idea phase or the early grace window — let players ramp up
    const eventsAllowed = this.state.phase !== 'idea' && this.state.tick > GAME_CONFIG.EVENT_GRACE_TICKS;
    if (eventsAllowed && this.eventGenerator.shouldTriggerEvent(this.state.tick)) {
      const eventId = this.eventGenerator.generateEvent(this.state.tick, this.state.metrics);
      const event = EVENTS[eventId];
      if (event) {
        const newMetrics = { ...this.state.metrics };
        for (const [metric, delta] of Object.entries(event.effects)) {
          if (newMetrics[metric] === undefined) continue;
          const config = METRICS_CONFIG[metric];
          newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + delta));
        }
        const newEvent = {
          ...event, startTick: this.state.tick,
          endTick: this.state.tick + event.duration, responded: false,
        };
        this.state = {
          ...this.state, metrics: newMetrics,
          activeEvents: [...this.state.activeEvents, newEvent],
          eventHistory: [...this.state.eventHistory, { ...newEvent, timestamp: Date.now() }],
        };
        this.io.to(this.room.code).emit('game:event', { eventId, event: newEvent, tick: this.state.tick });
      }
    }

    // End conditions
    if (this.state.tick >= GAME_CONFIG.ROUND_DURATION) { this.endGame(); return; }
    if (this.state.metrics.errors >= 100) { this.endGame('critical_failure'); return; }

    this.broadcastState();
  }

  checkObjectives() {
    let changed = false;
    for (const obj of this.state.objectives) {
      if (obj.completed) continue;
      const checkFn = this.objectiveChecks[obj.id];
      if (!checkFn) continue;

      if (obj.sustainTicks && obj.sustainTicks > 0) {
        if (checkFn(this.state.metrics)) {
          obj.sustainProgress = (obj.sustainProgress || 0) + 1;
          if (obj.sustainProgress >= obj.sustainTicks) {
            this.completeObjective(obj);
            changed = true;
          }
        } else {
          obj.sustainProgress = 0;
        }
      } else {
        if (checkFn(this.state.metrics)) {
          this.completeObjective(obj);
          changed = true;
        }
      }
    }

    if (changed) {
      const activeIds = new Set(this.state.objectives.map(o => o.id));
      const available = OBJECTIVES_POOL.filter(o => !activeIds.has(o.id));
      while (this.state.objectives.filter(o => !o.completed).length < 3 && available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        const newObj = available.splice(idx, 1)[0];
        this.state.objectives.push({
          id: newObj.id, type: newObj.type, description: newObj.description,
          reward: newObj.reward, sustainTicks: newObj.sustainTicks || 0,
          progress: 0, completed: false, sustainProgress: 0,
        });
        this.objectiveChecks[newObj.id] = newObj.check;
      }
    }
  }

  completeObjective(obj) {
    obj.completed = true;
    this.state.objectivesCompleted = (this.state.objectivesCompleted || 0) + 1;
    if (obj.reward) {
      if (obj.reward.revenue) {
        this.state.metrics.revenue = Math.min(METRICS_CONFIG.revenue.max, this.state.metrics.revenue + obj.reward.revenue);
      }
      if (obj.reward.score) {
        this.state.bonusScore = (this.state.bonusScore || 0) + obj.reward.score;
      }
    }
    this.io.to(this.room.code).emit('game:objectiveComplete', {
      objective: { id: obj.id, description: obj.description, reward: obj.reward },
      tick: this.state.tick,
    });
  }

  handlePlayerAction(socketId, actionId) {
    const player = this.room.players[socketId];
    if (!player) return { error: 'Player not found' };
    const action = ACTIONS[actionId];
    if (!action) return { error: 'Invalid action' };

    if (action.roleLock && action.roleLock !== player.role) {
      return { error: `Only the ${action.roleLock.toUpperCase()} role can do this` };
    }
    // Phase gating: in 'idea' phase only idea-tagged actions are allowed.
    if (this.state.phase === 'idea' && action.phase !== 'idea') {
      return { error: 'Build the MVP first to unlock this' };
    }
    if (this.state.phase !== 'idea' && action.phase === 'idea') {
      return { error: 'Already past the idea phase' };
    }
    // Global busy lock: while doing one action, all others are gated.
    const busyRemaining = (player.busyUntil || 0) - this.state.tick;
    if (busyRemaining > 0) {
      return { error: 'Busy with another action', cooldownRemaining: busyRemaining };
    }
    if (player.actionsUsed >= GAME_CONFIG.MAX_ACTIONS_PER_ROUND) {
      return { error: 'Max actions reached' };
    }

    this.state = applyAction(this.state, actionId, socketId, player.role, this.state.upgrades);

    let duration = action.cooldown;
    if (this.state.upgrades.includes('cicdPipeline')) {
      duration = Math.max(1, Math.ceil(duration * 0.8));
    }
    player.busyUntil = this.state.tick + duration;
    player.busyAction = actionId;
    player.busyTotal = duration;
    player.actionsUsed = (player.actionsUsed || 0) + 1;

    // Ship MVP → flips game out of the idea phase
    if (action.launchesGame && this.state.phase === 'idea') {
      this.state = { ...this.state, phase: 'launch' };
      this.io.to(this.room.code).emit('game:phaseChange', { phase: 'launch', tick: this.state.tick });
    }

    const roleBonusActions = ROLE_BONUSES[player.role] || [];
    const hasRoleBonus = roleBonusActions.includes(actionId);

    this.io.to(this.room.code).emit('game:actionPerformed', {
      playerId: socketId, playerName: player.name, playerRole: player.role,
      actionId, actionName: action.name, actionEmoji: action.emoji,
      hasRoleBonus, tick: this.state.tick,
    });

    this.broadcastState();
    return { success: true, duration, hasRoleBonus };
  }

  handleEventResponse(socketId, eventId) {
    const event = this.state.activeEvents.find(e => e.id === eventId && !e.responded);
    if (!event) return { error: 'Event not found or already responded' };

    this.state = applyEventResponseClean(this.state, eventId);

    const player = this.room.players[socketId];
    this.io.to(this.room.code).emit('game:eventResponse', {
      eventId, playerId: socketId, playerName: player?.name || 'Unknown',
      tick: this.state.tick,
    });

    this.broadcastState();
    return { success: true };
  }

  handleUpgrade(socketId, upgradeId) {
    const player = this.room.players[socketId];
    if (!player) return { error: 'Player not found' };
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return { error: 'Invalid upgrade' };
    if (this.state.upgrades.includes(upgradeId)) return { error: 'Already purchased' };
    if (this.state.metrics.revenue < upgrade.cost) return { error: 'Not enough revenue', needed: upgrade.cost };

    this.state = applyUpgrade(this.state, upgradeId);

    this.io.to(this.room.code).emit('game:upgradePurchased', {
      upgradeId, upgradeName: upgrade.name, upgradeEmoji: upgrade.emoji,
      playerId: socketId, playerName: player.name, tick: this.state.tick,
    });

    this.broadcastState();
    return { success: true };
  }

  handleDelegation(fromSocketId, toSocketId, actionId) {
    const fromPlayer = this.room.players[fromSocketId];
    const toPlayer = this.room.players[toSocketId];
    if (!fromPlayer || !toPlayer) return { error: 'Player not found' };
    const action = ACTIONS[actionId];
    if (!action) return { error: 'Invalid action' };

    const delegationId = `${Date.now()}_${fromSocketId.slice(-4)}`;
    this.pendingDelegations.set(delegationId, {
      from: fromSocketId, to: toSocketId, actionId, timestamp: Date.now(),
    });

    this.io.to(toSocketId).emit('game:delegationRequest', {
      delegationId, fromName: fromPlayer.name, fromRole: fromPlayer.role,
      actionId, actionName: action.name, actionEmoji: action.emoji,
    });

    fromPlayer.delegationsSent = (fromPlayer.delegationsSent || 0) + 1;

    setTimeout(() => {
      if (this.pendingDelegations.has(delegationId)) {
        this.pendingDelegations.delete(delegationId);
        this.io.to(fromSocketId).emit('game:delegationExpired', { delegationId });
      }
    }, 15000);

    return { success: true, delegationId };
  }

  handleDelegationResponse(socketId, delegationId, accepted) {
    const delegation = this.pendingDelegations.get(delegationId);
    if (!delegation) return { error: 'Delegation expired or not found' };
    if (delegation.to !== socketId) return { error: 'Not your delegation' };

    this.pendingDelegations.delete(delegationId);
    const fromPlayer = this.room.players[delegation.from];
    const toPlayer = this.room.players[socketId];

    if (accepted) {
      const action = ACTIONS[delegation.actionId];
      if (!action) return { error: 'Invalid action' };

      const roleBonusActions = ROLE_BONUSES[toPlayer.role] || [];
      const hasRoleBonus = roleBonusActions.includes(delegation.actionId);
      const multiplier = (hasRoleBonus ? 1.5 : 1.0) * 1.25;

      const newMetrics = { ...this.state.metrics };
      for (const [metric, delta] of Object.entries(action.effects)) {
        if (newMetrics[metric] === undefined) continue;
        const config = METRICS_CONFIG[metric];
        let effectiveDelta = delta * multiplier;
        if (this.state.upgrades.includes('qaTeam') && delegation.actionId === 'shipFeature' && metric === 'errors' && delta > 0) effectiveDelta = 0;
        newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + effectiveDelta));
      }
      this.state = { ...this.state, metrics: newMetrics };

      this.io.to(this.room.code).emit('game:delegationComplete', {
        fromName: fromPlayer?.name, toName: toPlayer.name,
        actionName: action.name, actionEmoji: action.emoji, hasRoleBonus,
      });
    } else {
      this.io.to(delegation.from).emit('game:delegationDeclined', {
        toName: toPlayer.name, actionName: ACTIONS[delegation.actionId]?.name,
      });
    }

    this.broadcastState();
    return { success: true };
  }

  runBots() {
    for (const [id, p] of Object.entries(this.room.players)) {
      if (!p.isBot) continue;
      if (p.nextActionTick === undefined) p.nextActionTick = this.state.tick + 5;
      if (this.state.tick < p.nextActionTick) continue;

      // Bots are gated by the same global busy lock as humans.
      if ((p.busyUntil || 0) > this.state.tick) continue;
      const bonusActions = ROLE_BONUSES[p.role] || [];
      const ready = (id) => {
        const a = ACTIONS[id];
        if (!a) return false;
        if (a.roleLock && a.roleLock !== p.role) return false;
        if (this.state.phase === 'idea' && a.phase !== 'idea') return false;
        if (this.state.phase !== 'idea' && a.phase === 'idea') return false;
        return true;
      };
      let candidates = bonusActions.filter(ready);
      if (candidates.length === 0 || Math.random() < 0.25) {
        // Fall back to any usable action
        candidates = Object.keys(ACTIONS).filter(ready);
      }
      // Smart-ish prioritization: when an event is active and a relevant action helps,
      // bias toward Emergency-category actions.
      if (this.state.activeEvents.length > 0 && Math.random() < 0.5) {
        const emergency = candidates.filter(id => ACTIONS[id].category === 'emergency');
        if (emergency.length > 0) candidates = emergency;
      }
      if (candidates.length === 0) {
        p.nextActionTick = this.state.tick + 4;
        continue;
      }
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      this.handlePlayerAction(id, choice);
      // Schedule next action 5–11 ticks out
      p.nextActionTick = this.state.tick + 5 + Math.floor(Math.random() * 7);
    }
  }

  updateCooldowns() {
    // With the new global busy model, the busyUntil tick is compared to
    // the current tick directly — nothing to decrement. Leave the hook in
    // place so future per-action timers can be added without touching tick().
  }

  endGame(reason = 'round_complete') {
    this.stop();
    this.room.state = ROOM_STATES.SCORING;
    const scores = calculateScores(this.state, this.room.players);
    this.io.to(this.room.code).emit('game:end', { reason, scores, finalState: this.state });
  }

  broadcastState() {
    const players = {};
    for (const [id, p] of Object.entries(this.room.players)) {
      const busyRemaining = Math.max(0, (p.busyUntil || 0) - this.state.tick);
      players[id] = {
        id: p.id, name: p.name, role: p.role, avatar: p.avatar,
        actionsUsed: p.actionsUsed || 0,
        busyRemaining, busyTotal: p.busyTotal || 0,
        busyAction: busyRemaining > 0 ? p.busyAction : null,
        position: p.position || { x: 200, y: 250 },
      };
    }

    this.io.to(this.room.code).emit('game:state', {
      metrics: this.state.metrics,
      activeEvents: this.state.activeEvents.map(e => ({
        id: e.id, name: e.name, description: e.description, severity: e.severity,
        startTick: e.startTick, endTick: e.endTick, responded: e.responded,
      })),
      tick: this.state.tick, stage: this.state.stage,
      timeRemaining: GAME_CONFIG.ROUND_DURATION - this.state.tick,
      phase: this.state.phase,
      gameType: this.state.gameType, gameSubtype: this.state.gameSubtype,
      players, upgrades: this.state.upgrades,
      objectives: this.state.objectives.map(o => ({
        id: o.id, description: o.description, type: o.type, completed: o.completed,
        sustainTicks: o.sustainTicks, sustainProgress: o.sustainProgress, reward: o.reward,
      })),
      objectivesCompleted: this.state.objectivesCompleted,
      bonusScore: this.state.bonusScore,
    });
  }
}
