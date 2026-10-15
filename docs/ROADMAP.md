# Pixel Frontline — goal, milestones and verified state

Last reviewed: 2026-10-15, V1.2.3. This is the canonical product goal and acceptance ledger; evidence and status must be updated in each iteration.

## North-star product goal

Create a shareable, replayable pixel-arena survival game where a new player can understand basic controls without assistance within 30 seconds, play a meaningful ~10-minute battle/mutation loop, and experiment with visibly different builds. Prioritize fun, comprehensible choices and progression over feature count. **These are goals, not proven claims.**

## M1 — reliable 10-minute combat loop — PARTIAL, not accepted

| Acceptance criterion | Status | Evidence / what remains |
| --- | --- | --- |
| Enemies visible within 10 seconds | Partial | `src/core/game.js` constructor spawns 6 enemies immediately; offline build Chromium canvas smoke passed. Timing on ordinary player devices unverified. |
| Basic movement/dash/weapon controls graspable in 30 sec | Partial | V1.2.1 `CombatGuide` presents contextual, nonblocking hints and advances on real action events; 4 deterministic tests + Chromium keyboard smoke passed. Needs at least one unfamiliar human test. |
| 3 distinct weapons, defensive dodge, death/retry, wave/upgrade loop | Partial | 35 passing Node tests plus Chromium weapon/pause/retry smoke, including genome stack scaling and capped multishot (V1.2.3). Manual full-loop end-to-end browser test not done. |
| Wave 4 Sentinel reached and can be defeated normally | Partial | `npm run soak` three 600-s simulated controller runs each reached and killed a boss without manually mutating wave/enemy state; real browser natural-wave progression not yet verified end-to-end. |
| 10 minutes continuous browser session without uncaught errors/hangs, retry works | **NOT VERIFIED** | V1.2.3: optional `python scripts/browser_soak.py` exercised real bundled offline HTML in Chromium for 600 **accelerated game seconds** with natural combat/upgrade/Boss flow (seed 7 reached wave 25, 6 Boss defeats, 24 mutations, and succeeded restart; 0 uncaught JS errors). This is reproducible browser *simulation*, NOT 600 seconds real-time or human novice testing; verify full normal-speed device play. |
| `npm test`, `npm run build` successful | **PASS** | V1.2.3 local: **35 / 35 tests**, build created `dist/index.html` + `dist/play.html`; `npm run soak` passed 3 seeded sessions. |

**Early-wave M1 fix (V1.2.2):** replaced the 3.72–4.65s scripted clear with kill-triggered reinforcement squads, retaining the initial six and limiting simultaneous threats to eight. Three seeded scripted runs now clear at **12.60 / 12.53 / 14.65s**; no forced idle time. These are not novice tests and do not establish pleasant difficulty. Next: test the uninterrupted full combat/mutation/Boss/retry loop at browser level and evaluate newbie survival/pacing; no invented user feedback.

**Genome pacing result (V1.2.3):** an unmodified no-healing **stationary** controller previously reached 675–869 waves in 600 simulated seconds (4/5 seeds), from compounding +22% damage/+17% speed (fire rate) choices. `src/core/game.js` now applies bounded diminishing returns to repeatable stat mutations and caps multishot at three stacks; `test/genome_scaling.test.js` covers advertised first pick, repeated gain, soft limits and valid choices. `npm run difficulty` (seeds 7/13/33, *no hull or regeneration*, legal inputs) now records stationary deaths at **75.60–109.75 game seconds, wave 8–12**. However the skilled scripted orbit+dash policy still survives 600 game seconds at waves 80–89 with at most one hit, exposing a **major predictable pursuit / circle-kiting exploit** to address later. This diagnostic does not imply novice survival/fun; no human usability evidence exists. `npm run soak` confirms 3 sustain-build seeded 600-game-second runs reach waves 22/25/31 and defeat natural bosses. Chromium via `page.set_content` confirms 600 accelerated game seconds, wave 25, 6 bosses, 24 mutations, restart, zero page errors. Real-time browser session and native file opening remain unverified.

## M2 — meaningful evolution builds — NOT STARTED / not accepted

- 3 mechanically distinct and viable mutation paths (firepower, mobility, risk/reward); each has behavioral/visual evidence after at least 2–3 picks.
- Existing six modifiers mostly adjust numbers; V1.2.3 adds stack saturation and a three-shot limit but not new evolution paths. Existing scatter extra projectile is mechanical but does not prove three paths.
- Automated tests and demonstrations for each build, after M1 acceptance.

## M3 — play feel, balanced difficulty and replayability — NOT STARTED / not accepted

- Impact readability, boss cadence, feedback, evolution choice readability, restart ≤10 seconds, 10-minute play-quality/performance probes.
- Recruit **5 genuine external players**, seek **3 wanting another run**; **no player feedback collected yet**. This gate cannot be self-certified by AI.

## M4 — public, verified playable delivery — NOT STARTED / not accepted

- Complete shareable browser build; instructions; green regressions; no critical start bugs; **real accessible public demo URL**; PR/change evidence and user-authorized release.
- No automatic `main` merge or public deployment without user approval.

## Iteration order and guardrails

Fix stability and blocking usability issues → verify full combat loop → create distinctive evolution choices → polish replayability/difficulty → prepare a public candidate. If a gate is unverified, do not silently advance. Each hourly cycle updates this ledger with actual evidence or explicitly records the blocker. Never report estimates as user research.
