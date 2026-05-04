// Shared game configuration — used by both server and client

export const GAME_CONFIG = {
  TICK_RATE: 1000,        // 1 tick per second
  ROUND_DURATION: 300,    // 5 minutes = 300 ticks
  MAX_PLAYERS: 5,
  MAX_ACTIONS_PER_ROUND: 30,
  ROOM_CODE_LENGTH: 4,
};

export const ROLES = {
  BACKEND: {
    id: 'backend',
    name: 'Backend Engineer',
    emoji: '⚙️',
    color: '#4fc3f7',
    description: 'Stability & APIs',
    actions: ['fixBug', 'optimizeApi'],
  },
  FRONTEND: {
    id: 'frontend',
    name: 'Frontend Engineer',
    emoji: '🎨',
    color: '#ce93d8',
    description: 'UX & Features',
    actions: ['shipFeature', 'improveUx'],
  },
  DEVOPS: {
    id: 'devops',
    name: 'DevOps Engineer',
    emoji: '🔧',
    color: '#ffb74d',
    description: 'Infrastructure & Scaling',
    actions: ['scaleInfra', 'addCache'],
  },
  PM: {
    id: 'pm',
    name: 'Product Manager',
    emoji: '📋',
    color: '#81c784',
    description: 'Prioritization & Strategy',
    actions: ['boostFeature', 'reduceChaos'],
  },
  CHAOS: {
    id: 'chaos',
    name: 'Chaos Agent',
    emoji: '🔥',
    color: '#ef5350',
    description: 'Inject Randomness',
    actions: ['triggerIncident', 'marketShift'],
  },
};

export const ACTIONS = {
  fixBug: {
    id: 'fixBug',
    name: 'Fix Bug',
    emoji: '🐛',
    cooldown: 5,
    description: 'Squash a critical bug',
    effects: { errors: -15 },
    roles: ['backend'],
  },
  shipFeature: {
    id: 'shipFeature',
    name: 'Ship Feature',
    emoji: '🚀',
    cooldown: 8,
    description: 'Launch a new feature to users',
    effects: { users: 50, errors: 5 },
    roles: ['frontend'],
  },
  scaleInfra: {
    id: 'scaleInfra',
    name: 'Scale Infra',
    emoji: '📈',
    cooldown: 10,
    description: 'Add more server capacity',
    effects: { latency: -100 },
    roles: ['devops'],
  },
  improveUx: {
    id: 'improveUx',
    name: 'Improve UX',
    emoji: '✨',
    cooldown: 7,
    description: 'Polish the user experience',
    effects: { happiness: 10, users: 20 },
    roles: ['frontend'],
  },
  optimizeApi: {
    id: 'optimizeApi',
    name: 'Optimize API',
    emoji: '⚡',
    cooldown: 6,
    description: 'Optimize backend performance',
    effects: { latency: -50, errors: -5 },
    roles: ['backend'],
  },
  addCache: {
    id: 'addCache',
    name: 'Add Cache',
    emoji: '💾',
    cooldown: 8,
    description: 'Add caching to reduce load',
    effects: { latency: -80, errors: -3 },
    roles: ['devops'],
  },
  boostFeature: {
    id: 'boostFeature',
    name: 'Boost Feature',
    emoji: '📣',
    cooldown: 10,
    description: 'Amplify feature impact with marketing',
    effects: { users: 100, revenue: 50 },
    roles: ['pm'],
  },
  reduceChaos: {
    id: 'reduceChaos',
    name: 'Reduce Chaos',
    emoji: '🧘',
    cooldown: 12,
    description: 'Calm things down and reduce incident rate',
    effects: { errors: -10, happiness: 5 },
    roles: ['pm'],
  },
  triggerIncident: {
    id: 'triggerIncident',
    name: 'Trigger Incident',
    emoji: '💥',
    cooldown: 15,
    description: 'Cause chaos in the system',
    effects: { errors: 25, latency: 200, happiness: -10 },
    roles: ['chaos'],
  },
  marketShift: {
    id: 'marketShift',
    name: 'Market Shift',
    emoji: '🌊',
    cooldown: 20,
    description: 'Shift market conditions dramatically',
    effects: { users: -100, revenue: -30 },
    roles: ['chaos'],
  },
};

export const EVENTS = {
  trafficSpike: {
    id: 'trafficSpike',
    name: 'Traffic Spike! 📈',
    description: 'A viral post is driving massive traffic!',
    severity: 'warning',
    effects: { users: 200, latency: 100 },
    duration: 10,
  },
  serviceCrash: {
    id: 'serviceCrash',
    name: 'Service Crash! 💀',
    description: 'The main service just went down!',
    severity: 'critical',
    effects: { errors: 30, latency: 500, happiness: -15 },
    duration: 15,
  },
  bugInjection: {
    id: 'bugInjection',
    name: 'Bug Swarm! 🐛',
    description: 'A bad deploy introduced a wave of bugs!',
    severity: 'warning',
    effects: { errors: 20, happiness: -5 },
    duration: 8,
  },
  badReviews: {
    id: 'badReviews',
    name: 'Bad Reviews! ⭐',
    description: 'Users are leaving 1-star reviews!',
    severity: 'info',
    effects: { happiness: -20, users: -50 },
    duration: 12,
  },
  costSurge: {
    id: 'costSurge',
    name: 'Cost Surge! 💸',
    description: 'Cloud costs just tripled overnight!',
    severity: 'warning',
    effects: { revenue: -100 },
    duration: 10,
  },
};

export const METRICS_CONFIG = {
  users: { name: 'Users', emoji: '👥', start: 100, min: 0, max: 10000, decayRate: 0, growthRate: 5, color: '#4fc3f7' },
  errors: { name: 'Errors', emoji: '🐛', start: 10, min: 0, max: 100, decayRate: 0, growthRate: 1, color: '#ef5350' },
  latency: { name: 'Latency', emoji: '⚡', start: 50, min: 10, max: 5000, decayRate: 0, growthRate: 2, unit: 'ms', color: '#ffb74d' },
  revenue: { name: 'Revenue', emoji: '💰', start: 500, min: 0, max: 100000, decayRate: 0, growthRate: 3, unit: '$', color: '#81c784' },
  happiness: { name: 'Happiness', emoji: '😊', start: 70, min: 0, max: 100, decayRate: -0.5, growthRate: 0, unit: '%', color: '#ce93d8' },
};

export const ROOM_STATES = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  SCORING: 'scoring',
  DONE: 'done',
};

export const WORLD_STAGES = [
  { name: 'Garage Startup', minUsers: 0, maxUsers: 500, description: 'A tiny garage with a dream' },
  { name: 'Small Office', minUsers: 500, maxUsers: 2000, description: 'You got your first real office!' },
  { name: 'Growing Company', minUsers: 2000, maxUsers: 5000, description: 'Multiple rooms and a coffee machine' },
  { name: 'Tech Campus', minUsers: 5000, maxUsers: 10000, description: 'You made it! Multi-floor headquarters' },
];
