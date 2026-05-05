// Event generator — weighted random events

import { EVENTS } from '../lib/gameConfig.js';

const EVENT_KEYS = Object.keys(EVENTS);
const MIN_EVENT_INTERVAL = 15;
const MAX_EVENT_INTERVAL = 35;

export function createEventGenerator() {
  let nextEventTick = randomBetween(8, 15);

  return {
    shouldTriggerEvent(tick) { return tick >= nextEventTick; },

    generateEvent(tick, metrics) {
      const eventId = pickWeightedEvent(metrics, tick);
      const progressFactor = Math.max(0.4, 1 - (tick / 300) * 0.6);
      const interval = randomBetween(
        Math.round(MIN_EVENT_INTERVAL * progressFactor),
        Math.round(MAX_EVENT_INTERVAL * progressFactor)
      );
      nextEventTick = tick + interval;
      return eventId;
    },
  };
}

function pickWeightedEvent(metrics, tick) {
  const weights = {};
  for (const key of EVENT_KEYS) weights[key] = 1;

  if (metrics.errors < 20) weights.bugInjection = 3;
  if (metrics.users > 1000) weights.trafficSpike = 2;
  if (metrics.happiness < 40) weights.badReviews = 3;
  if (metrics.revenue > 2000) weights.costSurge = 2;
  if (metrics.users > 3000 && metrics.latency > 200) weights.serviceCrash = 3;
  if (metrics.users > 2000) weights.viralMoment = 1.5;
  if (tick > 120) { weights.ddosAttack = 2; weights.dataLeak = 1.5; }
  if (tick > 60) weights.competitorLaunch = 1.5;
  if (metrics.users > 500) weights.techBlogFeature = 1.5;

  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  let rand = Math.random() * totalWeight;
  for (const key of EVENT_KEYS) {
    rand -= weights[key] || 0;
    if (rand <= 0) return key;
  }
  return EVENT_KEYS[0];
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
