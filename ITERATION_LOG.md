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
