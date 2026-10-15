import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ENEMIES} from '../src/core/data.js';

function isolatedHunter(gap=60){
  const game=new Game({seed:23});
  const player=game.player;
  const hunter=game.spawnEnemy('hunter',{x:player.x+gap,y:player.y});
  hunter.speed=0;hunter.contactCooldown=0;
  game.enemies=[hunter];
  return {game,player,hunter};
}
function run(game,frames,input){
  for(let i=0;i<frames;i++)game.step(1/60,input);
}
test('hunter telegraphs an intercept instead of contact-only damage',()=>{
  const {game,player,hunter}=isolatedHunter();
  game.step(1/60,{moveX:1,fire:false});
  assert.equal(hunter.attackTotal,ENEMIES.hunter.leadWindup);
  assert.ok(hunter.attackX>player.x+20,'locked strike aims ahead of movement');
  assert.equal(hunter.attackY,player.y);
  assert.ok(game.events.some(e=>e.type==='telegraph'&&e.kind==='hunter'&&e.predictive));
});
test('continuing in the warned direction can be hit by the intercept',()=>{
  const {game,player,hunter}=isolatedHunter();
  game.step(1/60,{moveX:1,fire:false});
  assert.equal(player.hp,120,'the predicted strike never deals instant damage');
  run(game,20,{moveX:1,fire:false});
  assert.ok(hunter.attackLeft>0,'windup gives reaction time');
  run(game,18,{moveX:1,fire:false});
  assert.equal(hunter.attackLeft,0);
  assert.equal(player.hp,110);
});
test('turning after the locked warning safely avoids the intercept',()=>{
  const {game,player,hunter}=isolatedHunter();
  game.step(1/60,{moveX:1,fire:false});
  const target={x:hunter.attackX,y:hunter.attackY};
  run(game,38,{moveY:1,fire:false});
  assert.equal(player.hp,120);
  assert.deepEqual({x:hunter.attackX,y:hunter.attackY},target,'target is locked during charge');
  assert.ok(game.events.some(e=>e.type==='evade'&&e.kind==='hunter'));
});
test('hunter does not prestrike outside the intercept radius',()=>{
  const {game,hunter}=isolatedHunter(100);
  game.step(1/60,{fire:false});
  assert.equal(hunter.attackLeft,0);
});
test('existing near-contact Hunter warning and dash invulnerability remain valid',()=>{
  const {game,player,hunter}=isolatedHunter(13);
  game.step(1/60,{fire:false});
  assert.equal(hunter.attackTotal,ENEMIES.hunter.attackWindup);
  player.iframe=1;
  run(game,30,{fire:false});
  assert.equal(player.hp,120);
});
test('prediction is clamped to the playable arena at its edges',()=>{
  const {game,player,hunter}=isolatedHunter(-60);
  player.x=game.width-player.radius-9;
  hunter.x=player.x-60;
  game.step(1/60,{moveX:1,fire:false});
  assert.equal(hunter.attackTotal,ENEMIES.hunter.leadWindup);
  assert.ok(hunter.attackX<=game.width-player.radius-8);
});
