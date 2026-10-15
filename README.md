# Evolution War Lab — Pixel Frontline (Rebuild V1.2.4)

A playable, **freshly rebuilt** arena survival game using HTML Canvas and vanilla JavaScript. No runtime dependencies, no game asset downloads. Inspired by the separate Evolution War Lab V0.x simulation prototypes, but this codebase is rebuilt around player agency and arcade feedback, not the old 3D simulation dashboard.

## Start

Requires Node.js >=18.

```sh
npm run dev
```

Open http://127.0.0.1:5173 (or change the `PORT` environment variable).

```sh
npm test
npm run build
npm run preview
npm run difficulty # deterministic stationary vs mobile, no-healing difficulty diagnostic
```

`dist/index.html` is the entrypoint for a static website. `dist/play.html` is a **single, fully offline playable HTML file** that opens directly by double-clicking, with zero installation. Deploy `dist/` to any static host, including GitHub Pages (the repository must be connected and Pages must be configured).

## How to play

- **WASD or arrow keys:** move your cyan prototype.
- **Auto-fire:** automatically attacks nearest enemies, even if you do not press the mouse button.
- **Hold left mouse button on arena:** aim precisely toward the mouse cursor.
- **1 / 2 / 3:** switch between Pulse Rifle / Star Shotgun / Prism Beam. When a wave is complete, choose one of three mutations instead.
- **Shift while moving:** temporary invulnerable dash.
- **Attack warnings:** normal enemies lock a red strike square before damage; dodge out or dash through impact. Brutes warn longer with larger areas.
- **Sentinel boss:** wave 4 (and every fourth wave) includes a golden elite with a large HP bar. Its 1.10-second warning marks two intersecting fire lanes: move **diagonally off both lanes** or dash during impact. A living Sentinel blocks the next mutation.
- **P:** pause / resume.
- **R:** new random-seed run.
- **Sound toggle:** turns on synthesized WebAudio after user gesture.

Clear an enemy wave, choose one of three randomized genome mutations, then try to survive the stronger next wave. Combo bonuses reward rapid kill streaks.

## Architecture

- `src/core/game.js`: headless fixed-delta combat, enemy behavior, wave transitions, mutations, weapon mechanics, collision and damage.
- `src/core/data.js`: centralized balance values for weapons, enemies, upgrades.
- `src/core/rng.js`: seeded PRNG and math utilities.
- `src/ui/draw.js`: pixel-perfect Canvas renderer. Presentation never changes combat outcomes.
- `src/ui/sound.js`: optional synthesized shooting/hit tones.
- `src/main.js`: DOM, input, fixed-step loop and HUD.
- `test/game.test.js`: deterministic behavioral regression tests.

## Acceptance checklist

1. [ ] Open game in browser and see a cyan unit under attack within 10 seconds.
2. [ ] Change weapons via 1/2/3 and see different shot effects.
3. [ ] Hold mouse left button to aim at a specific enemy.
4. [ ] Clear wave, choose a mutation, and see next wave.
5. [ ] Survive several waves and notice increasing enemy count and difficulty.
6. [ ] When an enemy gets close, see a red warning square, then sidestep or dash to avoid the locked strike.
7. [ ] Reach wave 4: see the unique gold Sentinel with HP bar; move diagonally out of both red cross lanes before the strike lands.
8. [ ] Eliminate the Sentinel to unlock the next mutation choice.
9. [ ] Check console and performance for runtime errors.

The Node test suite verifies core combat, telegraphed strikes, dodge, Sentinel wave timing and attack geometry, and invulnerability. A Chromium smoke test exercised the bundled game UI, weapon hotkeys, pausing, wave-upgrade overlay, and V1.1 telegraph rendering. Standard navigation to local files/localhost was blocked by the isolated QA environment, so **verify normal launch on your own device** before publishing.

## Hourly automation handoff

Canonical source archive in ChatGPT Library: `/evolution-war-lab-rebuild-active.zip` (after first delivery).

An hourly developer agent should first fetch that archive, read `ITERATION_LOG.md`, choose the smallest uncompleted improvement, modify and test, then publish a versioned archive back to Library. If GitHub repository access has been granted, publish to a work branch / pull request; otherwise report GitHub as blocked and **do not claim a push occurred**.

## V1.1 fair-attack update (2026-10-15)

Each approaching enemy now pauses to target the player's current location before attacking. A red pixel square and a progress gauge show exactly where and when damage will occur. Escape the square before the bar fills (or time an invulnerable dash). Swarms / hunters / brutes each have distinct windup times, damage radii and recovery windows. Hits interrupt the windup countdown briefly; successful evasion produces a teal feedback ring and optional sound cue.

Validation: 20/20 Node tests passed; `npm run build` succeeded; a Chromium browser smoke test (injected real `dist/play.html` via `set_content` because file navigation was blocked in the isolated environment) confirmed rendering, weapon selection, pause and brute targeting with no page errors. Native `file://` opening is not verified in this environment.

## V1.2 Sentinel boss update (2026-10-15)

At wave 4, and every fourth wave thereafter, a single golden Sentinel joins the normal hostiles. Its health increases with wave scaling. The Sentinel stops to target a **finite orthogonal cross** at the player's position, gives a 1.10s windup, then releases a bright crossing strike. Moving only along one marked lane does not escape it; moving diagonally beyond the warning stripes (or using dash iframes) does. Cross warning and actual hit geometry share the same config values. A compact boss HP bar appears on the canvas until the Sentinel dies.

**Validation this iteration:** `npm test`: 25 passed / 0 failed. `npm run build`: passed. Chromium with real offline `dist/play.html` executed via `page.set_content` (direct file navigation was blocked by the isolated browser) confirmed wave 1 starts, weapon hotkeys 2/3 switch, pause works, forced wave 4 displays Sentinel HUD and cross warning, and no JS page errors. The local-file launch on a user's own PC remains unverified.

## V1.2.1 — Guided first 30 combat seconds

The arena now displays a compact, non-modal quick-start ribbon while a new run is young: move with WASD/arrows, use Shift dash, and change weapons with 1/2/3 (weapons auto-fire). The steps advance only when the corresponding real movement or game event happens, can be done in any order, disappear after completion or 30 seconds of active combat time, and reset on New Run. They do not block combat or mutation selection. Pauses and mutation decisions do not consume the tutorial timer. See `test/onboarding.test.js`.

The tutorial is an in-game usability aid, **not** proof that an unfamiliar player can master controls in 30 seconds. An external usability playtest is still needed.

## Goal-driven M1 checks

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the four milestone definitions, **actual** acceptance evidence and remaining blockers. The runnable deterministic stress probe is `npm run soak`: three seeded scripted-controller 600-**game-second** sessions using ordinary game input, upgrades and boss encounters. It does **not** represent 10 minutes of human play or browser execution. At V1.2.1 it revealed first-wave completion in about 3.7–4.7 seconds; pacing is the next priority.

## V1.2.2 — Opening combat pacing (2026-10-15)

The first wave now starts with the same **six active swarm enemies** and adds **three kill-triggered reinforcement groups of six** when the current wave has accumulated 4, 10 and 16 kills. New enemies spawn immediately while two earlier foes are still active: **no mandatory countdown or combat-free waiting**. This caps simultaneous opening hostiles at eight (absent test harness intervention) while extending the actual learning encounter, and the HUD announces each reinforcement. The second and later waves, mutation choices, and wave-4 Sentinel pattern are unchanged.

Automated scripted movement/fire controller across seeds 7/13/33 reported first-wave clears at 12.60 / 12.53 / 14.65 seconds. These are core-simulation results, **not proof that a novice will survive, enjoy or learn** in that time. Observe unfamiliar users before calling M1 accepted.

**Optional Chromium integration (Python Playwright required):** after `npm run build`, install `pip install playwright` and `python -m playwright install chromium` if Chromium is not already present, then run `python scripts/browser_soak.py`. It renders the actual offline `dist/play.html` in Chromium, tests keyboard switching/pause, executes **accelerated** 600 game seconds of legal simulated inputs and natural combat/upgrades/Bosses, checks restart and uncaught JS errors, and saves screenshots under ignored `qa-output/`. This is browser integration using simulated game time, **not 10 minutes of human play at normal wall-clock speed**.

## V1.2.3 — Diminishing genome returns and no-healing difficulty probe (2026-10-15)

Observed before this change: the seeded *stationary* controller could clear **675–869 waves in 600 simulated seconds** without any regeneration or hull mutations on four of five samples. Multiplicative +22% damage and +17% rate picks accumulated exponentially, letting the player instantly erase even highly scaled enemies. This undermined the intended 10-minute progression.

All repeatable stat upgrades now use **monotone diminishing returns** after preserving the first-pick gains. Damage approaches 5x, rate 3.5x, speed 2.3x, passive regen 5HP/s and max hull 300HP asymptotically, with less healing from late hull picks. The multishot mutation is capped at three additional projectiles and disappears from random offerings after the third pick; at least five other options remain. The HUD reports the actual derived multipliers. These soft limits are a single balancing change to avoid runaway damage/healing, **not** the finished three-path mutation system.

`npm run difficulty` runs repeatable no-hull/no-regen scripted controllers and emits per-seed results (including death time, wave, hits and mutations). Scripted stationary vs orbiting inputs are **diagnostics, not novice behavior**. Future iterations must use these results to assess whether constant movement makes combat too safe, rather than declaring M1 fun/complete. The previously implemented core 600-game-second sustain-controller check remains available with `npm run soak`.

## V1.2.4 — Visible Hunter interception (2026-10-15)

Hunters now begin a **locked, half-second warning** when they get within 75 pixels, projecting a short maximum 36-pixel lead along the player's current direction. The prediction happens once when the warning starts: turn or dash to dodge the marked square. Existing short-range hunter contact attacks still have their original windup, and the early swarm wave is unchanged. This addresses orbiting always being safe without adding enemy types or hidden instant damage.

The new `test/hunter_lead.test.js` covers moving into the forecast, changing direction to evade, range limits, boundary clamping, and existing dash/contact behavior. Initial in-memory JavaScript diagnostic of the exact patched engine, **not npm or human play**, recorded in 180 game seconds, seeds 7/13/33, no-healing orbit+dash: **0/0/0 hits before** and **11/5/2 hits after**. Three 600-game-second scripted *healing* controllers on the patched engine survived, reached waves 38/27/36 and defeated 9/6/8 actual Sentinel bosses. Difficulty and newbie readability still require real player testing. GitHub CI runs the actual npm commands; see its live status rather than assuming success.
