#!/usr/bin/env python3
"""600+ seconds of *active wall-clock* Chromium input against built HTML.

No accelerated Game.step calls, no forced combat state, no game-time edits.
The independent controller reads the visible game's live state but only acts
through keyboard/mouse and UI upgrade/retry buttons.  Deaths and restarts are
recorded, not treated as a single uninterrupted run.  Not a human study.

Run: npm run build && python scripts/realtime_600_playtest.py
Screenshots and machine-readable evidence are stored in qa-output/.
"""
import json
import math
import os
import re
import shutil
import statistics
import threading
import time
from collections import Counter
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'dist/play.html'
OUT = ROOT / 'qa-output' / os.environ.get('EWL_QA_OUTPUT_SUBDIR', 'realtime600')
OUT.mkdir(parents=True, exist_ok=True)
TARGET_ACTIVE_SECONDS = 600  # hard gate, never substitute simulated time


def read_state(page):
    return page.evaluate('''() => ({
      state:game.state, paused:game.paused, wave:game.wave, gameSeconds:game.time,
      kills:game.kills, score:game.score, hp:game.player.hp, maxHp:game.stats.maxHp,
      x:game.player.x, y:game.player.y, dashReady:game.player.dashReady,
      weapon:game.weapon, mutations:[...game.mutations],
      enemies:game.enemies.filter(e=>e.alive).map(e=>({x:e.x,y:e.y,kind:e.kind,
        attackLeft:e.attackLeft, attackX:e.attackX,attackY:e.attackY})),
      hpLabel:document.getElementById('hpLabel').textContent,
      choices:[...game.upgradeChoices],
      uiChoices:[...document.querySelectorAll('#upgrades .upgrade-option')].map(e=>e.dataset.choice),
      overlayVisible:!document.getElementById('upgradeOverlay').classList.contains('hidden'),
      telemetry:window.__qaTelemetry?{
        counters:window.__qaTelemetry.counters,frameCount:window.__qaTelemetry.frameCount,
        longFrames:window.__qaTelemetry.longFrames,veryLongFrames:window.__qaTelemetry.veryLongFrames,
        maxFrameMs:window.__qaTelemetry.maxFrameMs,scriptMs:performance.now()
      }:null
    })''')


def instrument(page):
    page.evaluate('''() => {
      const q=window.__qaTelemetry={counters:{},events:[],frameCount:0,
        longFrames:0,veryLongFrames:0,maxFrameMs:0,startedAt:performance.now()};
      // Observability only: forward ALL original game events unchanged.
      const orig=Game.prototype.event;
      Game.prototype.event=function(type,attrs={}){
        q.counters[type]=(q.counters[type]||0)+1;
        if(['hurt','dead','wave','wave-clear','upgrade','boss-appeared','boss-defeated','boss-strike','evade'].includes(type)){
          q.events.push({wallMs:performance.now(),gameSeconds:this.time,wave:this.wave,
            hp:this.player.hp,type,attrs});
          if(q.events.length>5000)q.events.shift();
        }
        return orig.call(this,type,attrs);
      };
      let last;
      function frame(t){if(last!==undefined){const d=t-last;q.frameCount++;
        if(d>50)q.longFrames++;if(d>100)q.veryLongFrames++;
        q.maxFrameMs=Math.max(q.maxFrameMs,d);
      }last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
    }''')


def choose_direction(state,waypoint_index):
    """Steer toward rectangle waypoints; react to nearby threats; keyboard only."""
    p=(state['x'], state['y'])
    waypoints=((100,58),(380,58),(380,212),(100,212))
    if math.dist(p,waypoints[waypoint_index]) < 25:
        waypoint_index=(waypoint_index+1)%4
    wx,wy=waypoints[waypoint_index]
    vx,vy=wx-p[0],wy-p[1]
    closest=None
    for enemy in state['enemies']:
        d=math.hypot(enemy['x']-p[0],enemy['y']-p[1])
        if closest is None or d<closest[0]:closest=(d,enemy)
    if closest and closest[0]<40:
        dist,e=closest
        vx+=(p[0]-e['x'])*max(0,1.3-dist/110)*1.6
        vy+=(p[1]-e['y'])*max(0,1.3-dist/110)*1.6
    # Never continue holding a key while pinned against a border.
    if p[0]>440 and vx>0:vx=-50
    if p[0]<40 and vx<0:vx=50
    if p[1]>240 and vy>0:vy=-50
    if p[1]<30 and vy<0:vy=50
    keys=[]
    if vx>12:keys.append('d')
    elif vx< -12:keys.append('a')
    if vy>12:keys.append('s')
    elif vy< -12:keys.append('w')
    if not keys:keys=['w']
    return keys, waypoint_index, closest[0] if closest else 999


def main():
    if not HTML.is_file():raise RuntimeError('Run npm run build before test')
    seed=os.environ.get('EWL_QA_SEED', 'unmodified random')
    start=time.monotonic()
    handler=lambda *a,**kw:SimpleHTTPRequestHandler(*a,directory=str(HTML.parent),**kw)
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    stdout_log=[]
    captures=[]
    events=[]
    errors=[]
    console_errors=[]
    summary={'status':'RUNNING','seed':seed,'baseGitHubSHA':'13c1f8ae0b7da21733d658724d3d72ce14e26803',
      'projectVersion':json.loads((ROOT/'package.json').read_text('utf-8'))['version'],
      'targetActiveWallSeconds':TARGET_ACTIVE_SECONDS,'snapshots':[],
      'deaths':[],'upgrades':[],'weaponSwitches':[],
      'manualPause':None,'viewport':{'width':1280,'height':900}}
    mode=None
    browser=None
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,
                executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None,
                args=['--no-sandbox','--disable-dev-shm-usage'])
            def new_page():
                pg=browser.new_page(viewport={'width':1280,'height':900})
                pg.set_default_timeout(8000)
                pg.on('pageerror',lambda e:errors.append(str(e)))
                pg.on('console',lambda e:console_errors.append(e.text) if e.type=='error' else None)
                return pg
            page=new_page()
            for url,label in [(HTML.as_uri(),'file:// actual standalone HTML'),
                              (f'http://127.0.0.1:{server.server_port}/play.html','localhost HTTP actual build')]:
                try:
                    page.goto(url,wait_until='load',timeout=15000)
                    page.wait_for_function("typeof game !== 'undefined' && game.state==='playing'",timeout=6000)
                    mode=label
                    break
                except Exception as exc:
                    stdout_log.append(f'Navigation attempt {label} failed: {str(exc)[:160]}')
                    # An administrator-blocked page may continue an aborting
                    # navigation asynchronously; always create a fresh context.
                    page.close()
                    page=new_page()
            if mode is None:
                page.set_content(HTML.read_text('utf-8'),wait_until='load')
                page.wait_for_function("typeof game !== 'undefined' && game.state==='playing'",timeout=6000)
                mode='fallback: set_content(actual dist/play.html)'
            summary['mode']=mode
            instrument(page)
            # Actual screen for visual QA: image pixels + ability to aim.
            pixel_count=page.evaluate('''() => {const c=document.querySelector('#arena');
              const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
              const colors=new Set();for(let i=0;i<d.length;i+=400)colors.add(d[i]+','+d[i+1]+','+d[i+2]);
              return colors.size;}''')
            assert pixel_count>=5,f'canvas blank, color samples={pixel_count}'
            summary['sampledCanvasColors']=pixel_count
            def capture(label):
                name=f'{len(captures):02d}-{label}.png'
                page.screenshot(path=str(OUT/name),full_page=True,timeout=12000)
                captures.append(name)
            capture('start')
            s=read_state(page)
            summary['initial']=dict((k,s[k]) for k in ['wave','hp','maxHp','gameSeconds','state','kills'])
            # Exercise named controls once without altering game.state directly.
            for key,w in [('2','scatter'),('3','beam'),('1','pulse')]:
                page.keyboard.press(key)
                selected=read_state(page)['weapon']
                assert selected==w,(key,selected,w)
                summary['weaponSwitches'].append((key,selected))
            page.keyboard.press('p');paused=read_state(page)
            assert paused['paused']
            time.sleep(.20)
            assert abs(read_state(page)['gameSeconds']-paused['gameSeconds'])<.04
            page.keyboard.press('p'); assert not read_state(page)['paused']
            summary['manualPause']='P paused simulation and P resumed, 0.20s outside active-play timer'
            # Short manual left-click aim (real mouse interface).
            box=page.locator('#arena').bounding_box()
            page.mouse.move(box['x']+box['width']*.65,box['y']+box['height']*.4)
            page.mouse.down()
            page.wait_for_timeout(180)
            page.mouse.up()
            # Real-time timer only increments for games in playing/unpaused state.
            active=0.
            action_count=0
            upgrades=0
            restarts=0
            max_wave=1
            max_wave_this_run=1
            waypoint=0
            last_capture=0
            last_report=0
            last_health=s['hp']
            last_state='playing'
            last_frame_count=0
            last_frame_time=time.monotonic()
            summary['sessions']=1
            last_stall_game_time=s['gameSeconds']
            last_stall_wall=time.monotonic()
            print('REALTIME START',json.dumps({'mode':mode,'canvasColors':pixel_count}),flush=True)
            while active < TARGET_ACTIVE_SECONDS:
                s=read_state(page)
                # Regression discovered from real wave-8 screenshot on V1.2.6:
                # repeated hull mutation used to expose raw fractional maxHP.
                if not re.fullmatch(r'\d+ / \d+',s['hpLabel']):
                    raise AssertionError(f'HP label must be readable integers, got {s["hpLabel"]!r} at wave {s["wave"]}')
                max_wave=max(max_wave,s['wave'])
                max_wave_this_run=max(max_wave_this_run,s['wave'])
                if s['state']=='upgrade':
                    assert s['choices']==s['uiChoices'] and len(s['choices'])==3, ('stale upgrade choices',s)
                    desired=next((id for id in ('hull','regen','power','rate','mobility','multishot')
                      if id in s['choices']),s['choices'][0])
                    capture(f'upgrade-w{s["wave"]}') if s['wave'] in (1,4,8) and upgrades<=15 else None
                    page.locator(f'#upgrades .upgrade-option[data-choice="{desired}"]').click()
                    after=read_state(page)
                    assert after['wave']==s['wave']+1 and after['state']=='playing',('upgrade rejected',s,after)
                    summary['upgrades'].append({'atActiveSeconds':round(active,2),'gameSeconds':round(s['gameSeconds'],2),
                        'wave':s['wave'],'choices':s['choices'],'selected':desired,'hp':round(s['hp'],2)})
                    upgrades+=1
                    waypoint=0
                    continue
                if s['state']=='dead':
                    capture(f'death-w{s["wave"]}')
                    summary['deaths'].append({'atActiveSeconds':round(active,2),'gameSeconds':round(s['gameSeconds'],2),
                        'wave':s['wave'],'kills':s['kills'],'lastHP':round(s['hp'],2),
                        'upgradesThisRun':len(s['mutations']),'maxWaveThisRun':max_wave_this_run})
                    start_retry=time.monotonic()
                    page.locator('#retry').click(timeout=5000)
                    after=read_state(page)
                    assert after['state']=='playing' and after['wave']==1 and after['hp']>=120
                    retry_ms=int((time.monotonic()-start_retry)*1000)
                    summary['deaths'][-1]['retryMilliseconds']=retry_ms
                    if retry_ms>10000:raise AssertionError(f'death/retry exceeded 10s: {retry_ms}ms')
                    last_health=after['hp'];last_state='playing';max_wave_this_run=1
                    restarts+=1;waypoint=0;summary['sessions']+=1
                    continue
                assert s['state']=='playing' and not s['paused'], f'stalled in {s["state"]}: {s}'
                # The clock must advance under requestAnimationFrame without any game.step injection.
                if s['gameSeconds']>last_stall_game_time+.08:
                    last_stall_game_time=s['gameSeconds']
                    last_stall_wall=time.monotonic()
                elif time.monotonic()-last_stall_wall>6:
                    raise AssertionError('game clock stopped >6s while browser in playing state')
                keys,waypoint,dist=choose_direction(s,waypoint)
                for key in keys:page.keyboard.down(key)
                dashed=dist<60 and s['dashReady']<.08
                if dashed:page.keyboard.down('Shift')
                # Switch weapons periodically using actual hotkeys; pulse is most dependable.
                if action_count%28==0:
                    chosen=[('2','scatter'),('3','beam'),('1','pulse')][(action_count//28)%3]
                    page.keyboard.press(chosen[0]);summary['weaponSwitches'].append((chosen[0],chosen[1]))
                # Do not count paused or mutation-selection wall time toward 600s.
                before=time.monotonic()
                page.wait_for_timeout(590)
                after=time.monotonic()
                for key in keys:page.keyboard.up(key)
                if dashed:page.keyboard.up('Shift')
                # The game may have changed to upgrade/dead during a key hold;
                # in that case counting the full time slightly overstates active seconds.
                after_state=read_state(page)
                if after_state['state']=='playing':
                    active+=(after-before)
                else:
                    active+=(after-before)*.5  # conservative partial credit; measure gameTime separately
                action_count+=1
                if active-last_capture>=120:
                    capture(f'active-{int(active)}s-w{after_state["wave"]}')
                    last_capture=active
                if active-last_report>=30:
                    sample={'activeWallSeconds':round(active,2),'elapsedWallSeconds':round(time.monotonic()-start,2),
                        'gameSeconds':round(after_state['gameSeconds'],2),'wave':after_state['wave'],
                        'hp':round(after_state['hp'],2),'maxHP':round(after_state['maxHp'],2),
                        'hpLabel':after_state['hpLabel'],
                        'kills':after_state['kills'],'actions':action_count,
                        'totalUpgrades':upgrades,'restarts':restarts,'frameCount':after_state['telemetry']['frameCount'],
                        'longFrames':after_state['telemetry']['longFrames'],
                        'veryLongFrames':after_state['telemetry']['veryLongFrames']}
                    summary['snapshots'].append(sample)
                    print('REALTIME PROGRESS',json.dumps(sample,ensure_ascii=False),flush=True)
                    last_report=active
                    (OUT/'observations-progress.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),'utf-8')
                if errors:raise RuntimeError('Uncaught JS errors: '+json.dumps(errors))
            ending=read_state(page)
            capture('finish')
            all_events=page.evaluate('window.__qaTelemetry.events')
            counters=ending['telemetry']['counters']
            summary.update({'status':'PASS' if not errors else 'FAIL',
              'activeWallSeconds':round(active,2),
              'elapsedWallSeconds':round(time.monotonic()-start,2),
              'actions':action_count,'browserErrors':errors,
              'consoleErrors':console_errors[:100],'maxWave':max_wave,'upgradesSelected':upgrades,
              'restarts':restarts,'final':ending,'eventCounts':counters,
              'trackedEvents':all_events,'screenshots':captures,
              'maxRafGapMs':round(ending['telemetry']['maxFrameMs'],2)})
            (OUT/'observations-final.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),'utf-8')
            assert active>=600,active
            assert not errors,errors
            print('REALTIME SUCCESS',json.dumps({k:summary[k] for k in ['activeWallSeconds','elapsedWallSeconds','actions','maxWave','upgradesSelected','restarts','eventCounts','maxRafGapMs']},ensure_ascii=False),flush=True)
            browser.close()
            browser=None
    except Exception as exc:
        summary['status']='FAIL'
        summary['error']=repr(exc)
        summary['activeWallSeconds']=round(locals().get('active',0),2)
        summary['elapsedWallSeconds']=round(time.monotonic()-start,2)
        summary['browserErrors']=errors
        summary['consoleErrors']=console_errors[:100]
        summary['screenshots']=captures
        summary['navigationAttempts']=stdout_log
        (OUT/'observations-final.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),'utf-8')
        print('REALTIME FAILED',repr(exc),flush=True)
        raise
    finally:
        server.shutdown()
        if browser is not None:
            try:browser.close()
            except Exception:pass


if __name__=='__main__':main()
