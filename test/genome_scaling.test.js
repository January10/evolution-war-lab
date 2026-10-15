import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';

function gain(game,id){
  game.enemies=[];
  game.reinforcementGroupsLeft=0;
  game.step(1/60,{fire:false});
  assert.equal(game.state,'upgrade');
  game.upgradeChoices=[id];
  assert.equal(game.chooseUpgrade(id),true);
}

test('first mutations keep advertised gains before diminishing returns',()=>{
  const expected={power:1.22,rate:1.17,mobility:1.12,regen:0.8};
  for(const [id,value] of Object.entries(expected)){
    const game=new Game();gain(game,id);
    const stat={power:'damage',rate:'attackRate',mobility:'speed',regen:'regen'}[id];
    assert.ok(Math.abs(game.stats[stat]-value)<1e-10,`${id} first stack`);
  }
  const g=new Game();g.player.hp=45;gain(g,'hull');
  assert.equal(g.stats.maxHp,150);assert.equal(g.player.hp,85);
});

test('repeated mutation stacks stay positive, monotonic and non-exponential',()=>{
  const caps={power:['damage',5],rate:['attackRate',3.5],mobility:['speed',2.3],regen:['regen',5],hull:['maxHp',300]};
  for(const [id,[stat,cap]] of Object.entries(caps)){
    const g=new Game();let prior=g.stats[stat];
    for(let i=0;i<45;i++){gain(g,id);assert.ok(g.stats[stat]>prior,`${id}: stack ${i+1} must have benefit`);assert.ok(g.stats[stat]<cap,`${id}: ${g.stats[stat]} must remain below ${cap}`);prior=g.stats[stat];}
    assert.equal(g.mutationCounts[id],45);
    assert.equal(g.mutations.length,45);
  }
});

test('multishot stops at three stacks and is no longer offered',()=>{
  const g=new Game();
  for(let i=0;i<3;i++)gain(g,'multishot');
  assert.equal(g.stats.extraShots,3);
  g.enemies=[];g.reinforcementGroupsLeft=0;g.step(1/60,{fire:false});
  assert.equal(g.state,'upgrade');
  assert.equal(g.upgradeChoices.includes('multishot'),false);
  assert.equal(g.upgradeChoices.length,3);
  assert.equal(g.chooseUpgrade('multishot'),false);
  assert.equal(g.chooseUpgrade(g.upgradeChoices[0]),true);
  assert.equal(g.stats.extraShots,3);
});

test('late hull mutations are still useful without granting endless max HP',()=>{
  const g=new Game();g.player.hp=20;
  gain(g,'hull');const afterOne=g.player.hp;
  for(let i=0;i<24;i++){g.player.hp=20;gain(g,'hull');}
  assert.ok(g.stats.maxHp<300);
  assert.ok(g.player.hp>20&&g.player.hp<afterOne);
  assert.equal(g.mutationCounts.hull,25);
});
