// State reducer — pure functions for game state mutations

import { ACTIONS, METRICS_CONFIG, EVENTS, UPGRADES, ROLE_BONUSES, GAME_TYPES, GAME_CONFIG } from '../lib/gameConfig.js';

export function createInitialState(gameType = null, gameSubtype = null) {
  const metrics = {};
  for (const [key, config] of Object.entries(METRICS_CONFIG)) {
    metrics[key] = config.start;
  }
  // Apply starting bonuses from the host's chosen sub-type
  const sub = GAME_TYPES[gameType]?.subtypes?.[gameSubtype];
  if (sub) {
    if (typeof sub.startRevenue === 'number') metrics.revenue = sub.startRevenue;
    if (typeof sub.startUsers === 'number') metrics.users = sub.startUsers;
  }
  return {
    metrics, activeEvents: [], eventHistory: [],
    tick: 0, stage: 0, upgrades: [],
    objectives: [], objectivesCompleted: 0, bonusScore: 0,
    phase: 'idea',
    gameType, gameSubtype,
    revenueMultiplier: sub?.revenueMultiplier || 1.0,
    actionCounts: {},   // team-wide use count per action id
  };
}

export function applyAction(state, actionId, playerId, playerRole, upgrades) {
  const action = ACTIONS[actionId];
  if (!action) return state;

  const roleBonusActions = ROLE_BONUSES[playerRole] || [];
  const hasRoleBonus = roleBonusActions.includes(actionId);
  const multiplier = hasRoleBonus ? 1.5 : 1.0;

  const newMetrics = { ...state.metrics };
  for (const [metric, delta] of Object.entries(action.effects)) {
    if (newMetrics[metric] === undefined) continue;
    let effectiveDelta = delta * multiplier;
    // QA Team upgrade: Ship Feature no longer adds errors
    if (upgrades.includes('qaTeam') && actionId === 'shipFeature' && metric === 'errors' && delta > 0) {
      effectiveDelta = 0;
    }
    const config = METRICS_CONFIG[metric];
    newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + effectiveDelta));
  }

  // Auto-scaling cap
  if (upgrades.includes('autoScaling')) {
    newMetrics.latency = Math.min(500, newMetrics.latency);
  }

  return { ...state, metrics: newMetrics };
}

// Event response effects map
const EVENT_RESPONSE_EFFECTS = {
  trafficSpike: { latency: -80, users: 50 },
  serviceCrash: { errors: -20, latency: -300 },
  bugInjection: { errors: -15, happiness: 3 },
  badReviews: { happiness: 15, users: 20 },
  costSurge: { revenue: 60 },
  ddosAttack: { latency: -600, errors: -10 },
  viralMoment: { users: 300, revenue: 40 },
  dataLeak: { happiness: 20, users: 50, errors: -5 },
  competitorLaunch: { users: 60, happiness: 5 },
  techBlogFeature: { users: 200, revenue: 30 },
};

export function applyEventResponseClean(state, eventId) {
  const effects = EVENT_RESPONSE_EFFECTS[eventId];
  if (!effects) return state;

  const newMetrics = { ...state.metrics };
  for (const [metric, delta] of Object.entries(effects)) {
    if (newMetrics[metric] === undefined) continue;
    const config = METRICS_CONFIG[metric];
    newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + delta));
  }

  const activeEvents = state.activeEvents.map(e =>
    e.id === eventId && !e.responded ? { ...e, responded: true } : e
  );

  return { ...state, metrics: newMetrics, activeEvents };
}

export function applyUpgrade(state, upgradeId) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return state;
  if (state.upgrades.includes(upgradeId)) return state;
  if (state.metrics.revenue < upgrade.cost) return state;

  const newMetrics = { ...state.metrics };
  newMetrics.revenue -= upgrade.cost;

  return { ...state, metrics: newMetrics, upgrades: [...state.upgrades, upgradeId] };
}

export function tickState(state, playerCount = 1) {
  const newMetrics = { ...state.metrics };
  const upgrades = state.upgrades;

  // Natural growth/decay
  for (const [key, config] of Object.entries(METRICS_CONFIG)) {
    let naturalChange = config.growthRate + config.decayRate;
    if (key === 'errors' && upgrades.includes('standingDesks')) naturalChange *= 0.95;
    if (naturalChange !== 0) {
      newMetrics[key] = Math.max(config.min, Math.min(config.max, newMetrics[key] + naturalChange));
    }
  }

  // Upgrade tick bonuses
  for (const upId of upgrades) {
    const up = UPGRADES[upId];
    if (up?.effect?.type === 'tickBonus') {
      const config = METRICS_CONFIG[up.effect.metric];
      if (config) {
        newMetrics[up.effect.metric] = Math.max(
          config.min, Math.min(config.max, newMetrics[up.effect.metric] + up.effect.value)
        );
      }
    }
  }

  // Revenue from users & happiness — only after launch, scaled by game-type multiplier
  if (state.phase !== 'idea') {
    const userFactor = newMetrics.users / 1000;
    const happinessFactor = newMetrics.happiness / 100;
    const errorPenalty = newMetrics.errors / 50;
    const mult = state.revenueMultiplier || 1.0;
    const revenueGain = Math.round((userFactor * happinessFactor * 10 - errorPenalty * 5) * mult);
    newMetrics.revenue = Math.max(METRICS_CONFIG.revenue.min, Math.min(METRICS_CONFIG.revenue.max, newMetrics.revenue + revenueGain));
  }

  // Burn rate — server costs + salaries every tick once the company exists.
  // Idea phase has no burn; the team is just sketching.
  let burn = 0;
  if (state.phase !== 'idea') {
    burn = GAME_CONFIG.BURN_BASE + GAME_CONFIG.BURN_PER_PLAYER * Math.max(1, playerCount);
    newMetrics.revenue = Math.max(METRICS_CONFIG.revenue.min, newMetrics.revenue - burn);
  }

  // Cross-metric effects
  if (newMetrics.errors > 50) newMetrics.latency = Math.min(METRICS_CONFIG.latency.max, newMetrics.latency + 5);
  if (newMetrics.latency > 200) newMetrics.happiness = Math.max(METRICS_CONFIG.happiness.min, newMetrics.happiness - 1);
  if (upgrades.includes('autoScaling')) newMetrics.latency = Math.min(500, newMetrics.latency);

  // Remove expired events
  const activeEvents = state.activeEvents.filter(e => e.endTick > state.tick);

  // World stage
  let stage = 0;
  if (newMetrics.users >= 5000) stage = 3;
  else if (newMetrics.users >= 2000) stage = 2;
  else if (newMetrics.users >= 500) stage = 1;
  if (upgrades.includes('seriesAOffice') && stage < 2) stage = 2;

  return { ...state, metrics: newMetrics, activeEvents, tick: state.tick + 1, stage, lastBurn: burn };
}

export function calculateScores(state, players) {
  const { metrics } = state;
  const uptimeScore = Math.round(Math.max(0, 100 - metrics.errors));
  const growthScore = Math.round(Math.min(100, (metrics.users / METRICS_CONFIG.users.max) * 100));
  const stabilityScore = Math.round(Math.max(0, 100 - (metrics.latency / METRICS_CONFIG.latency.max) * 100));
  const efficiencyScore = metrics.users > 0 ? Math.round(Math.min(100, (metrics.revenue / metrics.users) * 10)) : 0;
  const objectiveBonus = state.bonusScore || 0;
  const totalScore = Math.round((uptimeScore + growthScore + stabilityScore + efficiencyScore) / 4 + objectiveBonus);

  let grade = 'F';
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 80) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 50) grade = 'D';

  return {
    uptimeScore, growthScore, stabilityScore, efficiencyScore,
    objectiveBonus, totalScore, grade,
    objectivesCompleted: state.objectivesCompleted || 0,
    upgradesBought: state.upgrades.length,
    finalMetrics: { ...metrics },
    playerStats: Object.fromEntries(
      Object.entries(players).map(([id, p]) => [id, {
        name: p.name, role: p.role, actionsUsed: p.actionsUsed || 0,
        delegationsSent: p.delegationsSent || 0,
      }])
    ),
  };
}
