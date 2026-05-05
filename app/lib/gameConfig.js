// Shared game configuration — used by both server and client

export const GAME_CONFIG = {
  TICK_RATE: 2000,        // 2s per tick — gives players time to think
  ROUND_DURATION: 300,    // 300 ticks × 2s = 10 minutes
  MAX_PLAYERS: 6,
  MAX_ACTIONS_PER_ROUND: 60,
  ROOM_CODE_LENGTH: 4,
  EVENT_GRACE_TICKS: 30,
  LAUNCH_USER_THRESHOLD: 50,
  BURN_BASE: 15,                  // Fixed overhead (salaries are per-player; servers scale with users)
  // Server cost per tick = users × PER_USER + users² × QUADRATIC.
  // Linear keeps tiny startups cheap; quadratic punishes growth without optimization.
  SERVER_COST_PER_USER: 0.04,
  SERVER_COST_QUADRATIC: 0.000005,
  // Salary system — HR can adjust each player's salary; motivation tracks it.
  SALARY_MIN: 20,
  SALARY_DEFAULT: 50,
  SALARY_MAX: 250,
  MOTIVATION_DECAY: 0.5,
  // Funding system — work done in idea phase determines pitch outcome.
  FUNDING_BASE: 30000,            // Minimum if you just walk in with nothing
  FUNDING_PER_POINT: 3000,        // Each prep point unlocks more runway
  FUNDING_CAP: 200000,
};

// What "winning" looks like — set per startup sub-type. Reach this and you
// trigger an early Victory end screen. Otherwise the round just expires.
// Win thresholds are well above the $200k pitch-funding cap so getting funded
// alone never triggers victory — you have to grow the company.
export const WIN_CONDITIONS = {
  saas:        { metric: 'revenue',   value: 350000, label: 'Reach $350k revenue' },
  mobileApp:   { metric: 'users',     value: 8000,   label: 'Reach 8,000 users' },
  ecommerce:   { metric: 'revenue',   value: 400000, label: 'Reach $400k revenue' },
  gameStudio:  { metric: 'users',     value: 6000,   label: 'Reach 6,000 players' },
  agency:      { metric: 'revenue',   value: 450000, label: 'Reach $450k revenue' },
  consulting:  { metric: 'revenue',   value: 500000, label: 'Reach $500k revenue' },
  marketplace: { metric: 'users',     value: 8000,   label: 'Reach 8,000 users' },
  freelance:   { metric: 'revenue',   value: 280000, label: 'Reach $280k revenue' },
};

// Fixed staircase of milestones — one per phase. The currently-active one is
// pinned in the HUD so players always know what's next.
export const PHASE_MILESTONES = {
  idea:   { id: 'shipMvp',      description: 'Pitch investors to launch your company', check: (m, s) => s.phase !== 'idea', reward: { revenue: 0 } },
  launch: { id: 'reach100',     description: 'Reach 100 users to enter Growth phase', check: (m) => m.users >= 100, reward: { revenue: 500 } },
  growth: { id: 'reach1kUsers', description: 'Reach 1,000 users', check: (m) => m.users >= 1000, reward: { revenue: 2000 } },
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
      // arpu = revenue per user per tick at 100% happiness, 1× multiplier
      saas:        { name: 'SaaS',        emoji: '☁️', startRevenue: 1000, arpu: 0.50, revenueMultiplier: 1.2, startUsers: 0 },
      mobileApp:   { name: 'Mobile App',  emoji: '📱', startRevenue: 800,  arpu: 0.15, revenueMultiplier: 1.0, startUsers: 0 },
      ecommerce:   { name: 'E-commerce',  emoji: '🛒', startRevenue: 1200, arpu: 0.30, revenueMultiplier: 1.1, startUsers: 0 },
      gameStudio:  { name: 'Game Studio', emoji: '🎮', startRevenue: 600,  arpu: 0.20, revenueMultiplier: 1.0, startUsers: 0 },
    },
  },
  service: {
    label: 'Service Business',
    emoji: '🛠️',
    subtypes: {
      agency:      { name: 'Agency',      emoji: '🏢', startRevenue: 1500, arpu: 0.80, revenueMultiplier: 1.2, startUsers: 0 },
      consulting:  { name: 'Consulting',  emoji: '💼', startRevenue: 1500, arpu: 1.20, revenueMultiplier: 1.4, startUsers: 0 },
      marketplace: { name: 'Marketplace', emoji: '🤝', startRevenue: 800,  arpu: 0.25, revenueMultiplier: 1.0, startUsers: 0 },
      freelance:   { name: 'Freelance',   emoji: '💻', startRevenue: 500,  arpu: 0.60, revenueMultiplier: 1.2, startUsers: 0 },
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
  HR: {
    id: 'hr',
    name: 'HR Manager',
    emoji: '👔',
    color: '#fbcfe8',
    description: 'People — sets salaries that drive teammate motivation',
  },
};

// Role bonus multipliers: if your role matches, action effects are 1.5x
export const ROLE_BONUSES = {
  backend: ['fixBug', 'optimizeApi', 'codeReview', 'writeTests', 'refactorCode'],
  frontend: ['shipFeature', 'improveUx', 'abTest', 'darkMode', 'mobileOptimize'],
  devops: ['scaleInfra', 'addCache', 'setupCiCd', 'addMonitoring', 'rollback'],
  pm: ['boostFeature', 'reduceChaos', 'runSprint', 'pivotStrategy', 'raiseRound'],
  chaos: ['triggerIncident', 'marketShift', 'hackathon', 'allNighter', 'coffeeRun'],
  hr: ['teamLunch', 'coffeeRun', 'runSprint', 'publicApology'],
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

// Pre-launch sub-categories — only shown during the idea phase
export const IDEA_CATEGORIES = {
  'idea-product':  { name: '🧩 Product',  description: 'Build the thing' },
  'idea-research': { name: '🔍 Research', description: 'Validate the market' },
  'idea-pitch':    { name: '🎤 Pitch',    description: 'Raise funding' },
};

export const ACTIONS = {
  // ── PRE-LAUNCH: PRODUCT (build the thing) ──
  sketchWireframes: {
    id: 'sketchWireframes', name: 'Wireframes', emoji: '✏️', cooldown: 4, category: 'idea-product',
    description: 'Sketch UI flows — clarifies what to build (+2 prep)',
    effects: { happiness: 3 },
    phase: 'idea', preparationPoints: 2, maxUses: 2,
  },
  buildPrototype: {
    id: 'buildPrototype', name: 'Build Prototype', emoji: '🧩', cooldown: 6, category: 'idea-product',
    description: 'Working clickable prototype (+4 prep)',
    effects: { happiness: 5 },
    phase: 'idea', preparationPoints: 4, maxUses: 2,
  },
  codeBackend: {
    id: 'codeBackend', name: 'Code Backend', emoji: '⚙️', cooldown: 5, category: 'idea-product',
    description: 'Set up servers + database (+3 prep)',
    effects: { happiness: 4 },
    phase: 'idea', preparationPoints: 3, maxUses: 2,
  },
  qaTest: {
    id: 'qaTest', name: 'QA Pass', emoji: '🧪', cooldown: 4, category: 'idea-product',
    description: 'Find bugs before users do (+2 prep)',
    effects: { happiness: 3 },
    phase: 'idea', preparationPoints: 2, maxUses: 2,
  },

  // ── PRE-LAUNCH: RESEARCH ──
  marketResearch: {
    id: 'marketResearch', name: 'Market Research', emoji: '📊', cooldown: 5, category: 'idea-research',
    description: 'Study the market — sharpens positioning (+3 prep)',
    effects: { happiness: 4 },
    phase: 'idea', preparationPoints: 3, maxUses: 2,
  },
  competitorAnalysis: {
    id: 'competitorAnalysis', name: 'Competitor Scan', emoji: '🔍', cooldown: 4, category: 'idea-research',
    description: 'Map competitor strengths & gaps (+2 prep)',
    effects: { happiness: 3 },
    phase: 'idea', preparationPoints: 2, maxUses: 2,
  },
  talkToUsers: {
    id: 'talkToUsers', name: 'User Interview', emoji: '🗣️', cooldown: 3, category: 'idea-research',
    description: 'Talk to potential users — short, frequent (+1 prep each)',
    effects: { happiness: 5 },
    phase: 'idea', preparationPoints: 1, maxUses: 5,
  },
  userSurvey: {
    id: 'userSurvey', name: 'Run Survey', emoji: '📝', cooldown: 5, category: 'idea-research',
    description: 'Quantitative survey across many users (+2 prep)',
    effects: { happiness: 4 },
    phase: 'idea', preparationPoints: 2, maxUses: 2,
  },

  // ── PRE-LAUNCH: PITCH ──
  writePitchDeck: {
    id: 'writePitchDeck', name: 'Pitch Deck', emoji: '📑', cooldown: 5, category: 'idea-pitch',
    description: 'Write the deck — story, numbers, ask (+3 prep)',
    effects: { happiness: 4 },
    phase: 'idea', preparationPoints: 3, maxUses: 2,
  },
  practicePitch: {
    id: 'practicePitch', name: 'Practice Pitch', emoji: '🎤', cooldown: 3, category: 'idea-pitch',
    description: 'Rehearse — smoother delivery (+1 prep each)',
    effects: { happiness: 3 },
    phase: 'idea', preparationPoints: 1, maxUses: 4,
  },
  pitchInvestors: {
    id: 'pitchInvestors', name: 'Pitch Investors', emoji: '💰', cooldown: 8, category: 'idea-pitch',
    description: 'Pitch for funding — launches the company! Funding scales with your prep.',
    effects: { users: 30, happiness: 10 },
    phase: 'idea',
    launchesGame: true,
    maxUses: 1,
  },

  // ── ENGINEERING ──
  fixBug: {
    id: 'fixBug', name: 'Fix Bug', emoji: '🐛', cooldown: 3, category: 'engineering',
    description: 'Squash a critical bug. Buff: stable platform (10t)',
    effects: { errors: -15 },
    grantsBuff: { id: 'stable', ticks: 10 },
  },
  optimizeApi: {
    id: 'optimizeApi', name: 'Optimize API', emoji: '⚡', cooldown: 3, category: 'engineering',
    description: 'Tune queries & endpoints. Buff: infra ready (12t)',
    effects: { latency: -50, errors: -5 },
    grantsBuff: { id: 'infra', ticks: 12 },
  },
  codeReview: {
    id: 'codeReview', name: 'Code Review', emoji: '🔍', cooldown: 4, category: 'engineering',
    description: 'Review PRs. Buff: reviewed code (12t)',
    effects: { errors: -8, happiness: 3 },
    grantsBuff: { id: 'reviewed', ticks: 12 },
  },
  writeTests: {
    id: 'writeTests', name: 'Write Tests', emoji: '🧪', cooldown: 5, category: 'engineering',
    description: 'Add automated tests. Buff: tested (20t)',
    effects: { errors: -12, latency: -10 },
    grantsBuff: { id: 'tests', ticks: 20 },
  },
  refactorCode: {
    id: 'refactorCode', name: 'Refactor', emoji: '♻️', cooldown: 6, category: 'engineering',
    description: 'Clean up tech debt for long-term gains',
    effects: { errors: -5, latency: -30, happiness: 5 },
    motivationFloor: 60,
  },

  // ── PRODUCT ──
  shipFeature: {
    id: 'shipFeature', name: 'Ship Feature', emoji: '🚀', cooldown: 4, category: 'product',
    description: 'Launch a new feature to attract users (dev cost: $80, bug risk!)',
    effects: { users: 80, errors: 3, revenue: -80 },
    motivationFloor: 50, bugRisk: 0.4, bugErrors: 12,
    amplifiedBy: { tests: 1.4, reviewed: 1.3, infra: 1.2 },
  },
  improveUx: {
    id: 'improveUx', name: 'Improve UX', emoji: '✨', cooldown: 3, category: 'product',
    description: 'Polish the experience (cost: $40)',
    effects: { happiness: 12, users: 25, revenue: -40 },
    amplifiedBy: { tests: 1.2, reviewed: 1.2 },
  },
  abTest: {
    id: 'abTest', name: 'A/B Test', emoji: '🔬', cooldown: 5, category: 'product',
    description: 'Experiment to optimize conversion (cost: $60)',
    effects: { users: 40, revenue: -60 },
    motivationFloor: 50,
    amplifiedBy: { monitor: 1.5, infra: 1.2 },
  },
  darkMode: {
    id: 'darkMode', name: 'Dark Mode', emoji: '🌙', cooldown: 6, category: 'product',
    description: 'Add dark mode — users love it! (cost: $50)',
    effects: { happiness: 15, users: 60, revenue: -50 },
    motivationFloor: 50,
    amplifiedBy: { reviewed: 1.3, tests: 1.2 },
  },
  mobileOptimize: {
    id: 'mobileOptimize', name: 'Mobile Optimize', emoji: '📱', cooldown: 5, category: 'product',
    description: 'Optimize for mobile (cost: $100, bug risk). Synergy: Scale + Cache.',
    effects: { users: 100, happiness: 8, latency: -20, revenue: -100 },
    motivationFloor: 55, bugRisk: 0.3, bugErrors: 8,
    amplifiedBy: { infra: 1.5, cache: 1.3, tests: 1.2 },
  },

  // ── INFRASTRUCTURE ──
  scaleInfra: {
    id: 'scaleInfra', name: 'Scale Servers', emoji: '📈', cooldown: 4, category: 'infrastructure',
    description: 'Add server capacity. Buff: infra ready (15t)',
    effects: { latency: -120, revenue: -10 },
    grantsBuff: { id: 'infra', ticks: 15 },
  },
  addCache: {
    id: 'addCache', name: 'Add Cache', emoji: '💾', cooldown: 5, category: 'infrastructure',
    description: 'Add Redis layer. Buff: cached (15t)',
    effects: { latency: -80, errors: -3 },
    grantsBuff: { id: 'cache', ticks: 15 },
  },
  setupCiCd: {
    id: 'setupCiCd', name: 'Setup CI/CD', emoji: '🔄', cooldown: 7, category: 'infrastructure',
    description: 'Automate deploys. Buff: tests + reviewed (15t)',
    effects: { errors: -10, happiness: 5 },
    motivationFloor: 55,
    grantsBuff: { id: 'tests', ticks: 15 },
  },
  addMonitoring: {
    id: 'addMonitoring', name: 'Add Monitoring', emoji: '📊', cooldown: 6, category: 'infrastructure',
    description: 'Alerts & dashboards. Buff: observed (20t)',
    effects: { errors: -8, latency: -20 },
    motivationFloor: 50,
    grantsBuff: { id: 'monitor', ticks: 20 },
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
    description: 'Organize priorities. Buff: aligned (15t)',
    effects: { happiness: 10, errors: -5 },
    motivationFloor: 40,
    grantsBuff: { id: 'aligned', ticks: 15 },
  },
  allNighter: {
    id: 'allNighter', name: 'All-Nighter', emoji: '🌃', cooldown: 8, category: 'team',
    description: 'All-nighter — big output, morale hit, bug risk',
    effects: { users: 120, errors: 10, happiness: -15, latency: -40 },
    motivationFloor: 80, bugRisk: 0.5, bugErrors: 15,
    amplifiedBy: { aligned: 1.3, tests: 1.2 },
  },
  hackathon: {
    id: 'hackathon', name: 'Hackathon', emoji: '💡', cooldown: 8, category: 'team',
    description: '24hr innovation sprint — wild results, pricey, bug risk',
    effects: { users: 80, revenue: -100, errors: 8, happiness: 10 },
    motivationFloor: 70, bugRisk: 0.4, bugErrors: 10,
    amplifiedBy: { aligned: 1.3, infra: 1.2 },
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
    motivationFloor: 45,
  },
  callExpert: {
    id: 'callExpert', name: 'Call Expert', emoji: '🧙', cooldown: 7, category: 'emergency',
    description: 'Bring in a consultant to help',
    effects: { errors: -20, latency: -80, revenue: -40 },
    motivationFloor: 45,
  },
  publicApology: {
    id: 'publicApology', name: 'Public Apology', emoji: '📢', cooldown: 6, category: 'emergency',
    description: 'Post a status update apologizing to users',
    effects: { happiness: 15, users: -10 },
  },

  // ── STRATEGY ──
  boostFeature: {
    id: 'boostFeature', name: 'Marketing Push', emoji: '📣', cooldown: 5, category: 'strategy',
    description: 'Ads & social. Synergy: stable + infra (or you flame out)',
    effects: { users: 150, revenue: -180 },
    motivationFloor: 50,
    amplifiedBy: { stable: 1.4, infra: 1.3, monitor: 1.2 },
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
    motivationFloor: 75,
    roleLock: 'pm',
  },
  raiseRound: {
    id: 'raiseRound', name: 'Raise Funding', emoji: '💰', cooldown: 8, category: 'strategy',
    description: 'Pitch to investors — major cash injection',
    effects: { revenue: 1500 },
    motivationFloor: 65,
    roleLock: 'pm',
    maxUses: 2,
  },
  acquihire: {
    id: 'acquihire', name: 'Acqui-hire', emoji: '🤝', cooldown: 8, category: 'strategy',
    description: 'Acquire a small team for talent',
    effects: { errors: -15, happiness: 10, revenue: -50 },
    motivationFloor: 65,
    roleLock: 'pm',
  },

  // ── CHAOS AGENT SPECIALS ──
  triggerIncident: {
    id: 'triggerIncident', name: 'Trigger Incident', emoji: '💥', cooldown: 6, category: 'emergency',
    description: 'Deliberately cause chaos',
    effects: { errors: 25, latency: 200, happiness: -10 },
    motivationFloor: 50,
    roleLock: 'chaos',
  },
  marketShift: {
    id: 'marketShift', name: 'Market Crash', emoji: '🌊', cooldown: 8, category: 'strategy',
    description: 'Trigger a market downturn',
    effects: { users: -150, revenue: -60 },
    motivationFloor: 60,
    roleLock: 'chaos',
  },
};

export const EVENTS = {
  // effects = flat damage (always applied — keeps small startups vulnerable).
  // pctEffects = additional fraction of the current metric value, applied on top.
  // The combo means a 100-user company gets killed by the flat term, and a
  // 5,000-user company gets clobbered by the percentage term.
  trafficSpike: {
    id: 'trafficSpike', name: 'Traffic Spike! 📈',
    description: 'A viral post is driving massive traffic!',
    severity: 'warning', effects: { users: 100, latency: 120 },
    pctEffects: { users: 0.06 }, duration: 10,
  },
  serviceCrash: {
    id: 'serviceCrash', name: 'Service Crash! 💀',
    description: 'The main service just went down — users are bouncing!',
    severity: 'critical', effects: { errors: 30, latency: 500, happiness: -15, users: -50 },
    pctEffects: { users: -0.08 }, duration: 15,
  },
  bugInjection: {
    id: 'bugInjection', name: 'Bug Swarm! 🐛',
    description: 'A bad deploy introduced a wave of bugs!',
    severity: 'warning', effects: { errors: 22, happiness: -8 }, duration: 8,
  },
  badReviews: {
    id: 'badReviews', name: 'Bad Reviews! ⭐',
    description: 'Reviews are already public. The damage is done.',
    severity: 'warning', effects: { happiness: -25, users: -60 },
    pctEffects: { users: -0.10 }, duration: 12,
  },
  costSurge: {
    id: 'costSurge', name: 'Cost Surge! 💸',
    description: 'Cloud bill spiked. You signed the contract — pay up.',
    severity: 'warning', effects: { revenue: -100 },
    pctEffects: { revenue: -0.15 }, duration: 10,
  },
  ddosAttack: {
    id: 'ddosAttack', name: 'DDoS Attack! 🛡️',
    description: 'Someone is flooding your servers!',
    severity: 'critical', effects: { latency: 800, errors: 15, users: -30 },
    pctEffects: { users: -0.05 }, duration: 12,
  },
  viralMoment: {
    id: 'viralMoment', name: 'Viral Moment! 🎉',
    description: 'An influencer mentioned your product!',
    severity: 'info', effects: { users: 200, latency: 50 },
    pctEffects: { users: 0.15 }, duration: 8,
  },
  dataLeak: {
    id: 'dataLeak', name: 'Data Leak! 🔓',
    description: 'User data was exposed in a breach!',
    severity: 'critical', effects: { happiness: -30, errors: 10, users: -100 },
    pctEffects: { users: -0.15 }, duration: 15,
  },
  competitorLaunch: {
    id: 'competitorLaunch', name: 'Competitor Launch! ⚔️',
    description: 'A rival shipped what you were building. The market shifted.',
    severity: 'warning', effects: { happiness: -15, users: -100 },
    pctEffects: { users: -0.20 }, duration: 20,
  },
  techBlogFeature: {
    id: 'techBlogFeature', name: 'TechCrunch Feature! 📰',
    description: 'A major tech blog wrote about you!',
    severity: 'info', effects: { users: 150, revenue: 50 },
    pctEffects: { users: 0.10 }, duration: 10,
  },
};

export const METRICS_CONFIG = {
  users: { name: 'Users', emoji: '👥', start: 0, min: 0, max: 10000, decayRate: 0, growthRate: 0, color: '#4fc3f7' },
  errors: { name: 'Errors', emoji: '🐛', start: 0, min: 0, max: 100, decayRate: 0, growthRate: 0, color: '#ef5350' },
  latency: { name: 'Latency', emoji: '⚡', start: 20, min: 10, max: 5000, decayRate: 0, growthRate: 0, unit: 'ms', color: '#ffb74d' },
  revenue: { name: 'Revenue', emoji: '💰', start: 1000, min: 0, max: 1000000, decayRate: 0, growthRate: 0, unit: '$', color: '#81c784' },
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
  // badReviews: unavoidable — reviews are already public.
  // costSurge: unavoidable — invoice already due.
  // Costs are flat + percentage of cash — tiny startups ride out cheap, scaled cos pay real money.
  trafficSpike: { label: '📈 Scale Up', effects: { latency: -80, users: 50, revenue: -20 }, pctCost: 0.04, description: 'Spin up capacity ($20 + 4% cash)' },
  serviceCrash: { label: '🔧 Emergency Fix', effects: { errors: -20, latency: -300, revenue: -50 }, pctCost: 0.10, description: 'All hands on deck ($50 + 10% cash)' },
  bugInjection: { label: '🐛 Bug Sweep', effects: { errors: -15, happiness: 3, revenue: -20 }, pctCost: 0.04, description: 'Rapid triage ($20 + 4% cash)' },
  ddosAttack: { label: '🛡️ Activate Shield', effects: { latency: -600, errors: -10, revenue: -30 }, pctCost: 0.06, description: 'DDoS protection ($30 + 6% cash)' },
  viralMoment: { label: '🎯 Capitalize', effects: { users: 300, revenue: 40 }, description: 'Double down on the moment' },
  dataLeak: { label: '🔒 Incident Response', effects: { happiness: 20, users: 50, errors: -5, revenue: -80 }, pctCost: 0.12, description: 'Transparent disclosure ($80 + 12% cash)' },
  // competitorLaunch: unavoidable — they already shipped.
  techBlogFeature: { label: '📣 Amplify', effects: { users: 200, revenue: 30 }, description: 'Share it everywhere' },
};
