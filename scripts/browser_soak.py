from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
import json, time
root=Path(__file__).resolve().parents[1]
out=root/'qa-output'
out.mkdir(exist_ok=True)
html=(root/'dist/play.html').read_text('utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1365,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.wait_for_selector('#arena')
    page.wait_for_timeout(250)
    initial=page.evaluate('''() => ({version: document.querySelector('.version').textContent, wave: game.wave, opponents: game.enemies.length, guide: document.querySelector('#tutorial').textContent, state: game.state, canvas: !!document.querySelector('#arena').getContext('2d')})''')
    assert initial['wave']==1 and initial['opponents']==6 and initial['canvas']
    assert initial['version'].endswith('1.2.3')
    page.screenshot(path=str(out/'v123-onboarding.png'),full_page=True)
    page.keyboard.down('KeyD');page.wait_for_timeout(300);page.keyboard.up('KeyD')
    guide_after_move=page.locator('#tutorial').inner_text()
    assert 'DASH' in guide_after_move
    page.keyboard.press('Digit2')
    assert page.evaluate('game.weapon')=='scatter'
    page.keyboard.press('KeyP')
    assert page.evaluate('game.paused') is True
    page.keyboard.press('KeyP')
    assert page.evaluate('game.paused') is False
    # A deterministic, accelerated 600-game-second **real Chromium canvas + DOM integration**.
    # Enemy killing remains through normal game.step/fire; chooseUpgrade and movement are legal actions.
    # The current renderer cannot consume real wall-clock 10 minutes inside this test.
    result=page.evaluate('''() => {
      game = new Game({seed:7});guide=new CombatGuide();updateHUD();
      let clears=0,bosses=0,upgrades=0,firstClear=null,scoreLine=null,maxActive=0;
      for(let i=0;i<36000;i++){
        if(game.state==='upgrade'){
          if(game.wave===1 && firstClear===null)firstClear=game.time;
          upgrades++;
          const option=game.upgradeChoices.find(x=>x==='hull')||game.upgradeChoices.find(x=>x==='regen')||game.upgradeChoices[0];
          if(!game.chooseUpgrade(option))throw Error('upgrade choice rejected');
        }
        if(game.state==='dead')throw Error('seed 7 died @'+game.time);
        const angle=game.time*.57,nearest=game.nearestEnemy();
        const near=nearest?Math.hypot(nearest.x-game.player.x,nearest.y-game.player.y):Infinity;
        game.step(1/60,{moveX:Math.cos(angle),moveY:Math.sin(angle),dash:near<25});
        const events=game.drainEvents();
        for(const e of events){if(e.type==='boss-defeated')bosses++;if(e.type==='wave-clear')clears++;}
        maxActive=Math.max(maxActive,game.enemies.length);
        if(i%120===0){updateHUD();renderFrame(ctx,game);}
      }
      updateHUD();renderFrame(ctx,game);
      return {wave:game.wave,kills:game.kills,upgrades,bosses,clears,elapsed:game.time,firstClear,maxActive,uiWave:document.querySelector('#wave').textContent,canvasWidth:document.querySelector('#arena').width};
    }''')
    assert result['elapsed']>599, result
    assert result['firstClear']>=12, result
    assert result['wave']>=5 and result['bosses']>=1 and result['upgrades']>=4, result
    assert int(result['uiWave'])==result['wave']
    page.screenshot(path=str(out/'v123-600s-browser.png'),full_page=True)
    page.locator('#restart').click()
    post=page.evaluate('''() => ({wave:game.wave,remaining:game.reinforcementGroupsLeft,guide:document.querySelector('#tutorial').textContent, weapon:game.weapon,state:game.state})''')
    assert post['wave']==1 and post['remaining']==3 and post['weapon']=='pulse' and post['state']=='playing'
    assert not errors, errors
    print(json.dumps({'initial':initial,'guide_after_move':guide_after_move,'browser600gameSeconds':result,'postRestart':post,'pageErrors':errors},ensure_ascii=False))
    browser.close()
