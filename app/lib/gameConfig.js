// Shared game configuration — used by both server and client

export const GAME_CONFIG = {
  TICK_RATE: 2000,        // 2s per tick — gives players time to think
  ROUND_DURATION: 300,    // 300 ticks × 2s = 10 minutes
  MAX_PLAYERS: 5,
  MAX_ACTIONS_PER_ROUND: 60,
  ROOM_CODE_LENGTH: 4,
  EVENT_GRACE_TICKS: 30,  // No events during first ~minute of real time
  LAUNCH_USER_THRESHOLD: 50,    // Hitting this flips phase to "growth"
  // Stakes: burn rate eats revenue every tick once you've launched
  BURN_BASE: 15,          // Server / utilities baseline
  BURN_PER_PLAYER: 10,    // Salary per teammate (incl. bots)
};

// What "winning" looks like — set per startup sub-type. Reach this and you
// trigger an early Victory end screen. Otherwise the round just expires.
export const WIN_CONDITIONS = {
  saas:        { metric: 'revenue',   value: 10000, label: 'Reach $10,000 revenue' },
  mobileApp:   { metric: 'users',     value: 4000,  label: 'Reach 4,000 users' },
  ecommerce:   { metric: 'revenue',   value: 12000, label: 'Reach $12,000 revenue' },
  gameStudio:  { metric: 'users',     value: 3000,  label: 'Reach 3,000 happy players' },
  agency:      { metric: 'revenue',   value: 15000, label: 'Reach $15,000 revenue' },
  consulting:  { metric: 'revenue',   value: 18000, label: 'Reach $18,000 revenue' },
  marketplace: { metric: 'users',     value: 4500,  label: 'Reach 4,500 users' },
  freelance:   { metric: 'revenue',   value: 7000,  label: 'Reach $7,000 revenue' },
};

// Fixed staircase of milestones — one per phase. The currently-active one is
// pinned in the HUD so players always know what's next.
export const PHASE_MILESTONES = {
  idea:   { id: 'shipMvp',     description: 'Ship the MVP to launch your company', check: (m, s) => s.phase !== 'idea', reward: { revenue: 200 } },
  launch: { id: 'reach100',    description: 'Reach 100 users to enter Growth phase', check: (m) => m.users >= 100,  reward: { revenue: 300 } },
  growth: { id: 'reach5kRev',  description: 'Reach $5,000 revenue', check: (m) => m.revenue >= 5000, reward: { revenue: 500 } },
};

export const PHASES = {
  idea: { name: 'Idea', description: 'Validate the idea before building anything' },
  launch: { name: 'Launch', description: 'MVP is live — get first users' },
  growth: { name: 'Growth', description: 'Scale users, fix bugs, optimize' },
};

// Host picks a game type before the round starts. Each tweaks starting numbers
// and adds a flavor identity. Effects are intentionally small so balance stays sane.
export const GAME_TYPES = {
  product: {
    label: 'Product Business',
    emoji: '📦',
    subtypes: {
      saas:        { name: 'SaaS',        emoji: '☁️', startRevenue: 1000, revenueMultiplier: 1.2, startUsers: 0 },
      mobileApp:   { name: 'Mobile App',  emoji: '📱', startRevenue: 800,  revenueMultiplier: 0.9, startUsers: 0 },
      ecommerce:   { name: 'E-commerce',  emoji: '🛒', startRevenue: 1200, revenueMultiplier: 1.1, startUsers: 0 },
      gameStudio:  { name: 'Game Studio', emoji: '🎮', startRevenue: 600,  revenueMultiplier: 1.0, startUsers: 0 },
    },
  },
  service: {
    label: 'Service Business',
    emoji: '🛠️',
    subtypes: {
      agency:      { name: 'Agency',      emoji: '🏢', startRevenue: 1500, revenueMultiplier: 1.4, startUsers: 0 },
      consulting:  { name: 'Consulting',  emoji: '💼', startRevenue: 1500, revenueMultiplier: 1.6, startUsers: 0 },
      marketplace: { name: 'Marketplace', emoji: '🤝', startRevenue: 800,  revenueMultiplier: 1.0, startUsers: 0 },
      freelance:   { name: 'Freelance',   emoji: '💻', startRevenue: 500,  revenueMultiplier: 1.3, startUsers: 0 },
    },
  },
};

export const ROLES = {
  BACKEND: {
    id: 'backend',
    name: 'Backend Engineer',
    emoji: '⚙️',
    color: '#4fc3f7',
    description: 'Stability & APIs — bonus to bug fixes & optimization',
  },
  FRONTEND: {
    id: 'frontend',
    name: 'Frontend Engineer',
    emoji: '🎨',
    color: '#ce93d8',
    description: 'UX & Features — bonus to shipping & design',
  },
  DEVOPS: {
    id: 'devops',
    name: 'DevOps Engineer',
    emoji: '🔧',
    color: '#ffb74d',
    description: 'Infrastructure — bonus to scaling & reliability',
  },
  PM: {
    id: 'pm',
    name: 'Product Manager',
    emoji: '📋',
    color: '#81c784',
    description: 'Strategy — bonus to growth & team morale',
  },
  CHAOS: {
    id: 'chaos',
    name: 'Chaos Agent',
    emoji: '🔥',
    color: '#ef5350',
    description: 'Wild card — can sabotage or supercharge anything',
  },
};

// Role bonus multipliers: if your role matches, action effects are 1.5x
export const ROLE_BONUSES = {
  backend: ['fixBug', 'optimizeApi', 'codeReview', 'writeTests', 'refactorCode'],
  frontend: ['shipFeature', 'improveUx', 'abTest', 'darkMode', 'mobileOptimize'],
  devops: ['scaleInfra', 'addCache', 'setupCiCd', 'addMonitoring', 'rollback'],
  pm: ['boostFeature', 'reduceChaos', 'runSprint', 'teamLunch', 'pivotStrategy'],
  chaos: ['triggerIncident', 'marketShift', 'hackathon', 'allNighter', 'coffeeRun'],
};

// ========================
// ACTIONS — organized by category, ALL available to ALL roles
// (Role bonuses give 1.5x effects if action matches your role)
// ========================

export const ACTION_CATEGORIES = {
  engineering: { name: '🛠️ Engineering', description: 'Build and fix things' },
  product: { name: '📦 Product', description: 'Ship and grow' },
  infrastructure: { name: '🏗️ Infrastructure', description: 'Scale and stabilize' },
  team: { name: '👥 Team', description: 'Boost morale and productivity' },
  emergency: { name: '🚨 Emergency', description: 'Respond to crises' },
  strategy: { name: '💡 Strategy', description: 'Long-term plays' },
};

export const ACTIONS = {
  // ── IDEA PHASE (only these are available before MVP launches) ──
  validateIdea: {
    id: 'validateIdea', name: 'Validate Idea', emoji: '💡', cooldown: 4, category: 'engineering',
    description: 'Sketch the idea on a whiteboard — clarifies direction',
    effects: { happiness: 5 },
    phase: 'idea',
    maxUses: 2,
  },
  talkToUsers: {
    id: 'talkToUsers', name: 'Talk to Users', emoji: '🗣️', cooldown: 5, category: 'product',
    description: 'Interview potential users — refines the idea, no signups yet',
    effects: { happiness: 8 },
    phase: 'idea',
    maxUses: 3,
  },
  buildMvp: {
    id: 'buildMvp', name: 'Build MVP', emoji: '🛠️', cooldown: 8, category: 'engineering',
    description: 'Ship the first working version — launches the company!',
    effects: { users: 30, happiness: 10 },
    phase: 'idea',
    launchesGame: true,
    maxUses: 1,
  },

  // ── ENGINEERING ──
  fixBug: {
    id: 'fixBug', name: 'Fix Bug', emoji: '🐛', cooldown: 3, category: 'engineering',
    description: 'Squash a critical bug in the codebase',
    effects: { errors: -15 },
  },
  optimizeApi: {
    id: 'optimizeApi', name: 'Optimize API', emoji: '⚡', cooldown: 3, category: 'engineering',
    description: 'Tune database queries and API endpoints',
    effects: { latency: -50, errors: -5 },
  },
  codeReview: {
    id: 'codeReview', name: 'Code Review', emoji: '🔍', cooldown: 4, category: 'engineering',
    description: 'Review PRs to catch bugs before they ship',
    effects: { errors: -8, happiness: 3 },
  },
  writeTests: {
    id: 'writeTests', name: 'Write Tests', emoji: '🧪', cooldown: 5, category: 'engineering',
    description: 'Add automated tests to prevent regressions',
    effects: { errors: -12, latency: -10 },
  },
  refactorCode: {
    id: 'refactorCode', name: 'Refactor', emoji: '♻️', cooldown: 6, category: 'engineering',
    description: 'Clean up tech debt for long-term gains',
    effects: { errors: -5, latency: -30, happiness: 5 },
  },

  // ── PRODUCT ──
  shipFeature: {
    id: 'shipFeature', name: 'Ship Feature', emoji: '🚀', cooldown: 4, category: 'product',
    description: 'Launch a new feature to attract users',
    effects: { users: 80, errors: 3, revenue: 20 },
  },
  improveUx: {
    id: 'improveUx', name: 'Improve UX', emoji: '✨', cooldown: 3, category: 'product',
    description: 'Polish the user experience and UI',
    effects: { happiness: 12, users: 25 },
  },
  abTest: {
    id: 'abTest', name: 'A/B Test', emoji: '🔬', cooldown: 5, category: 'product',
    description: 'Run an experiment to optimize conversion',
    effects: { users: 40, revenue: 30 },
  },
  darkMode: {
    id: 'darkMode', name: 'Dark Mode', emoji: '🌙', cooldown: 6, category: 'product',
    description: 'Add dark mode — users love it!',
    effects: { happiness: 15, users: 60 },
  },
  mobileOptimize: {
    id: 'mobileOptimize', name: 'Mobile Optimize', emoji: '📱', cooldown: 5, category: 'product',
    description: 'Optimize for mobile devices',
    effects: { users: 100, happiness: 8, latency: -20 },
  },

  // ── INFRASTRUCTURE ──
  scaleInfra: {
    id: 'scaleInfra', name: 'Scale Servers', emoji: '📈', cooldown: 4, category: 'infrastructure',
    description: 'Add more server capacity',
    effects: { latency: -120, revenue: -10 },
  },
  addCache: {
    id: 'addCache', name: 'Add Cache', emoji: '💾', cooldown: 5, category: 'infrastructure',
    description: 'Add Redis caching layer',
    effects: { latency: -80, errors: -3 },
  },
  setupCiCd: {
    id: 'setupCiCd', name: 'Setup CI/CD', emoji: '🔄', cooldown: 7, category: 'infrastructure',
    description: 'Automate deployments — faster shipping',
    effects: { errors: -10, happiness: 5 },
  },
  addMonitoring: {
    id: 'addMonitoring', name: 'Add Monitoring', emoji: '📊', cooldown: 6, category: 'infrastructure',
    description: 'Set up alerts and dashboards',
    effects: { errors: -8, latency: -20 },
  },
  rollback: {
    id: 'rollback', name: 'Rollback Deploy', emoji: '⏪', cooldown: 2, category: 'emergency',
    description: 'Revert the last bad deployment',
    effects: { errors: -25, users: -20 },
  },

  // ── TEAM ──
  teamLunch: {
    id: 'teamLunch', name: 'Team Lunch', emoji: '🍕', cooldown: 6, category: 'team',
    description: 'Order pizza for the team',
    effects: { happiness: 20, revenue: -15 },
  },
  coffeeRun: {
    id: 'coffeeRun', name: 'Coffee Run', emoji: '☕', cooldown: 3, category: 'team',
    description: 'Caffeine boost for everyone',
    effects: { happiness: 8 },
  },
  runSprint: {
    id: 'runSprint', name: 'Sprint Planning', emoji: '📝', cooldown: 7, category: 'team',
    description: 'Organize priorities and boost efficiency',
    effects: { happiness: 10, errors: -5 },
  },
  allNighter: {
    id: 'allNighter', name: 'All-Nighter', emoji: '🌃', cooldown: 8, category: 'team',
    description: 'Pull an all-nighter — big output, morale hit',
    effects: { users: 120, errors: 10, happiness: -15, latency: -40 },
  },
  hackathon: {
    id: 'hackathon', name: 'Hackathon', emoji: '💡', cooldown: 8, category: 'team',
    description: '24hr innovation sprint — wild results!',
    effects: { users: 80, revenue: 40, errors: 8, happiness: 10 },
  },

  // ── EMERGENCY ──
  hotfix: {
    id: 'hotfix', name: 'Hotfix', emoji: '🩹', cooldown: 2, category: 'emergency',
    description: 'Quick patch for a critical issue',
    effects: { errors: -20, latency: 10 },
  },
  restartService: {
    id: 'restartService', name: 'Restart Service', emoji: '🔁', cooldown: 4, category: 'emergency',
    description: 'Turn it off and on again',
    effects: { latency: -200, errors: -10, users: -30 },
  },
  callExpert: {
    id: 'callExpert', name: 'Call Expert', emoji: '🧙', cooldown: 7, category: 'emergency',
    description: 'Bring in a consultant to help',
    effects: { errors: -20, latency: -80, revenue: -40 },
  },
  publicApology: {
    id: 'publicApology', name: 'Public Apology', emoji: '📢', cooldown: 6, category: 'emergency',
    description: 'Post a status update apologizing to users',
    effects: { happiness: 15, users: -10 },
  },

  // ── STRATEGY ──
  boostFeature: {
    id: 'boostFeature', name: 'Marketing Push', emoji: '📣', cooldown: 5, category: 'strategy',
    description: 'Run ads and social media campaigns',
    effects: { users: 150, revenue: -20 },
  },
  reduceChaos: {
    id: 'reduceChaos', name: 'Stabilize', emoji: '🧘', cooldown: 4, category: 'strategy',
    description: 'Feature freeze — focus on stability',
    effects: { errors: -15, happiness: 5, latency: -30 },
  },
  pivotStrategy: {
    id: 'pivotStrategy', name: 'Pivot!', emoji: '🔀', cooldown: 8, category: 'strategy',
    description: 'Change product direction — risky but rewarding',
    effects: { users: -50, revenue: 80, happiness: -5 },
    roleLock: 'pm',
  },
  raiseRound: {
    id: 'raiseRound', name: 'Raise Funding', emoji: '💰', cooldown: 8, category: 'strategy',
    description: 'Pitch to investors for more runway',
    effects: { revenue: 200 },
    roleLock: 'pm',
  },
  acquihire: {
    id: 'acquihire', name: 'Acqui-hire', emoji: '🤝', cooldown: 8, category: 'strategy',
    description: 'Acquire a small team for talent',
    effects: { errors: -15, happiness: 10, revenue: -50 },
    roleLock: 'pm',
  },

  // ── CHAOS AGENT SPECIALS ──
  triggerIncident: {
    id: 'triggerIncident', name: 'Trigger Incident', emoji: '💥', cooldown: 6, category: 'emergency',
    description: 'Deliberately cause chaos',
    effects: { errors: 25, latency: 200, happiness: -10 },
    roleLock: 'chaos',
  },
  marketShift: {
    id: 'marketShift', name: 'Market Crash', emoji: '🌊', cooldown: 8, category: 'strategy',
    description: 'Trigger a market downturn',
    effects: { users: -150, revenue: -60 },
    roleLock: 'chaos',
  },
};

export const EVENTS = {
  trafficSpike: {
    id: 'trafficSpike', name: 'Traffic Spike! 📈',
    description: 'A viral post is driving massive traffic!',
    severity: 'warning', effects: { users: 200, latency: 100 }, duration: 10,
  },
  serviceCrash: {
    id: 'serviceCrash', name: 'Service Crash! 💀',
    description: 'The main service just went down!',
    severity: 'critical', effects: { errors: 30, latency: 500, happiness: -15 }, duration: 15,
  },
  bugInjection: {
    id: 'bugInjection', name: 'Bug Swarm! 🐛',
    description: 'A bad deploy introduced a wave of bugs!',
    severity: 'warning', effects: { errors: 20, happiness: -5 }, duration: 8,
  },
  badReviews: {
    id: 'badReviews', name: 'Bad Reviews! ⭐',
    description: 'Users are leaving 1-star reviews!',
    severity: 'info', effects: { happiness: -20, users: -50 }, duration: 12,
  },
  costSurge: {
    id: 'costSurge', name: 'Cost Surge! 💸',
    description: 'Cloud costs just tripled overnight!',
    severity: 'warning', effects: { revenue: -100 }, duration: 10,
  },
  ddosAttack: {
    id: 'ddosAttack', name: 'DDoS Attack! 🛡️',
    description: 'Someone is flooding your servers!',
    severity: 'critical', effects: { latency: 800, errors: 15, users: -30 }, duration: 12,
  },
  viralMoment: {
    id: 'viralMoment', name: 'Viral Moment! 🎉',
    description: 'An influencer mentioned your product!',
    severity: 'info', effects: { users: 500, latency: 50 }, duration: 8,
  },
  dataLeak: {
    id: 'dataLeak', name: 'Data Leak! 🔓',
    description: 'User data was exposed in a breach!',
    severity: 'critical', effects: { happiness: -30, users: -100, errors: 10 }, duration: 15,
  },
  competitorLaunch: {
    id: 'competitorLaunch', name: 'Competitor Launch! ⚔️',
    description: 'A competitor just launched a similar product!',
    severity: 'warning', effects: { users: -80, happiness: -10 }, duration: 20,
  },
  techBlogFeature: {
    id: 'techBlogFeature', name: 'TechCrunch Feature! 📰',
    description: 'A major tech blog wrote about you!',
    severity: 'info', effects: { users: 300, revenue: 50 }, duration: 10,
  },
};

export const METRICS_CONFIG = {
  users: { name: 'Users', emoji: '👥', start: 0, min: 0, max: 10000, decayRate: 0, growthRate: 0, color: '#4fc3f7' },
  errors: { name: 'Errors', emoji: '🐛', start: 0, min: 0, max: 100, decayRate: 0, growthRate: 0, color: '#ef5350' },
  latency: { name: 'Latency', emoji: '⚡', start: 20, min: 10, max: 5000, decayRate: 0, growthRate: 0, unit: 'ms', color: '#ffb74d' },
  revenue: { name: 'Revenue', emoji: '💰', start: 1000, min: 0, max: 100000, decayRate: 0, growthRate: 0, unit: '$', color: '#81c784' },
  happiness: { name: 'Happiness', emoji: '😊', start: 80, min: 0, max: 100, decayRate: -0.2, growthRate: 0, unit: '%', color: '#ce93d8' },
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

// ── UPGRADES (buy with revenue) ──
export const UPGRADES = {
  coffeeMachine: {
    id: 'coffeeMachine', name: 'Coffee Machine', emoji: '☕', cost: 150, tier: 1,
    description: '+2 happiness per tick',
    effect: { type: 'tickBonus', metric: 'happiness', value: 2 },
    visual: 'coffee',
  },
  standingDesks: {
    id: 'standingDesks', name: 'Standing Desks', emoji: '🪑', cost: 200, tier: 1,
    description: '-5% base error growth',
    effect: { type: 'reduceGrowth', metric: 'errors', factor: 0.05 },
    visual: 'desks',
  },
  plantWall: {
    id: 'plantWall', name: 'Plant Wall', emoji: '🌿', cost: 100, tier: 1,
    description: '+1 happiness per tick',
    effect: { type: 'tickBonus', metric: 'happiness', value: 1 },
    visual: 'plants',
  },
  cicdPipeline: {
    id: 'cicdPipeline', name: 'CI/CD Pipeline', emoji: '🔄', cost: 500, tier: 2,
    description: '-20% action cooldowns',
    effect: { type: 'cooldownReduction', factor: 0.2 },
    visual: 'pipeline',
  },
  monitoringWall: {
    id: 'monitoringWall', name: 'Monitoring Dashboard', emoji: '📊', cost: 400, tier: 2,
    description: 'Events give 5s early warning',
    effect: { type: 'eventWarning', seconds: 5 },
    visual: 'monitoring',
  },
  pingPongTable: {
    id: 'pingPongTable', name: 'Ping Pong Table', emoji: '🏓', cost: 300, tier: 2,
    description: '+3 happiness per tick',
    effect: { type: 'tickBonus', metric: 'happiness', value: 3 },
    visual: 'pingpong',
  },
  autoScaling: {
    id: 'autoScaling', name: 'Auto-Scaling', emoji: '☁️', cost: 800, tier: 3,
    description: 'Latency capped at 500ms',
    effect: { type: 'metricCap', metric: 'latency', max: 500 },
    visual: 'cloud',
  },
  qaTeam: {
    id: 'qaTeam', name: 'QA Team', emoji: '🧪', cost: 700, tier: 3,
    description: 'Ship Feature no longer adds errors',
    effect: { type: 'removeNegative', action: 'shipFeature', metric: 'errors' },
    visual: 'qa',
  },
  seriesAOffice: {
    id: 'seriesAOffice', name: 'Series A Office', emoji: '🏢', cost: 1500, tier: 4,
    description: 'Full office upgrade + all tier 1 buffs',
    effect: { type: 'stageBoost' },
    visual: 'seriesA',
  },
};

// ── OBJECTIVE TEMPLATES ──
export const OBJECTIVES_POOL = [
  { id: 'reach500users', type: 'milestone', description: 'Reach 500 users', check: (m) => m.users >= 500, reward: { revenue: 100, score: 10 } },
  { id: 'reach2000users', type: 'milestone', description: 'Reach 2,000 users', check: (m) => m.users >= 2000, reward: { revenue: 200, score: 20 } },
  { id: 'reach5000users', type: 'milestone', description: 'Reach 5,000 users', check: (m) => m.users >= 5000, reward: { revenue: 500, score: 50 } },
  { id: 'lowErrors30s', type: 'sustain', description: 'Keep errors below 20 for 30s', check: (m) => m.errors < 20, sustainTicks: 30, reward: { revenue: 150, score: 15 } },
  { id: 'lowLatency20s', type: 'sustain', description: 'Keep latency below 100ms for 20s', check: (m) => m.latency < 100, sustainTicks: 20, reward: { revenue: 150, score: 15 } },
  { id: 'earn2000', type: 'milestone', description: 'Earn $2,000 revenue', check: (m) => m.revenue >= 2000, reward: { revenue: 200, score: 20 } },
  { id: 'happiness80', type: 'milestone', description: 'Get happiness above 80%', check: (m) => m.happiness >= 80, reward: { revenue: 100, score: 10 } },
  { id: 'earn5000', type: 'milestone', description: 'Earn $5,000 revenue', check: (m) => m.revenue >= 5000, reward: { revenue: 300, score: 30 } },
  { id: 'surviveCrash', type: 'milestone', description: 'Survive with errors below 70', check: (m) => m.errors < 70, reward: { revenue: 200, score: 20 } },
];

// ── EVENT RESPONSES ──
export const EVENT_RESPONSES = {
  trafficSpike: { label: '📈 Scale Up', effects: { latency: -80, users: 50 }, description: 'Spin up extra capacity' },
  serviceCrash: { label: '🔧 Emergency Fix', effects: { errors: -20, latency: -300 }, description: 'All hands on deck' },
  bugInjection: { label: '🐛 Bug Sweep', effects: { errors: -15, happiness: 3 }, description: 'Rapid triage' },
  badReviews: { label: '📢 Respond Publicly', effects: { happiness: 15, users: 20 }, description: 'Transparent communication' },
  costSurge: { label: '💡 Optimize Spend', effects: { revenue: 60 }, description: 'Cut unnecessary costs' },
  ddosAttack: { label: '🛡️ Activate Shield', effects: { latency: -600, errors: -10 }, description: 'Enable DDoS protection' },
  viralMoment: { label: '🎯 Capitalize', effects: { users: 300, revenue: 40 }, description: 'Double down on the moment' },
  dataLeak: { label: '🔒 Incident Response', effects: { happiness: 20, users: 50, errors: -5 }, description: 'Transparent disclosure' },
  competitorLaunch: { label: '⚔️ Counter-launch', effects: { users: 60, happiness: 5 }, description: 'Ship your killer feature' },
  techBlogFeature: { label: '📣 Amplify', effects: { users: 200, revenue: 30 }, description: 'Share it everywhere' },
};
