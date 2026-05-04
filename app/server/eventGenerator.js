// Event generator — randomly triggers events based on game state

import { EVENTS } from '../lib/gameConfig.js';

const EVENT_KEYS = Object.keys(EVENTS);

// Minimum ticks between events (prevents overwhelming players early)
const MIN_EVENT_INTERVAL = 20; // ~20 seconds
const MAX_EVENT_INTERVAL = 45; // ~45 seconds

export function createEventGenerator() {
  let nextEventTick = randomBetween(10, 20); // First event after 10-20 seconds
  let eventCount = 0;

  return {
    shouldTriggerEvent(tick) {
      return tick >= nextEventTick;
    },

    generateEvent(tick, metrics) {
      eventCount++;

      // Pick event weighted by game state
      const eventId = pickWeightedEvent(metrics);

      // Schedule next event (gets more frequent as game progresses)
      const progressFactor = Math.max(0.5, 1 - (tick / 300) * 0.5);
      const interval = randomBetween(
        Math.round(MIN_EVENT_INTERVAL * progressFactor),
        Math.round(MAX_EVENT_INTERVAL * progressFactor)
      );
      nextEventTick = tick + interval;

      return eventId;
    },

    getNextEventTick() {
      return nextEventTick;
    },
  };
}

function pickWeightedEvent(metrics) {
  // Weight events based on current game state for more interesting gameplay
  const weights = {};

  for (const key of EVENT_KEYS) {
    weights[key] = 1; // base weight
  }

  // If errors are low, bugs are more likely
  if (metrics.errors < 20) {
    weights.bugInjection = 3;
  }

  // If users are high, traffic spikes are more likely
  if (metrics.users > 1000) {
    weights.trafficSpike = 3;
  }

  // If happiness is high, bad reviews are less likely
  if (metrics.happiness > 80) {
    weights.badReviews = 0.3;
  } else if (metrics.happiness < 40) {
    weights.badReviews = 3;
  }

  // If revenue is high, cost surges are more likely
  if (metrics.revenue > 2000) {
    weights.costSurge = 2;
  }

  // Service crashes become more likely at scale
  if (metrics.users > 3000 && metrics.latency > 200) {
    weights.serviceCrash = 3;
  }

  // Weighted random selection
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * totalWeight;

  for (const key of EVENT_KEYS) {
    rand -= weights[key] || 0;
    if (rand <= 0) return key;
  }

  return EVENT_KEYS[0]; // fallback
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
