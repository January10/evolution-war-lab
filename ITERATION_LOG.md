# Evolution War Lab — Rebuild iteration log

## V1.0 — Fresh arcade-first MVP

- Rebuilt from scratch in a separate project; no direct overwrite of old V0.6 experiments.
- 480x270 native pixel arena; procedural visuals, no art assets.
- WASD movement, hold-mouse aim and optional automatic nearest-enemy shooting.
- Three radically different weapons: rapid projectile Pulse Rifle, shotgun fan, piercing hitscan Prism Beam.
- Three enemy types and waves with rising difficulty.
- Tactical dash with cooldown and short invulnerability.
- Wave-clear mutation choices and six stackable mutation variants.
- Damage flash, bullet trails, scattering particles, beam FX, death bursts, kill combo scoring, audible SFX opt-in.
- Headless combat tests and static build.

### Validation

Run `npm test` and `npm run build` and record observed output before publishing. Do not mark browser visual QA complete without verifying browser behavior.

### Next candidates (must inspect project before selecting)

1. Screen-visible enemy telegraphs and fair hit warnings.
2. First playable boss with attack pattern after wave 4.
3. Gun feedback polish: directional hitstop, controlled screen-shake, richer per-weapon hit impacts.
4. Quick 30-second onboarding tutorial and difficulty smoothing from playtest results.
5. Save/restore best completed lineage (only after core loop is fun).

### GitHub

Repository target and GitHub App installation are not configured as of initial rebuild. The developer task must not invent a repository or assert that a push happened.

### Verified initial rebuild result (2026-10-15)

- `npm test`: **16 / 16 passed** (headless combat, weapon behavior, RNG determinism, dash, wave and mutation state, cooldowns, death).
- `npm run build`: **passed**, produced both multi-file `dist/index.html` and standalone `dist/play.html`.
- HTTP smoke: `GET /` and `GET /src/main.js` both returned 200.
- Browser QA in Chromium using `page.set_content` with the actual offline bundled `dist/play.html`: initial battle painted canvas, W1 had active hostiles; keys 2 and 3 correctly selected weapons; P paused and resumed; no page errors.
- Browser upgrade QA: forced first wave clear through test-only harness injection; three mutation options appeared; clicking one started wave 2; no page errors.
- Caveat: browser navigation to localhost/file URL was blocked by the QA environment; the standalone inlined HTML itself ran successfully. Recheck normal file-open and server mode in target user's browser.
- GitHub: authenticated user profile returned, but no installed accounts or accessible repositories; therefore no push was performed.

## V1.1.0 - Fair enemy strike telegraphs (2026-10-15, hourly iteration 1)

**Goal:** Convert unavoidable first-contact damage into a dodgeable, pixel-visible attack mechanic.

**Actual changes:**

- `src/core/data.js`: per-enemy windup, strike radius, trigger reach and recovery timing. Swarms charge for 0.46s, hunters for 0.37s, brutes for 0.80s with a wider warning zone.
- `src/core/game.js`: enemies lock on to a stationary strike zone, pause while charging, apply damage only when the telegraph ends and the player is still inside it. Dash invulnerability works; enemy hit-stun delays the attack; misses generate evade feedback.
- `src/ui/draw.js`: high-contrast pixel warning square, fill timer and target marker; successful dodge ring.
- `src/main.js` and `src/ui/sound.js`: combat warning and dodge text, optional alert/dodge sounds, V1.1 version label.
- `test/game.test.js`: four new deterministic regressions for delayed damage, evasion, invulnerable dash and brute windups.
- `package.json`, `README.md`, `ITERATION_LOG.md`: update version, player instructions and handoff.

**Reproducible verification:** `npm test` => **20 passed / 0 failed**. `npm run build` => generated updated `dist/index.html` and `dist/play.html`. Chromium Playwright QA with real standalone built HTML embedded via `page.set_content` => rendered active wave 1, switched to shotgun and beam by keys, paused/resumed, rendered brute telegraph with `attackLeft=0.8`, zero runtime errors. Direct `file://` navigation is blocked by the test environment; do not claim that it was independently verified.

**Known issues:** Attack squares can overlap in crowds; tune readability and warning volume after gameplay testing. Auto-fire might kill enemies before many charges can be seen. Native file opening remains unverified on end-user hardware. GitHub installation/repository authorization remains absent; no push made.

**Next candidate:** Add first elite opponent/Boss wave and a clear, differentiable attack pattern on wave 4; reuse the new warning mechanic and require tests.

## V1.2.0 — Wave-4 Sentinel boss and cross-strike (2026-10-15, hourly iteration 2)

**Goal:** Introduce a readable elite combat encounter and a meaningful new evasion challenge instead of merely increasing enemy HP.

**Actual changes:**

- `src/core/data.js`: added golden Sentinel enemy (HP 440 base, 1.10s charged cross attack, 2.35s recovery, larger reach, 23 damage, wave scaling). All cross dimensions centralized.
- `src/core/game.js`: spawn one Sentinel every fourth wave, boss announcement events, finite horizontal/vertical damage lanes locked to the player's position, boss strike FX and death event. Boss must be killed for wave clear. Alert ordering fixed so boss message is not overwritten by the normal wave event.
- `src/ui/draw.js`: original enlarged gold mechanical sprite, matching pixel cross-shaped warning geometry and impact burst, always-visible Sentinel HP bar.
- `src/main.js`: version badge, boss-phase objective, arrival/strike/defeat feedback texts.
- `test/game.test.js`: five new tests for wave-4 spawn, charged impact, diagonal dodge, unsafe single-axis dodge, and boss-gated wave completion. Also checks the boss alert occurs after the standard wave event.
- `README.md`, `package.json`, `ITERATION_LOG.md`: document controls, acceptance checks, version and evidence.

**Actual verification:** `npm test` => **25 passed, 0 failed**. `npm run build` => produced `dist/index.html` and self-contained `dist/play.html`. Chromium smoke test ran the current offline output via `page.set_content` (direct `file://` navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`): initial wave/weapon selection/pause passed, forced boss wave and visible cross warning passed, 0 browser script errors; screenshot `EWL-V1.2-Sentinel.png`. Real local double-click opening still needs validation on user's device.

**Known limitations:** Sentinel only has one attack pattern; cross warning currently overlays other enemy strike squares. Visual boss smoke was done via a forced wave-4 state instead of naturally playing through the first three waves. Continue balancing elite HP and signal readability through playtesting.

**Next smallest candidate:** Add impact pause and weapon-specific hit feedback without disrupting deterministic combat; alternatively a 20-second first-run movement/dash onboarding that teaches diagonal boss evasion.

**GitHub status:** Fixed repository is `January10/evolution-war-lab`, branch `ai/evolution-war-lab-autodev`. As of this run the connector still reported no installed accounts/installations; write permission has not been verified. Attempt write separately and record its actual result; do not claim push without a commit hash.

## V1.2.1 — First-30-second contextual combat onboarding (2026-10-15, hourly goal-driven iteration)

**M1 goal:** make movement, dash and weapon switching discoverable during live combat instead of relying on a separate off-screen controls panel. This is an actual UI feature, not a plan.

**Files changed:** `src/core/onboarding.js` (new deterministic event-driven tutorial state machine); `src/main.js` (nonblocking HUD ribbon, movement/event wiring, reset on New Run); `src/style.css` (responsive battle-overlay treatment); `scripts/build.mjs` (bundle new core module in offline build); `test/onboarding.test.js` (4 new regression tests); `scripts/soak.mjs` (new repeatable 600-second core endurance probe); `package.json`, `README.md`, `docs/ROADMAP.md` (version, reproducibility, product acceptance ledger), and CI YAML (soak regression).

**Verification performed:** `npm test` **29/29 passed**, `npm run build` **passed** with `dist/index.html` and offline `dist/play.html`. Headless Chromium Playwright using **actual compiled offline HTML** loaded through `page.set_content`: initial canvas and hint, movement => dash hint, Shift dash => weapon hint, key 2 => completion, pause/resume, New Run resets hint, zero page script errors. Screenshot `onboarding-v1.2.1.png` from automation runtime (not committed). Standalone native `file://` navigation remains unverified. Three legal-input, unpaused 600-game-second **Node core** scripted controller runs (`npm run soak`, seeds 7/13/33) reached wave 26/24/28 and killed Sentinel bosses. This is not 10-min browser QA or an actual human playtest.

**Finding:** the first wave can be cleared in ~3.7–4.7 seconds with simple orbiting, so progression is fast enough to interrupt onboarding with a mutation choice; tutorial is intentionally hidden while a mutation dialog is open and resumes afterward. Repeated Hull upgrades yield high effective HP late in long scripted runs. M1 remains **PARTIAL**; no novice usability study or full 10-min browser run has been completed.

**Next unique goal:** improve **early-wave pacing** so first-time players have at least ~12 seconds of meaningful combat before their first evolution prompt, without an empty forced wait, and preserve deterministic wave/Boss/mutation tests. Confirm via controlled simulation and short browser QA. Do not add decorative FX before resolving this.

## V1.2.2 — Combat-driven first-wave reinforcement pacing (2026-10-15, hourly iteration 3)

**M1 target:** give newcomers a longer, active first combat segment before their first mutation prompt (previous scripted seeds 7/13/33 cleared W1 in 3.72–4.65s).

**Actual changes:** `src/core/game.js`: wave-local kill counter and three 6-unit swarm reinforcement groups, triggered at 4/10/16 enemy kills, while exactly two hostiles from the previous group remain; no idle timer or extra spawns after wave 1. `src/main.js`: incoming-hostiles announcement, objective text, and corrected paused-movement onboarding check to match the last remote fix. `test/game.test.js`: regressions ensuring kill-triggered waves, no idle time, no repeated spawns, ordinary wave-2 behavior. `scripts/soak.mjs`: explicit seed-by-seed W1 clear-time acceptance (>=12 game seconds). README, roadmap, package version updated.

**Verification (observed):** `npm test` **31/31 passed**, `npm run build` **passed**, `npm run soak` **passed** for seeds 7/13/33 with first clear at **12.60, 12.53, 14.65 gameplay seconds** and normal boss progression. `python scripts/browser_soak.py` loaded the actual built standalone HTML through Chromium `page.set_content`, validated movement tutorial, weapon 2, pause/resume and new run, then executed accelerated 600 *game* seconds using only legal combat inputs / upgrade choices: reached wave 25, 6 boss defeats, 24 clear cycles, 0 uncaught page errors. Native file double-click / actual 10 minutes at wall-clock speed / first-time human understanding remain unverified. Output screenshots are ignored `qa-output/v122-onboarding.png`, `qa-output/v122-600s-browser.png` (not committed).

**Open M1 gates:** unassisted novice usability, normal-wall-clock 10-minute session on ordinary devices, and balanced survival without repeatedly selecting Hull. Next smallest goal: run or implement a realistic first-run 10-minute controller without guaranteed healing, record death/retry and difficulty without manipulating game state; seek a human novice session when possible.

## V1.2.3 — Contain mutation snowball; quantify no-healing survival (2026-10-15, hourly iteration 4)

**Current M1 blocker:** game can run 600 simulated seconds but weapons stack exponentially; controlled no-heal stationary players in the old balance cleared 675–869 waves for 4/5 sampled seeds, demonstrating that some mutations trivialize enemy scaling. This is not player research.

**Actual code change:** `src/core/game.js` introduces stack counts and a saturating repeated-mutation curve. Damage (5x limit), attack rate (3.5x), movement speed (2.3x), regen (5HP/s) and maxHP (300) preserve their original advertised **first** gain but remain bounded as stacks grow; later hull choices restore less HP. Additional multishot projectiles stop at 3 and the mutation is removed from random choices when maxed (other choices remain). `src/core/data.js` updates descriptions to match diminishing returns; `test/genome_scaling.test.js` adds four deterministic regressions, `scripts/difficulty.mjs` adds a reproducible no-heal legal-input diagnostic, CI runs it. `src/main.js`, package version, offline build and browser check labels updated, README and roadmap record evidence.

**Observed validation:** `npm test` **35/35 passed**; `npm run build` **passed**, produced static website and self-contained offline `dist/play.html`; `npm run soak` **passed** on seeds 7/13/33 with 600 game seconds each, 5–7 natural Sentinel wins, 21–30 mutations, first wave **12.60/12.53/14.65s**. `npm run difficulty`: without hull or regen, stationary scripted controllers died after **106.43/109.75/75.60 simulated seconds** at waves **12/12/8**, vs pre-change 4/5 stationary noheal runs completing 600 seconds. Yet scripted orbit+dash controllers still survived **600 game seconds** with **0–1 hits** at waves 80–89; movement is currently far too safe under a predictable pursuit/telegraph model. Chromium loaded real built `dist/play.html` via `page.set_content`, verified tutorial/weapon/pause, executed **600 accelerated game seconds** (wave25, 6 Boss wins, 24 mutation loops), verified restart, **0 page errors**; direct file:// and normal 10-minute wall-clock play were not verified.

**Open issues:** Newbie comprehension not tested with an unfamiliar person, native offline opening untested, real-time 10-minute browser play still needed, and circle-kiting needs threat with fair warning. M1 remains PARTIAL, M2–M4 unaccepted.

**Next single smallest goal:** Test and implement one *fair* anti-circle-kiting behavior for an existing hunter (e.g. position prediction with visible telegraph); aim to increase real hits on legal-input orbit policies while retaining dodge reaction time and novice protection. No new enemy types or Bosses. Measure the same three no-heal seed outcomes before/after, keep 600-second sustain controller and browser smoke green.
