# Pixel Frontline — goal, milestones and verified state

Last reviewed: 2026-10-16, V1.2.6. This is the canonical product goal and acceptance ledger; evidence and status must be updated in each iteration.

## North-star product goal

Create a shareable, replayable pixel-arena survival game where a new player can understand basic controls without assistance within 30 seconds, play a meaningful ~10-minute battle/mutation loop, and experiment with visibly different builds. Prioritize fun, comprehensible choices and progression over feature count. **These are goals, not proven claims.**

## M1 — reliable 10-minute combat loop — PARTIAL, not accepted

| Acceptance criterion | Status | Evidence / what remains |
| --- | --- | --- |
| Enemies visible within 10 seconds | Partial | `src/core/game.js` constructor spawns 6 enemies immediately; offline build Chromium canvas smoke passed. Timing on ordinary player devices unverified. |
| Basic movement/dash/weapon controls graspable in 30 sec | Partial | V1.2.1 `CombatGuide` presents contextual, nonblocking hints and advances on real action events; 4 deterministic tests + Chromium keyboard smoke passed. Needs at least one unfamiliar human test. |
| 3 distinct weapons, defensive dodge, death/retry, wave/upgrade loop | Partial | 35 passing Node tests plus Chromium weapon/pause/retry smoke, including genome stack scaling and capped multishot (V1.2.3). Manual full-loop end-to-end browser test not done. |
| Wave 4 Sentinel reached and can be defeated normally | Partial | `npm run soak` three 600-s simulated controller runs each reached and killed a boss without manually mutating wave/enemy state; real browser natural-wave progression not yet verified end-to-end. |
| 10 minutes continuous browser session without uncaught errors/hangs, retry works | **ENGINEERING PASS (scripted input), human/device NOT VERIFIED** | V1.2.7 real Chromium keyboard/mouse run: 600.53s active wall-clock input (626.02s total wall clock), 1028 keyboard cycles, W27, 26 normal UI mutation picks, 6 natural Sentinel defeats, 68 hurt events, 0 live-session deaths/retries, 431 dodges, max rAF gap 66.6ms, 0 JS page errors. Separately, a natural no-healing death at W8 after 75.68s wall clock and retry in 43.7ms confirmed the death/restart UI. Sandbox blocked file:// and localhost navigation; exact built HTML executed by set_content. This is autonomous UI input, not real novice gameplay or local Windows file-opening verification. |
| `npm test`, `npm run build` successful | **PASS** | V1.2.7 local Node 22 `npm test`: **41 / 41 PASS**; `npm run build`, `npm run soak`, `npm run difficulty` PASS; Chromium 600 accelerated game seconds, two-run restart-card regression, natural death/retry and real-time 600s controls also PASS. |

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

### V1.2.4 M1 progress — targeted Hunter telegraphs, not M1 acceptance

The deterministic no-healing orbit+dash diagnostic at seeds 7/13/33, 180 simulated seconds, observed **0/0/0 hits before → 11/5/2 hits after** in an in-memory execution of the exact patched JS engine (not npm, not human research). Existing Hunter contact attacks remain, but hunters can now warn for 0.50s about a capped (36px) projected intercept at up to 75px, then strike only the preannounced location. Reversal, sidestep or dash remains counterplay; six new focused regression tests document it. Three 600-game-second healing-controller simulations on the patched engine finished and defeated real Sentinel bosses, but those are still simulated game time.

**Unresolved M1 gates:** native file-open and ordinary real-time 10-minute browser test, first-time human instruction comprehension, and tuning predicted warning visibility. Do not mark M1 PASS from scripted diagnostics alone. The first logged design pass avoids making enemies instantly or silently damage the player.

**V1.2.4 verified after corrective test commit:** local Node 22 `npm test` **41/41 PASS**, `npm run build` PASS, `npm run soak` 3 seeded 600-game-second runs PASS, `npm run difficulty` PASS; GitHub Actions push run 38753172265 also passed all four. Chromium loaded real built standalone HTML with `page.set_content`; initial tutorial, movement, weapon 2, pause, 600 accelerated game seconds to W38 with 9 boss wins and 37 upgrades, restart, Hunter predicted-warning rendering (36px lead/0.5s windup), and 0 browser script errors. This is NOT a 600-second real-time or novice human test; M1 still PARTIAL.

### V1.2.5 checkpoint — normal-speed HTML controls and focus safety (2026-10-15)

- Implemented: when the game window loses focus or the tab becomes hidden, the active run automatically pauses. P resumes intentionally. A real Chromium test verifies game time freezes during blur and movement/dash/weapons/restart remain functional.
- The PR CI now requires `scripts/autodev_playtest.py` (minimum 24s **real-time keyboard/mouse play**) and `scripts/browser_soak.py` (600 **accelerated game seconds**) in addition to Node unit/build/soak/difficulty tests. Screenshot evidence is retained for review.
- Local isolated-container evidence was recorded on the available V1.2.3 materialized baseline plus this patch: 35/35 Node tests, build, 3 seeded soaks, difficulty script, real Chromium input 26.57 wall seconds (wave 3 / two mutations / no JS errors) and accelerated browser soak all passed. Full V1.2.4-derived integration awaits GitHub CI; do not conflate baselines.
- **M1 remains PARTIAL / not accepted**: human novice comprehension, real device file opening, 600 seconds of *normal-speed* continuous browser play and satisfactory difficulty have not been proven.

### V1.2.6 M1 progress — restart mutation integrity (2026-10-16)

**Fixed, tested:** The UI cached mutation offers only by `wave` number. After a first-wave upgrade, starting a new run reuses `wave=1`, so the overlay incorrectly preserved an old card deck that could fail when clicked. Real Chromium keyboard-driven two-run play reproduced the mismatch before code change; `newRun()` now clears the per-wave DOM cache and refreshes the second run's actual choices. The new browser regression executes two **natural** first-wave clears and selections and is required in GitHub CI, in addition to 24s wall-clock input smoke and 600 accelerated *game*-second integration.

**Still PARTIAL:** A 24s real-time browser input test and accelerated long session are engineering validation, not a 10-minute wall-clock play session, a novice comprehension study, a manual Windows file-open test or proof of replayability. Do not mark M1 complete until these independent gates have evidence.

### V1.2.7 M1 checkpoint - 600-second real-time browser test + readable health HUD (2026-10-16)

- Actual V1.2.6 baseline real-input run: 600.25s active wall-clock input (624.87s total wall clock), 1027 keyboard cycles, W25, 24 normal UI mutation picks, 6 natural Sentinel defeats, 73 hurt events, 0 live-session deaths/retries, 440 dodges, max rAF gap 83.3ms, 0 JS page errors. No game-time acceleration or direct game.step calls.
- Actual patched V1.2.7 real-input run: 600.53s active wall-clock input (626.02s total wall clock), 1028 keyboard cycles, W27, 26 normal UI mutation picks, 6 natural Sentinel defeats, 68 hurt events, 0 live-session deaths/retries, 431 dodges, max rAF gap 66.6ms, 0 JS page errors. In both, Playwright used keyboard and mouse over the actual built standalone HTML and waited for wall-clock intervals; interaction snapshots and screenshots were captured.
- Found and repaired one visible readability defect: stacking hull mutations caused the HUD to show raw floating-point max HP (e.g. `178 / 195.83333333333331` at W8). The HUD now rounds the displayed maximum up to an integer while preserving exact simulation math and health bar proportion. Patched observed labels include `176 / 196` and `207 / 214`. The real-time browser script checks this on every action.
- Independent normal-speed no-healing Chromium run died naturally at wave 8 after 75.68s wall time; death overlay visible and UI retry completed in 43.7ms. The 600s sustain runs did **not** die; do not conflate the separate death test with uninterrupted survival.
- This is **engineering evidence, not user research**. Native `file://` and localhost were blocked in the isolated browser; set_content was a disclosed last fallback. No genuine first-time user study, Windows double-click open, public demo, or replay desire has been verified. M1 stays PARTIAL and M2-M4 remain NOT ACCEPTED.

### NEXT HOURLY TASK (after V1.2.7, M1 remains PARTIAL)

Run first-play viewport QA on the real standalone HTML at 1366x768 and 1280x720. Audit canvas, health bar, three weapon cards, and mutation choices for unintended scrolling, clipping or overlap. This is higher value than adding weapons because common laptop viewports were not verified by the 1280x900 continuous-play test. Inspect `src/style.css`, `src/main.js`, and relevant Playwright scripts. Success requires screenshots of both window sizes, a naturally reached mutation dialog with all choices clickable, verified WASD/Shift/weapon/restart controls, zero script errors, and full Node/build/soak/difficulty regression. Fix only the single worst verified usability failure. No claim of human-novice acceptance.
