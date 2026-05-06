// Game engine — tick-based loop with upgrades, objectives, delegation, event responses

import { GAME_CONFIG, ACTIONS, EVENTS, ROOM_STATES, UPGRADES, METRICS_CONFIG, OBJECTIVES_POOL, ROLE_BONUSES, WIN_CONDITIONS, PHASE_MILESTONES } from '../lib/gameConfig.js';
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
    this.tickMotivation();
    const totalSalary = Object.values(this.room.players).reduce((s, p) => s + (p.salary || 0), 0);
    this.state = tickState(this.state, Object.keys(this.room.players).length, totalSalary);
    // Prune expired synergy buffs
    if (this.state.activeBuffs) {
      const live = {};
      for (const [id, expires] of Object.entries(this.state.activeBuffs)) {
        if (expires > this.state.tick) live[id] = expires;
      }
      this.state = { ...this.state, activeBuffs: live };
    }
    this.checkObjectives();
    this.checkPhaseMilestone();
    this.runBots();

    // Bankruptcy — revenue went to zero past idea phase
    if (this.state.phase !== 'idea' && this.state.metrics.revenue <= 0) {
      this.endGame('bankruptcy');
      return;
    }
    // Victory — hit the win condition for this game type
    const win = WIN_CONDITIONS[this.state.gameSubtype];
    if (win && !this.state.won && this.state.phase !== 'idea') {
      const v = this.state.metrics[win.metric] || 0;
      if (v >= win.value) {
        this.state = { ...this.state, won: true };
        this.endGame('victory');
        return;
      }
    }

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
        for (const [metric, delta] of Object.entries(event.effects || {})) {
          if (newMetrics[metric] === undefined) continue;
          const config = METRICS_CONFIG[metric];
          newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + delta));
        }
        // Percentage damage scales with current metric value — bigger company,
        // bigger absolute hit. Combined with the flat `effects`, a small startup
        // can still be wiped out by a single bad event.
        for (const [metric, pct] of Object.entries(event.pctEffects || {})) {
          if (newMetrics[metric] === undefined) continue;
          const config = METRICS_CONFIG[metric];
          const change = Math.round(newMetrics[metric] * pct);
          newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + change));
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

  checkPhaseMilestone() {
    const ms = PHASE_MILESTONES[this.state.phase];
    if (!ms) return;
    if ((this.state.completedMilestones || []).includes(ms.id)) return;
    if (ms.check(this.state.metrics, this.state)) {
      const completed = [...(this.state.completedMilestones || []), ms.id];
      const reward = ms.reward || {};
      const newRevenue = Math.min(
        METRICS_CONFIG.revenue.max,
        (this.state.metrics.revenue || 0) + (reward.revenue || 0),
      );
      this.state = {
        ...this.state,
        completedMilestones: completed,
        metrics: { ...this.state.metrics, revenue: newRevenue },
      };
      this.io.to(this.room.code).emit('game:milestoneComplete', {
        id: ms.id, description: ms.description, reward, tick: this.state.tick,
      });
    }
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
    // Per-round use cap (team-wide). Stops grinding low-cooldown actions.
    if (action.maxUses) {
      const used = this.state.actionCounts?.[actionId] || 0;
      if (used >= action.maxUses) {
        return { error: `Already used ${action.maxUses} times this round` };
      }
    }
    // Motivation gate: too checked-out to do hard work
    if (action.motivationFloor && (player.motivation || 0) < action.motivationFloor) {
      return { error: `Need motivation ≥${action.motivationFloor} (you're at ${Math.round(player.motivation || 0)})` };
    }
    // Global busy lock: while doing one action, all others are gated.
    const busyRemaining = (player.busyUntil || 0) - this.state.tick;
    if (busyRemaining > 0) {
      return { error: 'Busy with another action', cooldownRemaining: busyRemaining };
    }
    if (player.actionsUsed >= GAME_CONFIG.MAX_ACTIONS_PER_ROUND) {
      return { error: 'Max actions reached' };
    }

    const applied = applyAction(this.state, actionId, socketId, player.role, this.state.upgrades, player.motivation || 70);
    this.state = applied.state;
    const outcome = applied.outcome;

    // Grant synergy buff (foundation work leaves something behind for teammates)
    if (action.grantsBuff) {
      const expiresAt = this.state.tick + action.grantsBuff.ticks;
      const buffs = { ...(this.state.activeBuffs || {}) };
      buffs[action.grantsBuff.id] = Math.max(buffs[action.grantsBuff.id] || 0, expiresAt);
      this.state = { ...this.state, activeBuffs: buffs };
    }

    let duration = action.cooldown;
    if (this.state.upgrades.includes('cicdPipeline')) {
      duration = Math.max(1, Math.ceil(duration * 0.8));
    }
    // Motivation scales duration: 100 mot → 1.0×, 0 mot → 1.6× slower
    const mot = player.motivation || 70;
    const motMul = 1 + (1 - mot / 100) * 0.6;
    // Happiness scales duration too: a happy team works faster.
    // 100 happiness → 0.85×, 50 → 1.0×, 0 → 1.15×.
    const hap = this.state.metrics.happiness ?? 50;
    const hapMul = 1 - ((hap - 50) / 100) * 0.3;
    // Aligned buff (sprint planning) shaves another 15% — proper planning pays off.
    const aligned = (this.state.activeBuffs?.aligned || 0) > this.state.tick;
    const alignMul = aligned ? 0.85 : 1.0;
    duration = Math.max(1, Math.ceil(duration * motMul * hapMul * alignMul));
    player.busyUntil = this.state.tick + duration;
    player.busyAction = actionId;
    player.busyTotal = duration;
    player.actionsUsed = (player.actionsUsed || 0) + 1;

    // Increment team-wide use count for this action — used both for maxUses
    // caps and for diminishing-returns scaling on repeat use.
    {
      const counts = { ...(this.state.actionCounts || {}) };
      counts[actionId] = (counts[actionId] || 0) + 1;
      this.state = { ...this.state, actionCounts: counts };
    }

    // Pre-launch prep accumulates points that determine pitch funding
    if (action.preparationPoints) {
      this.state = {
        ...this.state,
        preparationPoints: (this.state.preparationPoints || 0) + action.preparationPoints,
      };
    }

    // Pitch to investors → funding awarded based on prep, then enter launch phase
    if (action.launchesGame && this.state.phase === 'idea') {
      const prep = this.state.preparationPoints || 0;
      const funding = Math.min(
        GAME_CONFIG.FUNDING_CAP,
        GAME_CONFIG.FUNDING_BASE + prep * GAME_CONFIG.FUNDING_PER_POINT,
      );
      const newRevenue = Math.min(
        METRICS_CONFIG.revenue.max,
        (this.state.metrics.revenue || 0) + funding,
      );
      this.state = {
        ...this.state,
        phase: 'launch',
        fundingRaised: funding,
        metrics: { ...this.state.metrics, revenue: newRevenue },
      };
      this.io.to(this.room.code).emit('game:phaseChange', { phase: 'launch', tick: this.state.tick });
      this.io.to(this.room.code).emit('game:funded', { funding, prep, tick: this.state.tick });
    }

    const roleBonusActions = ROLE_BONUSES[player.role] || [];
    const hasRoleBonus = roleBonusActions.includes(actionId);

    this.io.to(this.room.code).emit('game:actionPerformed', {
      playerId: socketId, playerName: player.name, playerRole: player.role,
      actionId, actionName: action.name, actionEmoji: action.emoji,
      hasRoleBonus, tick: this.state.tick,
    });
    if (outcome) {
      this.io.to(this.room.code).emit('game:actionOutcome', {
        playerId: socketId, playerName: player.name,
        actionName: action.name, actionEmoji: action.emoji,
        result: outcome.result, hadBug: outcome.hadBug,
        synergyMul: outcome.synergyMul, usedBuffs: outcome.usedBuffs,
        tick: this.state.tick,
      });
    }

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
        // Pitching to investors is a player-only decision — bots must never
        // launch the company on their teammates' behalf.
        if (a.launchesGame) return false;
        if (a.roleLock && a.roleLock !== p.role) return false;
        if (this.state.phase === 'idea' && a.phase !== 'idea') return false;
        if (this.state.phase !== 'idea' && a.phase === 'idea') return false;
        if (a.maxUses && (this.state.actionCounts?.[id] || 0) >= a.maxUses) return false;
        if (a.motivationFloor && (p.motivation || 0) < a.motivationFloor) return false;
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

  tickMotivation() {
    // Motivation drifts toward target = (salary − default) mapped to 30..100.
    // Below default → toward low morale. Above default → toward enthused.
    // No salaries are paid during the idea phase, so no motivation should
    // accrue from them either — otherwise the slider is a free buff.
    if (this.state.phase === 'idea') {
      for (const p of Object.values(this.room.players)) {
        if (p.salary === undefined) p.salary = GAME_CONFIG.SALARY_DEFAULT;
        if (p.motivation === undefined) p.motivation = 70;
      }
      return;
    }
    for (const p of Object.values(this.room.players)) {
      if (p.salary === undefined) p.salary = GAME_CONFIG.SALARY_DEFAULT;
      if (p.motivation === undefined) p.motivation = 70;
      const range = GAME_CONFIG.SALARY_MAX - GAME_CONFIG.SALARY_MIN;
      const ratio = (p.salary - GAME_CONFIG.SALARY_MIN) / range;
      const target = 30 + ratio * 70; // 30 at min, 100 at max
      const delta = (target - p.motivation) * 0.04; // smooth approach
      p.motivation = Math.max(0, Math.min(100, p.motivation + delta - GAME_CONFIG.MOTIVATION_DECAY * 0.1));
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
    if (reason === 'victory') {
      scores.grade = 'S+';
      scores.totalScore = Math.max(scores.totalScore, 100);
    } else if (reason === 'bankruptcy' || reason === 'critical_failure') {
      scores.grade = 'F';
    }
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
        salary: p.salary || GAME_CONFIG.SALARY_DEFAULT,
        motivation: Math.round(p.motivation || 70),
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
      lastBurn: this.state.lastBurn || 0,
      lastIncome: this.state.lastIncome || 0,
      lastOrganicGrowth: this.state.lastOrganicGrowth || 0,
      arpu: this.state.arpu || 0,
      preparationPoints: this.state.preparationPoints || 0,
      fundingRaised: this.state.fundingRaised || 0,
      actionCounts: this.state.actionCounts || {},
      activeBuffs: this.state.activeBuffs || {},
      milestone: (() => {
        const ms = PHASE_MILESTONES[this.state.phase];
        if (!ms) return null;
        return {
          id: ms.id, description: ms.description,
          completed: (this.state.completedMilestones || []).includes(ms.id),
        };
      })(),
      winCondition: WIN_CONDITIONS[this.state.gameSubtype] || null,
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
