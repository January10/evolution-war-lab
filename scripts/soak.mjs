// Deterministic headless 10-minute combat-loop probe. Scripted controller, NOT human gameplay QA.
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';

function simulate(seed){
  const game=new Game({seed});
  let upgrades=0,bossArrivals=0,bossKills=0,waveChanges=0,firstWaveClear=null;
  let previousWave=game.wave;
  for(let frame=0;frame<600*60;frame++){
    if(game.state==='upgrade'){
      upgrades++;
      if(game.wave===1 && firstWaveClear===null)firstWaveClear=game.time;
      const choice=game.upgradeChoices.find(id=>id==='hull')??game.upgradeChoices.find(id=>id==='regen')??game.upgradeChoices[0];
      assert.ok(game.chooseUpgrade(choice),'valid mutation selection');
    }
    assert.notEqual(game.state,'dead',`seed ${seed} died at ${game.time.toFixed(2)}s`);
    // Orbit movement with optional evasive dash; firing and weapon targeting remain normal game behavior.
    const angle=game.time*.57,nearest=game.nearestEnemy();
    const near=nearest?Math.hypot(nearest.x-game.player.x,nearest.y-game.player.y):Infinity;
    game.step(1/60,{moveX:Math.cos(angle),moveY:Math.sin(angle),dash:near<25});
    for(const event of game.drainEvents()){
      if(event.type==='boss-appeared')bossArrivals++;
      if(event.type==='boss-defeated')bossKills++;
    }
    assert.ok(Number.isFinite(game.player.x)&&Number.isFinite(game.player.y)&&Number.isFinite(game.player.hp),'non-finite player state');
    if(game.wave!==previousWave){waveChanges++;previousWave=game.wave;}
  }
  assert.ok(bossArrivals>0&&bossKills>0,'must reach and defeat a real Sentinel in the continuous loop');
  assert.ok(game.wave>=5&&upgrades>=4,'must repeat the combat/mutation loop through boss');
  const result={seed,simulatedSeconds:Math.floor(game.time),wave:game.wave,kills:game.kills,mutations:game.mutations.length,bossArrivals,bossKills,playerHp:Math.round(game.player.hp),firstWaveClearSeconds:+firstWaveClear.toFixed(2),scriptedController:true};
  return result;
}

for(const seed of [7,13,33])console.log(JSON.stringify(simulate(seed)));
console.log('PASS: 3 seeded, unpaused, 600-game-second core survival runs using only legal input/mutations. Not a browser or human playtest.');
