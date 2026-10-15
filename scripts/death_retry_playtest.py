#!/usr/bin/env python3
"""Manual M1 real-browser death/retry test, with NO synthetic death.

The stationary, unhealed player faces naturally escalating waves. Upgrades are
selected through real UI buttons, excluding hull/regen, until normal combat
kills the player. Validates the death overlay and retry (<10 s) in Chromium.
"""
import json
import shutil
import time
from pathlib import Path
from playwright.sync_api import sync_playwright,Error as PlaywrightError

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'dist/play.html'
OUT=ROOT/'qa-output'/'realtime600_v127'
OUT.mkdir(parents=True,exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    mode='file://'
    try:
        page.goto(HTML.as_uri(),wait_until='load',timeout=12000)
    except PlaywrightError as exc:
        if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(exc):raise
        mode='set_content (file navigation blocked)'
        page.close()
        page=browser.new_page(viewport={'width':1280,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML.read_text('utf-8'),wait_until='load')
    page.wait_for_function("typeof game!=='undefined' && game.state==='playing'")
    start=time.monotonic()
    chosen=[]
    maxwave=1
    result=None
    while time.monotonic()-start<210:
        data=page.evaluate('''() => ({state:game.state,wave:game.wave,time:game.time,
           hp:game.player.hp,kills:game.kills,choices:game.upgradeChoices.slice(),
           display:[...document.querySelectorAll('#upgrades .upgrade-option')].map(e=>e.dataset.choice)})''')
        maxwave=max(maxwave,data['wave'])
        if data['state']=='dead':
            assert page.locator('#deadOverlay').is_visible()
            page.screenshot(path=str(OUT/'real-death-before-retry.png'),full_page=True)
            rt=time.monotonic()
            page.locator('#retry').click()
            resume=page.evaluate("() => ({state:game.state,wave:game.wave,hp:game.player.hp,time:game.time})")
            latency=(time.monotonic()-rt)*1000
            assert resume['state']=='playing' and resume['wave']==1 and resume['hp']==120
            assert latency<10000
            result={'status':'PASS','mode':mode,'elapsedWallSeconds':round(time.monotonic()-start,2),
                    'deathGameSeconds':round(data['time'],2),'diedAtWave':data['wave'],
                    'maxWave':maxwave,'killsAtDeath':data['kills'],'chosenUpgrades':chosen,
                    'retryLatencyMs':round(latency,1),'afterRetry':resume,'pageErrors':errors}
            break
        if data['state']=='upgrade':
            assert data['choices']==data['display']
            choice=next((v for v in ('power','rate','mobility','multishot') if v in data['choices']),None)
            assert choice,'Unexpected mutation deck with no no-heal options'
            page.locator(f'#upgrades .upgrade-option[data-choice="{choice}"]').click()
            chosen.append({'wave':data['wave'],'choice':choice})
        else:
            page.wait_for_timeout(600)
        if errors:raise AssertionError(errors)
    if result is None:
        result={'status':'NOT_VERIFIED','mode':mode,'elapsedWallSeconds':round(time.monotonic()-start,2),
                'maxWave':maxwave,'lastState':data,'chosenUpgrades':chosen,'pageErrors':errors}
    (OUT/'death-retry-result.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),'utf-8')
    print(json.dumps(result,ensure_ascii=False),flush=True)
    browser.close()
    assert result['status']=='PASS',result
