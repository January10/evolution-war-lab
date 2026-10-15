#!/usr/bin/env python3
"""Real Chromium keyboard/mouse regression for stale mutation cards after New Run.

Clear wave 1 through ordinary combat twice, choosing an upgrade, restarting,
then checking that the second run's displayed options match the new Game state.
No forced wave/state, scripted enemy kills, or synthetic game.step shortcuts.
"""
from pathlib import Path
import json
import shutil
import time
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'dist/play.html'
OUTPUT = ROOT / 'qa-output'
OUTPUT.mkdir(exist_ok=True)


def state(page):
    return page.evaluate("""() => ({state:game.state, wave:game.wave, time:game.time,
      hp:game.player.hp, offers:game.upgradeChoices.slice(),
      displayed:[...document.querySelectorAll('#upgrades .upgrade-option')].map(el=>el.dataset.choice),
      cached:document.getElementById('upgradeOverlay').dataset.wave||null})""")


def play_to_mutation(page, limit=55):
    started = time.monotonic()
    actions = 0
    while time.monotonic() - started < limit:
        current = state(page)
        if current['state'] == 'upgrade':
            page.wait_for_selector('#upgradeOverlay:not(.hidden)', timeout=2000)
            return state(page), actions
        if current['state'] == 'dead':
            raise AssertionError(f'Failed to survive to first upgrade: {current}')
        key = ('w', 'd', 's', 'a')[actions % 4]
        page.keyboard.down(key)
        if actions % 4 == 0:
            page.keyboard.down('Shift')
        page.wait_for_timeout(380)
        page.keyboard.up(key)
        if actions % 4 == 0:
            page.keyboard.up('Shift')
        actions += 1
    raise AssertionError(f'Timed out waiting for natural first mutation: {state(page)}')


def main():
    assert HTML.is_file(), 'Build the standalone HTML first'
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,
            executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None,
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        mode = 'file URL'
        try:
            page.goto(HTML.as_uri(), wait_until='load', timeout=30000)
        except PlaywrightError as exc:
            if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(exc):
                raise
            mode = 'actual built HTML via set_content (file URL blocked)'
            page.close()
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.set_content(HTML.read_text(encoding='utf-8'), wait_until='load')
        page.wait_for_selector('#arena', state='visible')
        first, first_actions = play_to_mutation(page)
        assert first['offers'] == first['displayed'], first
        page.locator('#upgrades .upgrade-option').first.click()
        assert state(page)['wave'] == 2, 'first run failed to enter wave 2'

        # The NEW RUN button must invalidate presentation state, not just game state.
        # Fix the new seed deterministically to prevent an accidental same-deck pass.
        page.evaluate('Math.random = () => 0.4517823')
        page.locator('#restart').click()
        restarted = state(page)
        assert restarted['wave'] == 1 and restarted['state'] == 'playing'
        second, second_actions = play_to_mutation(page)
        page.screenshot(path=str(OUTPUT / 'restart-mutation-playtest.png'), full_page=True)
        assert second['offers'] == second['displayed'], (
            f'Stale mutation cards after replay: game={second["offers"]}; ui={second["displayed"]}')
        page.locator('#upgrades .upgrade-option').first.click()
        assert state(page)['wave'] == 2, 'second run cannot choose a valid mutation'
        assert not errors, errors
        print(json.dumps({'mode': mode, 'firstOffers': first['offers'],
                          'secondOffers': second['offers'], 'firstActions': first_actions,
                          'secondActions': second_actions, 'secondWaveAfterChoice': state(page)['wave'],
                          'pageErrors': errors}, ensure_ascii=False))
        browser.close()


if __name__ == '__main__':
    main()
