import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {WEAPONS,UPGRADES,ENEMIES} from '../src/core/data.js';

function runFrames(game,n=100,input={}){for(let i=0;i<n;i++)game.step(1/60,input);}

test('fresh run starts live with six enemies and three weapon choices',()=>{
  const g=new Game({seed:7});
  assert.equal(g.state,'playing');assert.equal(g.wave,1);assert.equal(g.enemies.length,6);
  assert.equal(g.player.hp,120);assert.equal(Object.keys(WEAPONS).length,3);
});

test('deterministic simulation with seeded RNG and identical input frames',()=>{
  const a=new Game({seed:33}),b=new Game({seed:33});
  for(let i=0;i<180;i++){
    const input={moveX:i%60<30?1:0,moveY:i%70<22?-1:0};
    a.step(1/60,input);b.step(1/60,input);
  }
  assert.deepEqual(a.summary(),b.summary());
  assert.deepEqual(a.enemies,b.enemies);
  assert.deepEqual(a.shots,b.shots);
});

test('weapon selection does not alter stats or permit invalid weapons',()=>{
  const g=new Game({seed:1});
  assert.equal(g.chooseWeapon('scatter'),true);assert.equal(g.weapon,'scatter');
  assert.equal(g.chooseWeapon('does-not-exist'),false);assert.equal(g.weapon,'scatter');
  assert.equal(g.chooseWeapon('beam'),true);assert.equal(g.weapon,'beam');
});

test('pulse bullets spawn with correct damage',()=>{
  const g=new Game();g.shots=[];g.weapon='pulse';g.weaponCooldown=0;
  g.fire(0);
  assert.equal(g.shots.length,1);
  assert.equal(g.shots[0].damage,WEAPONS.pulse.damage);
  assert.equal(g.shots[0].weapon,'pulse');
});

test('shotgun has distinct fan of seven projectiles',()=>{
  const g=new Game();g.shots=[];g.weapon='scatter';g.fire(0);
  assert.equal(g.shots.length,7);
  const directions=new Set(g.shots.map(s=>Math.round(Math.atan2(s.vy,s.vx)*100)));
  assert.equal(directions.size,7);
});

test('beam is hitscan and pierces up to three aligned enemies',()=>{
  const g=new Game({seed:2});const p=g.player;
  const enemies=[g.spawnEnemy('swarm',{x:p.x+45,y:p.y}),g.spawnEnemy('swarm',{x:p.x+80,y:p.y}),g.spawnEnemy('swarm',{x:p.x+110,y:p.y}),g.spawnEnemy('swarm',{x:p.x+140,y:p.y})];
  g.enemies=enemies;g.weapon='beam';g.fire(0);
  assert.equal(g.shots.length,0);
  assert.equal(g.kills,3);
  assert.equal(enemies[3].hp,enemies[3].maxHp);
  assert.equal(g.effects.some(f=>f.type==='beam'),true);
});

test('projectile swept collision prevents tunneling on fast projectiles',()=>{
  const g=new Game({seed:2});const p=g.player;
  const e=g.spawnEnemy('swarm',{x:p.x+40,y:p.y});g.enemies=[e];
  g.shots=[{x:p.x+10,y:p.y,px:p.x+10,py:p.y,vx:400,vy:0,damage:40,left:200,range:200,radius:2,weapon:'pulse',alive:true}];
  g.updateShots(0.09);
  assert.equal(g.kills,1);assert.equal(g.shots.length,0);
});

test('wave clear presents exactly three upgrade options and stops combat',()=>{
  const g=new Game();g.enemies=[];g.step(1/60);
  assert.equal(g.state,'upgrade');assert.equal(g.upgradeChoices.length,3);
  assert.equal(new Set(g.upgradeChoices).size,3);
  const t=g.time;g.step(1/60);assert.equal(g.time,t);
});

test('choosing one upgrade starts stronger wave and records mutation',()=>{
  const g=new Game();g.enemies=[];g.step(1/60);
  const option=g.upgradeChoices[0];
  assert.equal(g.chooseUpgrade('nope'),false);
  assert.equal(g.chooseUpgrade(option),true);
  assert.equal(g.wave,2);assert.equal(g.state,'playing');
  assert.equal(g.mutations.length,1);assert.equal(g.mutations[0],option);
  assert.equal(g.enemies.length,8);
  assert.equal(g.chooseUpgrade(option),false);
});

test('upgrades directly modify corresponding numerical stats',()=>{
  for(const u of UPGRADES){
    const g=new Game();g.enemies=[];g.step(1/60);g.upgradeChoices=[u.id];
    const previous={...g.stats};
    assert.equal(g.chooseUpgrade(u.id),true);
    if(u.id==='power')assert.ok(g.stats.damage>previous.damage);
    if(u.id==='rate')assert.ok(g.stats.attackRate>previous.attackRate);
    if(u.id==='hull')assert.ok(g.stats.maxHp>previous.maxHp);
    if(u.id==='mobility')assert.ok(g.stats.speed>previous.speed);
    if(u.id==='regen')assert.ok(g.stats.regen>previous.regen);
    if(u.id==='multishot')assert.ok(g.stats.extraShots>previous.extraShots);
  }
});

test('dash consumes cooldown, grants iframes and extra speed',()=>{
  const g=new Game();const x=g.player.x;
  g.step(1/60,{moveX:1,dash:true,fire:false});
  assert.ok(g.player.x-x>3);
  assert.ok(g.player.dashReady>0);assert.ok(g.player.iframe>0);
  assert.equal(g.hitPlayer(40),false);
});

test('damage invulnerability prevents multiple hits and death terminates run',()=>{
  const g=new Game();g.player.iframe=0;
  assert.equal(g.hitPlayer(10),true);assert.equal(g.hitPlayer(10),false);
  assert.equal(g.player.hp,110);
  g.player.iframe=0;g.hitPlayer(110);g.step(1/60,{fire:false});
  assert.equal(g.state,'dead');assert.equal(g.player.hp,0);
});

test('enemy kill awards score once, increments combo, removes dead from live list',()=>{
  const g=new Game();const enemy=g.enemies[0];
  g.hitEnemy(enemy,1e5,{x:enemy.x,y:enemy.y},'pulse');
  const score=g.score;g.hitEnemy(enemy,1e5,{x:enemy.x,y:enemy.y},'pulse');
  assert.equal(g.kills,1);assert.equal(g.score,score);
  g.enemies=g.enemies.filter(e=>e.alive);
  assert.equal(g.enemies.some(e=>e.id===enemy.id),false);
});

test('shots and particles are bounded after sustained fighting',()=>{
  const g=new Game();
  for(let i=0;i<500;i++)g.spawnParticles(g.player.x,g.player.y,'#aaa',5,30);
  assert.ok(g.particles.length<=380);
  runFrames(g,300);
  assert.ok(g.particles.length<=380);
  assert.ok(g.events.length<=150);
});

test('pausing freezes the simulation then resumes',()=>{
  const g=new Game();assert.equal(g.togglePause(),true);
  const before=g.summary();runFrames(g,60);assert.deepEqual(g.summary(),before);
  assert.equal(g.togglePause(),false);runFrames(g,1);assert.ok(g.time>before.time);
});

test('recovering from kill streak timeout resets combo',()=>{
  const g=new Game();const e=g.enemies[0];g.hitEnemy(e,1000,{x:e.x,y:e.y},'pulse');
  assert.equal(g.combo,1);runFrames(g,220,{fire:false});assert.equal(g.combo,0);
});


test('enemy contact starts a visible windup instead of dealing instant damage',()=>{
  const g=new Game({seed:7}),p=g.player;
  const e=g.spawnEnemy('swarm',{x:p.x+12,y:p.y});
  e.speed=0;e.contactCooldown=0;g.enemies=[e];
  g.step(1/60,{fire:false});
  assert.equal(p.hp,120);
  assert.ok(e.attackLeft>0);
  assert.equal(e.attackTotal,ENEMIES.swarm.attackWindup);
  assert.equal(e.attackX,p.x);assert.equal(e.attackY,p.y);
  assert.ok(g.events.some(event=>event.type==='telegraph'));
  runFrames(g,36,{fire:false});
  assert.equal(p.hp,120-ENEMIES.swarm.damage);
  assert.equal(e.attackLeft,0);
  assert.ok(e.contactCooldown>0);
});

test('locked strike can be dodged by leaving the warning zone',()=>{
  const g=new Game({seed:9}),p=g.player;
  const e=g.spawnEnemy('swarm',{x:p.x+12,y:p.y});
  e.speed=0;e.contactCooldown=0;g.enemies=[e];
  g.step(1/60,{fire:false});
  const zone={x:e.attackX,y:e.attackY,radius:e.attackRadius};
  p.x+=50;
  runFrames(g,36,{fire:false});
  assert.equal(p.hp,120);
  assert.ok(Math.hypot(p.x-zone.x,p.y-zone.y)>zone.radius);
  assert.ok(g.events.some(event=>event.type==='evade'));
  assert.ok(g.effects.some(effect=>effect.type==='evade'));
});

test('invulnerable dash negates a telegraphed hit even inside warning zone',()=>{
  const g=new Game({seed:9}),p=g.player;
  const e=g.spawnEnemy('hunter',{x:p.x+13,y:p.y});
  e.speed=0;e.contactCooldown=0;g.enemies=[e];
  g.step(1/60,{fire:false});
  assert.ok(e.attackLeft>0);
  p.iframe=1;
  runFrames(g,28,{fire:false});
  assert.equal(p.hp,120);
  assert.equal(e.attackLeft,0);
  assert.ok(g.events.some(event=>event.type==='evade'));
});

test('stun delays a telegraphed attack and brutes warn longer with a larger area',()=>{
  const g=new Game({seed:12}),p=g.player;
  const e=g.spawnEnemy('brute',{x:p.x+15,y:p.y});
  e.speed=0;e.contactCooldown=0;g.enemies=[e];
  g.step(1/60,{fire:false});
  assert.ok(e.attackLeft>0);
  assert.ok(e.attackLeft>ENEMIES.swarm.attackWindup);
  assert.ok(e.attackRadius>ENEMIES.swarm.attackRadius);
  const remaining=e.attackLeft;
  e.stun=0.16;
  runFrames(g,4,{fire:false});
  assert.equal(e.attackLeft,remaining);
  runFrames(g,60,{fire:false});
  assert.equal(e.attackLeft,0);
  assert.equal(p.hp,120-ENEMIES.brute.damage);
});

function advanceToWave(game,number){
  while(game.wave<number){
    game.enemies=[];
    game.step(1/60,{fire:false});
    assert.equal(game.state,'upgrade');
    assert.equal(game.chooseUpgrade(game.upgradeChoices[0]),true);
  }
}

test('a single elite Sentinel arrives on wave 4, but not earlier waves',()=>{
  const g=new Game({seed:144});
  for(let wave=1;wave<=3;wave++){
    assert.equal(g.enemies.filter(e=>e.kind==='sentinel').length,0);
    if(wave<3)advanceToWave(g,wave+1);
  }
  advanceToWave(g,4);
  const bosses=g.enemies.filter(e=>e.kind==='sentinel');
  assert.equal(bosses.length,1);
  assert.equal(g.enemies.length,13);
  assert.ok(bosses[0].maxHp>ENEMIES.brute.hp);
  assert.ok(g.events.some(ev=>ev.type==='boss-appeared' && ev.wave===4));
  assert.equal(g.events.at(-1).type,'boss-appeared'); // boss alert follows the normal wave event
});

test('the Sentinel locks a visible cross, waits, then hits a stationary player',()=>{
  const g=new Game({seed:12}),p=g.player;
  const boss=g.spawnEnemy('sentinel',{x:p.x+55,y:p.y});
  boss.speed=0;boss.contactCooldown=0;g.enemies=[boss];
  g.step(1/60,{fire:false});
  assert.equal(p.hp,120);
  assert.equal(boss.attackLeft,ENEMIES.sentinel.attackWindup);
  assert.equal(boss.attackX,p.x);
  assert.equal(boss.attackY,p.y);
  runFrames(g,45,{fire:false});
  assert.equal(p.hp,120);
  runFrames(g,25,{fire:false});
  assert.equal(p.hp,120-ENEMIES.sentinel.damage);
  assert.ok(g.events.some(ev=>ev.type==='boss-strike' && ev.hit));
  assert.ok(g.effects.some(f=>f.type==='boss-strike'));
});

test('moving diagonally out of both Sentinel lanes avoids the hit',()=>{
  const g=new Game({seed:19}),p=g.player;
  const boss=g.spawnEnemy('sentinel',{x:p.x+55,y:p.y});
  boss.speed=0;boss.contactCooldown=0;g.enemies=[boss];
  g.step(1/60,{fire:false});
  p.x+=24;p.y+=24;
  runFrames(g,75,{fire:false});
  assert.equal(p.hp,120);
  assert.ok(g.events.some(ev=>ev.type==='boss-strike' && ev.hit===false));
  assert.ok(g.events.some(ev=>ev.type==='evade'));
});

test('moving only along a Sentinel lane is not a safe dodge',()=>{
  const g=new Game({seed:20}),p=g.player;
  const boss=g.spawnEnemy('sentinel',{x:p.x+55,y:p.y});
  boss.speed=0;boss.contactCooldown=0;g.enemies=[boss];
  g.step(1/60,{fire:false});
  p.x+=33; // outside the center box, but still on the horizontal lane
  runFrames(g,75,{fire:false});
  assert.equal(p.hp,120-ENEMIES.sentinel.damage);
});

test('a live boss blocks mutation selection; killing it clears wave 4',()=>{
  const g=new Game({seed:5});advanceToWave(g,4);
  const boss=g.enemies.find(e=>e.kind==='sentinel');
  for(const e of g.enemies){if(e!==boss)e.alive=false;}
  g.step(1/60,{fire:false});
  assert.equal(g.state,'playing');assert.equal(g.enemies.length,1);
  g.hitEnemy(boss,1e5,{x:boss.x,y:boss.y},'pulse');
  assert.ok(g.events.some(ev=>ev.type==='boss-defeated' && ev.wave===4));
  g.step(1/60,{fire:false});
  assert.equal(g.state,'upgrade');
  assert.equal(g.upgradeChoices.length,3);
});
