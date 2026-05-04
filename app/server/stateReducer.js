// State reducer — pure function: (state, action) → newState

import { ACTIONS, METRICS_CONFIG, EVENTS } from '../lib/gameConfig.js';

export function createInitialState() {
  const metrics = {};
  for (const [key, config] of Object.entries(METRICS_CONFIG)) {
    metrics[key] = config.start;
  }
  return {
    metrics,
    activeEvents: [],     // currently active events
    eventHistory: [],     // all events that have occurred
    tick: 0,
    stage: 0,             // world stage index
  };
}

export function applyAction(state, actionId, playerId) {
  const action = ACTIONS[actionId];
  if (!action) return state;

  const newMetrics = { ...state.metrics };
  for (const [metric, delta] of Object.entries(action.effects)) {
    if (newMetrics[metric] !== undefined) {
      const config = METRICS_CONFIG[metric];
      newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + delta));
    }
  }

  return {
    ...state,
    metrics: newMetrics,
  };
}

export function applyEvent(state, eventId) {
  const event = EVENTS[eventId];
  if (!event) return state;

  const newMetrics = { ...state.metrics };
  for (const [metric, delta] of Object.entries(event.effects)) {
    if (newMetrics[metric] !== undefined) {
      const config = METRICS_CONFIG[metric];
      newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + delta));
    }
  }

  const newEvent = {
    ...event,
    startTick: state.tick,
    endTick: state.tick + event.duration,
  };

  return {
    ...state,
    metrics: newMetrics,
    activeEvents: [...state.activeEvents, newEvent],
    eventHistory: [...state.eventHistory, { ...newEvent, timestamp: Date.now() }],
  };
}

export function tickState(state) {
  const newMetrics = { ...state.metrics };

  // Natural growth/decay
  for (const [key, config] of Object.entries(METRICS_CONFIG)) {
    const naturalChange = config.growthRate + config.decayRate;
    if (naturalChange !== 0) {
      newMetrics[key] = Math.max(config.min, Math.min(config.max, newMetrics[key] + naturalChange));
    }
  }

  // Revenue is based on users & happiness
  const userFactor = newMetrics.users / 1000;
  const happinessFactor = newMetrics.happiness / 100;
  const errorPenalty = newMetrics.errors / 50;
  const revenueGain = Math.round(userFactor * happinessFactor * 10 - errorPenalty * 5);
  newMetrics.revenue = Math.max(
    METRICS_CONFIG.revenue.min,
    Math.min(METRICS_CONFIG.revenue.max, newMetrics.revenue + revenueGain)
  );

  // High errors increase latency slightly
  if (newMetrics.errors > 50) {
    newMetrics.latency = Math.min(METRICS_CONFIG.latency.max, newMetrics.latency + 5);
  }

  // High latency decreases happiness
  if (newMetrics.latency > 200) {
    newMetrics.happiness = Math.max(METRICS_CONFIG.happiness.min, newMetrics.happiness - 1);
  }

  // Remove expired active events
  const activeEvents = state.activeEvents.filter(e => e.endTick > state.tick);

  // Calculate world stage based on users
  let stage = 0;
  if (newMetrics.users >= 5000) stage = 3;
  else if (newMetrics.users >= 2000) stage = 2;
  else if (newMetrics.users >= 500) stage = 1;

  return {
    ...state,
    metrics: newMetrics,
    activeEvents,
    tick: state.tick + 1,
    stage,
  };
}

export function calculateScores(state, players) {
  const { metrics } = state;

  // Uptime: inverse of errors (lower errors = higher score)
  const uptimeScore = Math.round(Math.max(0, 100 - metrics.errors));

  // Growth: based on final user count relative to starting
  const growthScore = Math.round(Math.min(100, (metrics.users / METRICS_CONFIG.users.max) * 100));

  // Stability: inverse of latency
  const stabilityScore = Math.round(Math.max(0, 100 - (metrics.latency / METRICS_CONFIG.latency.max) * 100));

  // Efficiency: revenue relative to users
  const efficiencyScore = metrics.users > 0
    ? Math.round(Math.min(100, (metrics.revenue / metrics.users) * 10))
    : 0;

  const totalScore = Math.round((uptimeScore + growthScore + stabilityScore + efficiencyScore) / 4);

  // Grade
  let grade = 'F';
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 50) grade = 'D';

  return {
    uptimeScore,
    growthScore,
    stabilityScore,
    efficiencyScore,
    totalScore,
    grade,
    finalMetrics: { ...metrics },
    playerStats: Object.fromEntries(
      Object.entries(players).map(([id, p]) => [id, {
        name: p.name,
        role: p.role,
        actionsUsed: p.actionsUsed || 0,
      }])
    ),
  };
}
