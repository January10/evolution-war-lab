// Controlled non-healing combat diagnostics; no enemy-state edits or artificial HP.
// These are scripted legal inputs, not evidence about real player skill.
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';

function probe(seed,style){
  const game=new Game({seed});
  const stats={seed,style,policy:'no-hull-no-regen',simulatedSeconds:0,mutations:0,hits:0,damage:0,dashes:0,bosses:0};
  for(let frame=0;frame<600*60;frame++){
    if(game.state==='upgrade'){
      const pick=['power','rate','multishot','mobility'].find(id=>game.upgradeChoices.includes(id));
      assert.ok(pick,'non-healing choice should always be offered');
      assert.equal(game.chooseUpgrade(pick),true);
      stats.mutations++;
    }
    if(game.state==='dead')break;
    const direction=game.time*0.57,near=game.nearestEnemy();
    const distance=near?Math.hypot(near.x-game.player.x,near.y-game.player.y):Infinity;
    const input=style==='stationary'?{moveX:0,moveY:0}:{moveX:Math.cos(direction),moveY:Math.sin(direction),dash:distance<25};
    game.step(1/60,input);
    for(const event of game.drainEvents()){
      if(event.type==='hurt'){stats.hits++;stats.damage+=event.damage;}
      if(event.type==='dash')stats.dashes++;
      if(event.type==='boss-defeated')stats.bosses++;
    }
    assert.ok(Number.isFinite(game.player.hp) && Number.isFinite(game.time),'finite combat state');
  }
  assert.ok(!game.mutations.some(m=>['hull','regen'].includes(m)),'must exclude survival upgrades');
  Object.assign(stats,{simulatedSeconds:+game.time.toFixed(2),wave:game.wave,kills:game.kills,hp:Math.round(game.player.hp),dead:game.state==='dead'});
  return stats;
}
for(const strategy of ['stationary','orbit-dash']){
  for(const seed of [7,13,33])console.log(JSON.stringify(probe(seed,strategy)));
}
console.log('DIAGNOSTIC ONLY: scripted controllers, not 10 real-time minutes or human playtests.');
