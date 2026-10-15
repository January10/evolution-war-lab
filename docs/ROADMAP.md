# Pixel Frontline — goal, milestones and verified state

Last reviewed: 2026-10-15, V1.2.1. This is the canonical product goal and acceptance ledger; evidence and status must be updated in each iteration.

## North-star product goal

Create a shareable, replayable pixel-arena survival game where a new player can understand basic controls without assistance within 30 seconds, play a meaningful ~10-minute battle/mutation loop, and experiment with visibly different builds. Prioritize fun, comprehensible choices and progression over feature count. **These are goals, not proven claims.**

## M1 — reliable 10-minute combat loop — PARTIAL, not accepted

| Acceptance criterion | Status | Evidence / what remains |
| --- | --- | --- |
| Enemies visible within 10 seconds | Partial | `src/core/game.js` constructor spawns 6 enemies immediately; offline build Chromium canvas smoke passed. Timing on ordinary player devices unverified. |
| Basic movement/dash/weapon controls graspable in 30 sec | Partial | V1.2.1 `CombatGuide` presents contextual, nonblocking hints and advances on real action events; 4 deterministic tests + Chromium keyboard smoke passed. Needs at least one unfamiliar human test. |
| 3 distinct weapons, defensive dodge, death/retry, wave/upgrade loop | Partial | 29 passing unit tests plus Chromium weapon/pause/retry smoke. Manual full-loop end-to-end browser test not done. |
| Wave 4 Sentinel reached and can be defeated normally | Partial | `npm run soak` three 600-s simulated controller runs each reached and killed a boss without manually mutating wave/enemy state; real browser natural-wave progression not yet verified end-to-end. |
| 10 minutes continuous browser session without uncaught errors/hangs, retry works | **NOT VERIFIED** | Only a 600-second **headless core simulation** (`scripts/soak.mjs`, 3 seeded legal-input runs) and short browser UI smoke (0 page exceptions). Do not conflate these with 10-minute browser play. |
| `npm test`, `npm run build` successful | **PASS** | V1.2.1 local: **29 / 29 tests**, build created `dist/index.html` + `dist/play.html`; `npm run soak` passed 3 seeded sessions. |

**Highest-priority M1 finding:** scripted controller clears the first wave in **3.72–4.65 seconds** across seeds 7/13/33; that leaves too little time for players to learn movement before a mutation dialog interrupts combat. The same scripted controller can reach waves 24–28 in ten game minutes with repeated HP upgrades; difficulty pacing likely needs a real playtest and adjustment. Next iteration: address early-wave pacing in a way that preserves active combat (no mandatory idle countdown), then add browser-level uninterrupted full-loop regression.

## M2 — meaningful evolution builds — NOT STARTED / not accepted

- 3 mechanically distinct and viable mutation paths (firepower, mobility, risk/reward); each has behavioral/visual evidence after at least 2–3 picks.
- Existing six modifiers mostly adjust numbers. Existing scatter extra projectile is mechanical but does not prove three paths.
- Automated tests and demonstrations for each build, after M1 acceptance.

## M3 — play feel, balanced difficulty and replayability — NOT STARTED / not accepted

- Impact readability, boss cadence, feedback, evolution choice readability, restart ≤10 seconds, 10-minute play-quality/performance probes.
- Recruit **5 genuine external players**, seek **3 wanting another run**; **no player feedback collected yet**. This gate cannot be self-certified by AI.

## M4 — public, verified playable delivery — NOT STARTED / not accepted

- Complete shareable browser build; instructions; green regressions; no critical start bugs; **real accessible public demo URL**; PR/change evidence and user-authorized release.
- No automatic `main` merge or public deployment without user approval.

## Iteration order and guardrails

Fix stability and blocking usability issues → verify full combat loop → create distinctive evolution choices → polish replayability/difficulty → prepare a public candidate. If a gate is unverified, do not silently advance. Each hourly cycle updates this ledger with actual evidence or explicitly records the blocker. Never report estimates as user research.
