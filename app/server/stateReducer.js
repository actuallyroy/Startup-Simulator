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
    arpu: sub?.arpu || 0.2,
    actionCounts: {},   // team-wide use count per action id
    preparationPoints: 0, // earned during idea phase, drives pitch funding
    fundingRaised: 0,
    activeBuffs: {}, // { buffId: expiresTick } — synergy buffs left by foundation work
  };
}

// Probability model:
//   - Base success chance = 0.85, modified by motivation (±0.20 swing around 50).
//   - Critical hit (top 10% of success roll): positive deltas ×1.5.
//   - Failure: positive deltas ×0.3, negative deltas ×1.5.
//   - Independent bug roll for risky actions (bugRisk on the action), reduced by motivation.
// Returns { state, outcome: { result, hadBug, hasRoleBonus } } so callers can toast it.
export function applyAction(state, actionId, playerId, playerRole, upgrades, motivation = 70) {
  const action = ACTIONS[actionId];
  if (!action) return { state, outcome: null };

  const roleBonusActions = ROLE_BONUSES[playerRole] || [];
  const hasRoleBonus = roleBonusActions.includes(actionId);
  const roleMul = hasRoleBonus ? 1.5 : 1.0;

  // Roll for outcome
  const motMod = ((motivation - 50) / 100) * 0.4; // ±0.20
  const successChance = Math.max(0.25, Math.min(0.97, 0.85 + motMod));
  const roll = Math.random();
  let result;
  let posMul, negMul;
  if (roll < successChance * 0.1) { result = 'critical'; posMul = 1.5 * roleMul; negMul = 0.7; }
  else if (roll < successChance)   { result = 'success';  posMul = 1.0 * roleMul; negMul = 1.0; }
  else                             { result = 'failure';  posMul = 0.3 * roleMul; negMul = 1.5; }

  // Synergy: if foundation buffs are active and this action declares
  // amplifiedBy entries that match, multiply positive deltas. Multiplicative
  // stacking, capped at 2.5× so a chain of buffs can't go infinite.
  let synergyMul = 1.0;
  const usedBuffs = [];
  if (action.amplifiedBy) {
    for (const [buffId, mult] of Object.entries(action.amplifiedBy)) {
      const expires = state.activeBuffs?.[buffId];
      if (expires && expires > state.tick) {
        synergyMul *= mult;
        usedBuffs.push(buffId);
      }
    }
    if (synergyMul > 2.5) synergyMul = 2.5;
  }
  posMul *= synergyMul;

  const newMetrics = { ...state.metrics };
  for (const [metric, delta] of Object.entries(action.effects)) {
    if (newMetrics[metric] === undefined) continue;
    // Positive vs negative is metric-aware: errors/latency growing is bad.
    const isBadMetric = metric === 'errors' || metric === 'latency';
    const isBeneficial = isBadMetric ? delta < 0 : delta > 0;
    // Magnitude roll: listed value is the cap, real result is ramp(0..1) ** 1.5.
    // That skews outcomes toward lower numbers — hitting the listed maximum is rare.
    // Failures floor the roll to keep them stinging; criticals always max out.
    let mag;
    if (result === 'critical') mag = 1.0;
    else if (result === 'failure') mag = 0.2 + 0.3 * Math.random();
    else mag = Math.random() ** 1.5;
    let effectiveDelta = delta * mag * (isBeneficial ? posMul : negMul);
    if (upgrades.includes('qaTeam') && actionId === 'shipFeature' && metric === 'errors' && delta > 0) {
      effectiveDelta = 0;
    }
    const config = METRICS_CONFIG[metric];
    newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + effectiveDelta));
  }

  // Independent bug roll for risky actions; motivation lowers the chance.
  // Active 'tests' buff cuts bug risk in half — that's why writing tests matters.
  let hadBug = false;
  if (action.bugRisk && !(upgrades.includes('qaTeam') && actionId === 'shipFeature')) {
    const testsActive = (state.activeBuffs?.tests || 0) > state.tick;
    const baseBugRisk = action.bugRisk * (testsActive ? 0.5 : 1.0);
    const adjBugChance = Math.max(0.03, baseBugRisk - (motivation - 50) / 200);
    if (Math.random() < adjBugChance) {
      hadBug = true;
      const cfg = METRICS_CONFIG.errors;
      newMetrics.errors = Math.min(cfg.max, newMetrics.errors + (action.bugErrors || 8));
    }
  }

  if (upgrades.includes('autoScaling')) {
    newMetrics.latency = Math.min(500, newMetrics.latency);
  }

  return { state: { ...state, metrics: newMetrics }, outcome: { result, hadBug, hasRoleBonus, synergyMul, usedBuffs } };
}

// Event response effects map
const EVENT_RESPONSE_EFFECTS = {
  trafficSpike: { latency: -80, users: 50, revenue: -20 },
  serviceCrash: { errors: -20, latency: -300, revenue: -50 },
  bugInjection: { errors: -15, happiness: 3, revenue: -20 },
  ddosAttack: { latency: -600, errors: -10, revenue: -30 },
  viralMoment: { users: 300, revenue: 40 },
  dataLeak: { happiness: 20, users: 50, errors: -5, revenue: -80 },
  techBlogFeature: { users: 200, revenue: 30 },
};

// Percentage-of-revenue cost on top of the flat hit. Tiny startup gets dinged
// a sliver, scaled-up company pays real money to fight fires.
const EVENT_RESPONSE_PCT = {
  trafficSpike: { revenue: -0.04 },
  serviceCrash: { revenue: -0.10 },
  bugInjection: { revenue: -0.04 },
  ddosAttack:   { revenue: -0.06 },
  dataLeak:     { revenue: -0.12 },
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
  // Percentage costs scale with current value of the metric.
  const pct = EVENT_RESPONSE_PCT[eventId];
  if (pct) {
    for (const [metric, p] of Object.entries(pct)) {
      if (newMetrics[metric] === undefined) continue;
      const config = METRICS_CONFIG[metric];
      const change = Math.round(newMetrics[metric] * p);
      newMetrics[metric] = Math.max(config.min, Math.min(config.max, newMetrics[metric] + change));
    }
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

export function tickState(state, playerCount = 1, totalSalary = 0) {
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

  // Income — users × ARPU × happiness × type-multiplier, minus error penalty.
  // Burn — server costs + salaries every tick once the company exists.
  // Idea phase: no income, no burn.
  let income = 0;
  let burn = 0;
  if (state.phase !== 'idea') {
    const arpu = state.arpu || 0;
    const happinessFactor = newMetrics.happiness / 100;
    const mult = state.revenueMultiplier || 1.0;
    const errorPenalty = newMetrics.errors * 0.4; // bugs cost real money
    income = Math.max(0, Math.round(newMetrics.users * arpu * happinessFactor * mult - errorPenalty));
    // Burn = fixed overhead + salaries + server cost (linear + quadratic in users).
    // The quadratic term means doubling users more than doubles infra cost.
    const u = newMetrics.users;
    const serverCost = u * GAME_CONFIG.SERVER_COST_PER_USER + u * u * GAME_CONFIG.SERVER_COST_QUADRATIC;
    burn = Math.round(GAME_CONFIG.BURN_BASE + totalSalary + serverCost);
    newMetrics.revenue = Math.max(
      METRICS_CONFIG.revenue.min,
      Math.min(METRICS_CONFIG.revenue.max, newMetrics.revenue + income - burn),
    );
  }

  // Cross-metric effects
  if (newMetrics.errors > 50) newMetrics.latency = Math.min(METRICS_CONFIG.latency.max, newMetrics.latency + 5);
  // Bugs churn users: above the 20-error tolerance threshold, you lose a
  // fraction of your user base per tick. Scales with both error count and
  // current users — small startups bleed a few, big ones hemorrhage.
  if (newMetrics.errors > 20 && state.phase !== 'idea') {
    const churnPct = ((newMetrics.errors - 20) / 100) * 0.025;
    const churn = Math.ceil(newMetrics.users * churnPct);
    newMetrics.users = Math.max(METRICS_CONFIG.users.min, newMetrics.users - churn);
  }
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

  return { ...state, metrics: newMetrics, activeEvents, tick: state.tick + 1, stage, lastBurn: burn, lastIncome: income };
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
