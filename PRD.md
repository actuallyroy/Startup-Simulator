# 📄 PRD: **Startup (Terraria-style Dev Simulation Game)**

---

## 1. 🧠 Overview

**Product Name:** Startup
**Type:** Multiplayer, real-time, pixel-art simulation game
**Platform:** Web (Mac M-chip + Windows via browser)
**Session Length:** 5–10 minutes (optimized for daily standups)

**Core Idea:**
A team-based, Terraria-style 2D simulation where developers run a startup together—balancing growth, stability, and chaos in real time.

---

## 2. 🎯 Goals

### Primary Goals

* Make standups **engaging and fun**
* Improve **engineering intuition** (trade-offs, scaling, debugging)
* Encourage **team collaboration**

### Success Metrics

* Daily play rate ≥ 80%
* Avg session duration: 5–10 mins
* “Fun score” (team feedback) ≥ 8/10
* Repeat engagement after 2 weeks

---

## 3. 👥 Target Users

* Small dev teams (3–8 people)
* Startups / engineering teams
* Interview prep groups (bonus use case)

---

## 4. 🎮 Core Gameplay

## 4.1 Game Loop

1. Players join a shared room
2. System initializes startup state
3. Each player gets a role
4. Real-time events + player actions occur
5. System evolves visually
6. End-of-round scoring + summary

---

## 5. 👥 Roles & Abilities

| Role              | Responsibilities  | Actions                            |
| ----------------- | ----------------- | ---------------------------------- |
| Backend Engineer  | Stability, APIs   | Fix bug, optimize API              |
| Frontend Engineer | UX, features      | Improve UI, ship feature           |
| DevOps Engineer   | Infra, scaling    | Scale servers, restart service     |
| Product Manager   | Prioritization    | Boost feature impact, reduce chaos |
| Chaos / Market    | Inject randomness | Trigger incidents                  |

**Constraints:**

* Each player: max 2–3 actions per round
* Cooldowns prevent spamming

---

## 6. ⚙️ Game Systems

## 6.1 Core Metrics

| Metric    | Description        |
| --------- | ------------------ |
| Users     | Traffic/load       |
| Latency   | System performance |
| Errors    | Failures           |
| Revenue   | Growth             |
| Happiness | User satisfaction  |

---

## 6.2 Events (System-driven)

* Traffic Spike
* Service Crash
* Bug Injection
* Bad Reviews
* Cost Surge

**Rules:**

* 1–2 events per minute
* Escalation if ignored

---

## 6.3 Player Actions

| Action       | Effect                 |
| ------------ | ---------------------- |
| Fix Bug      | ↓ Errors               |
| Ship Feature | ↑ Users, ↑ Errors risk |
| Scale Infra  | ↓ Latency              |
| Improve UX   | ↑ Happiness            |
| Add Cache    | ↓ Load                 |

---

## 7. 🧱 World Design

## 7.1 Visual Style

* Pixel-art (Terraria-inspired)
* Tile-based office layout

## 7.2 World Evolution

| Stage | Visual              |
| ----- | ------------------- |
| Early | Small room          |
| Mid   | Multi-room office   |
| Late  | Multi-floor startup |

---

## 8. 🖥️ UI/UX

## 8.1 Main Screen

* Center: Pixel world (office)
* Top bar: Metrics (Users, Errors, etc.)
* Bottom: Player actions
* Right: Event feed

## 8.2 Feedback

* Red flashes → errors
* Slow animations → latency
* Coins → revenue
* Characters → users

---

## 9. 🧮 Scoring System

At end of session:

* Uptime Score
* Growth Score
* Stability Score
* Efficiency Bonus

Leaderboard:

* Daily
* Weekly

---

## 10. 🔄 Multiplayer Mechanics

* Real-time sync via WebSockets
* Shared global state
* Conflict resolution: last action wins / priority rules

---

## 11. 🛠️ Technical Architecture

## 11.1 Frontend

* React + Canvas / PixiJS
* State rendering (real-time)

## 11.2 Backend

* Node.js or .NET WebSocket server
* Game loop engine (tick-based)

## 11.3 Game Engine

* Tick rate: ~1/sec
* Event generator
* State reducer

---

## 12. 🧪 MVP Scope (v1)

### Must-have

* 1 room (grid)
* 5 roles
* 3 metrics (Users, Errors, Latency)
* 3 actions
* 3 events
* Real-time sync

### Nice-to-have

* Pixel animations
* Leaderboard
* Sound effects

---

## 13. 🚫 Out of Scope (for now)

* Complex economy
* Persistent progression
* AI bots
* Mobile app

---

## 14. 🗓️ Suggested Timeline

### Week 1

* Game loop + backend state
* Basic UI (no graphics)

### Week 2

* Multiplayer sync
* Actions + events

### Week 3

* Pixel rendering
* Animations + polish

---

## 15. ⚠️ Risks

| Risk               | Mitigation                    |
| ------------------ | ----------------------------- |
| Too complex        | Keep MVP minimal              |
| Not fun            | Focus on chaos + visuals      |
| Lag in multiplayer | Use lightweight state updates |

---

## 16. 🔥 Future Enhancements

* Persistent startup progression
* Skill trees per role
* Custom scenarios (e.g., “Black Friday traffic”)
* AI-generated chaos events

---

## 17. 💡 Key Principle (Do NOT ignore)

> If players don’t laugh, panic, or argue during the session—it’s failing.

---

## 18. ✅ Definition of Done (v1)

* 5 players can join
* Play a 5-minute round
* See system evolve visually
* Get a score
* Want to play again