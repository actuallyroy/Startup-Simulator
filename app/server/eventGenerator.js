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

// Base weights — bad events are common, good events are rare. Running a
// startup is mostly putting out fires; jackpots should feel like jackpots.
const BASE_WEIGHTS = {
  // Bad — frequent
  trafficSpike: 2.0,
  serviceCrash: 2.0,
  bugInjection: 2.5,
  badReviews: 2.0,
  costSurge: 1.8,
  ddosAttack: 1.5,
  dataLeak: 1.2,
  competitorLaunch: 2.0,
  // Good — rare
  viralMoment: 0.35,
  techBlogFeature: 0.5,
};

function pickWeightedEvent(metrics, tick) {
  const weights = { ...BASE_WEIGHTS };

  // Contextual nudges — make conditions actually matter.
  if (metrics.errors > 30) weights.bugInjection *= 1.5;
  if (metrics.users > 1000) weights.trafficSpike *= 1.4;
  if (metrics.happiness < 40) weights.badReviews *= 1.8;
  if (metrics.revenue > 5000) weights.costSurge *= 1.5;
  if (metrics.users > 3000 && metrics.latency > 200) weights.serviceCrash *= 1.8;
  if (tick > 120) { weights.ddosAttack *= 1.4; weights.dataLeak *= 1.4; }
  // Good events get tiny boosts only when you've earned them.
  if (metrics.users > 2000) weights.viralMoment *= 1.4;
  if (metrics.users > 500 && metrics.happiness > 70) weights.techBlogFeature *= 1.4;

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
