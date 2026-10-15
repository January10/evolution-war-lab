import {createRng, clamp, distanceSquared, length} from './rng.js';
import {WIDTH, HEIGHT, WEAPONS, UPGRADES, ENEMIES} from './data.js';

const PI2 = Math.PI * 2;
const sq = x => x*x;
const entityDistance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);

// Onboarding wave: reinforcements arrive from actual kills, never from an idle timer.
// Keep only a few hostiles active at once so the opening teaches dodge + aim.
const FIRST_WAVE_REINFORCEMENT_SIZE = 6;
const FIRST_WAVE_REINFORCEMENT_GROUPS = 3;
const FIRST_WAVE_FIRST_TRIGGER = 4;

export class Game {
  constructor({seed=2026, width=WIDTH, height=HEIGHT}={}) {
    this.seed=seed;
    this.width=width;
    this.height=height;
    this.rng=createRng(seed);
    this.nextId=1;
    this.time=0;
    this.score=0;
    this.kills=0;
    this.wave=0;
    this.state='playing';
    this.paused=false;
    this.weapon='pulse';
    this.shots=[];
    this.enemies=[];
    this.particles=[];
    this.effects=[];
    this.events=[];
    this.weaponCooldown=0;
    this.combatTimer=0;
    this.waveKills=0;
    this.reinforcementGroupsLeft=0;
    this.reinforcementNextAt=Infinity;
    this.combo=0;
    this.comboTimer=0;
    this.upgradeChoices=[];
    this.mutations=[];
    this.stats={damage:1, attackRate:1, speed:1, maxHp:120, regen:0, extraShots:0, dashCooldown:1.65};
    this.player={x:width/2, y:height/2, radius:7, hp:120, vx:0, vy:0, angle:0, iframe:0, dashReady:0, dashLeft:0, facing:0};
    this.spawnWave();
  }

  rand(a=0,b=1) { return a + (b-a)*this.rng(); }
  event(type, attrs={}) {this.events.push({type,...attrs}); if(this.events.length>150) this.events.shift();}
  drainEvents(){return this.events.splice(0);}
  fx(type,x,y,attrs={}) {this.effects.push({type,x,y,life:attrs.life??0.2,total:attrs.life??0.2,...attrs});}

  spawnWave() {
    this.wave++;
    this.state='playing';
    this.combatTimer=0;
    this.waveKills=0;
    this.reinforcementGroupsLeft=this.wave===1?FIRST_WAVE_REINFORCEMENT_GROUPS:0;
    this.reinforcementNextAt=this.wave===1?FIRST_WAVE_FIRST_TRIGGER:Infinity;
    const count=Math.min(23, 4+this.wave*2);
    for(let i=0;i<count;i++) {
      let kind='swarm';
      if(this.wave>=2 && i%5===0) kind='hunter';
      if(this.wave>=3 && i%7===0) kind='brute';
      this.spawnEnemy(kind);
    }
    this.event('wave',{wave:this.wave});
    // One visible elite every fourth wave: it must die before mutation selection.
    if(this.wave%4===0){
      const boss=this.spawnEnemy('sentinel');
      this.event('boss-appeared',{wave:this.wave,bossId:boss.id});
    }
    this.fx('announcement',this.width/2,this.height*0.3,{label:`WAVE ${String(this.wave).padStart(2,'0')}`,life:1.3});
  }
  spawnEnemy(kind='swarm', point=null){
    const def=ENEMIES[kind];
    if(!def) throw new Error(`Unknown enemy ${kind}`);
    let x,y;
    if(point){ x=point.x; y=point.y; }
    else {
      const side=Math.floor(this.rand(0,4));
      if(side===0){x=this.rand(18,this.width-18);y=16;}
      else if(side===1){x=this.width-16;y=this.rand(18,this.height-18);}
      else if(side===2){x=this.rand(18,this.width-18);y=this.height-16;}
      else{x=16;y=this.rand(18,this.height-18);}
    }
    const hp=def.hp*(1+(this.wave-1)*0.13);
    const enemy={id:this.nextId++,kind,x,y,hp,maxHp:hp,speed:def.speed*(1+(this.wave-1)*0.028),radius:def.radius,damage:def.damage,
      contactCooldown:this.rand(0,0.25),attackLeft:0,attackTotal:0,attackX:0,attackY:0,attackRadius:def.attackRadius,
      stun:0,flash:0,wobble:this.rand(0,PI2),alive:true};
    this.enemies.push(enemy);
    return enemy;
  }
  chooseWeapon(id) {
    if(!WEAPONS[id] || this.state!=='playing') return false;
    if(id!==this.weapon) {this.weapon=id;this.weaponCooldown=Math.min(this.weaponCooldown,0.15);this.event('switch',{weapon:id});}
    return true;
  }
  upgradeOptions(){return this.upgradeChoices.map(id=>UPGRADES.find(u=>u.id===id));}
  chooseUpgrade(id){
    if(this.state!=='upgrade' || !this.upgradeChoices.includes(id)) return false;
    if(id==='power') this.stats.damage*=1.22;
    if(id==='rate') this.stats.attackRate*=1.17;
    if(id==='hull'){this.stats.maxHp+=30;this.player.hp=Math.min(this.stats.maxHp,this.player.hp+40);}
    if(id==='mobility'){this.stats.speed*=1.12;this.stats.dashCooldown=Math.max(0.55,this.stats.dashCooldown*0.86);}
    if(id==='regen') this.stats.regen+=0.8;
    if(id==='multishot') this.stats.extraShots+=1;
    this.mutations.push(id);
    this.event('upgrade',{upgrade:id});
    this.upgradeChoices=[];
    this.spawnWave();
    return true;
  }
  prepareUpgrade(){
    this.state='upgrade';
    this.shots=[];
    this.combo=0;
    this.comboTimer=0;
    const deck=[...UPGRADES.map(u=>u.id)];
    this.upgradeChoices=[];
    while(this.upgradeChoices.length<3){
      const i=Math.floor(this.rand(0,deck.length));
      this.upgradeChoices.push(deck.splice(i,1)[0]);
    }
    this.event('wave-clear',{wave:this.wave});
    this.fx('announcement',this.width/2,this.height*0.24,{label:'GENOME ADAPTED',life:1.5});
  }
  togglePause(){if(this.state==='playing'){this.paused=!this.paused;return this.paused;}return false;}
  nearestEnemy(x=this.player.x,y=this.player.y){
    let best=null, min=Infinity;
    for(const e of this.enemies){if(!e.alive)continue;const d=sq(x-e.x)+sq(y-e.y);if(d<min){min=d;best=e;}}
    return best;
  }
  step(dt, input={}) {
    if(this.state!=='playing'||this.paused||!Number.isFinite(dt)||dt<=0) return;
    dt=Math.min(dt,0.05);
    this.time+=dt;
    this.combatTimer+=dt;
    const p=this.player;
    p.iframe=Math.max(0,p.iframe-dt);
    p.dashReady=Math.max(0,p.dashReady-dt);
    p.dashLeft=Math.max(0,p.dashLeft-dt);
    this.weaponCooldown=Math.max(0,this.weaponCooldown-dt);
    this.comboTimer=Math.max(0,this.comboTimer-dt);
    if(this.comboTimer===0)this.combo=0;
    if(this.stats.regen>0)p.hp=Math.min(this.stats.maxHp,p.hp+this.stats.regen*dt);

    let dx=clamp(Number(input.moveX)||0,-1,1), dy=clamp(Number(input.moveY)||0,-1,1);
    const mag=length(dx,dy);
    if(mag>1){dx/=mag;dy/=mag;}
    if(input.dash && p.dashReady<=0 && mag>0){
      p.dashLeft=0.16;p.dashReady=this.stats.dashCooldown;p.iframe=Math.max(p.iframe,0.22);
      this.fx('pulse',p.x,p.y,{radius:17,life:0.23,color:'#80fcf7'});
      this.event('dash');
    }
    const speed=80*this.stats.speed*(p.dashLeft>0?2.65:1);
    p.vx=dx*speed; p.vy=dy*speed;
    p.x=clamp(p.x+p.vx*dt,p.radius+8,this.width-p.radius-8);
    p.y=clamp(p.y+p.vy*dt,p.radius+8,this.height-p.radius-8);
    if(mag>0)p.facing=Math.atan2(dy,dx);
    const target=this.nearestEnemy();
    if(input.aim && Number.isFinite(input.aim.x) && Number.isFinite(input.aim.y)) p.angle=Math.atan2(input.aim.y-p.y,input.aim.x-p.x);
    else if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);
    else p.angle=p.facing;
    if(target && input.fire!==false && this.weaponCooldown<=0) this.fire(p.angle);

    for(const e of this.enemies){
      if(!e.alive)continue;
      e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.contactCooldown=Math.max(0,e.contactCooldown-dt);
      const attack=ENEMIES[e.kind];
      // The red target remains locked at the player's location when the windup begins.
      // Moving out of it (or dashing through the impact) is always a valid counterplay.
      if(e.attackLeft>0){
        if(e.stun<=0)e.attackLeft=Math.max(0,e.attackLeft-dt);
        if(e.attackLeft===0){
          // The Sentinel warns with two finite orthogonal lanes, not a circle.
          // Dodging straight along one lane is unsafe; escape diagonally.
          const def=ENEMIES[e.kind];
          const deltaX=Math.abs(p.x-e.attackX),deltaY=Math.abs(p.y-e.attackY);
          const inStrike=def.pattern==='cross'
            ? (deltaX<=def.crossHalfLength && deltaY<=def.crossHalfWidth) ||
              (deltaY<=def.crossHalfLength && deltaX<=def.crossHalfWidth)
            : sq(p.x-e.attackX)+sq(p.y-e.attackY)<=sq(e.attackRadius);
          const damaged=inStrike && this.hitPlayer(e.damage,{x:e.x,y:e.y});
          if(def.pattern==='cross'){
            this.fx('boss-strike',e.attackX,e.attackY,{life:0.26,halfLength:def.crossHalfLength,halfWidth:def.crossHalfWidth});
            this.event('boss-strike',{hit:Boolean(damaged)});
          }
          if(!damaged){
            this.fx('evade',e.attackX,e.attackY,{life:0.35});
            this.event('evade',{kind:e.kind});
          }
          e.contactCooldown=attack.attackCooldown;
        }
        continue;
      }
      const ax=p.x-e.x, ay=p.y-e.y;
      const dist=Math.max(0.001,length(ax,ay));
      if(e.stun<=0 && dist>e.radius+p.radius+1){
        const sway=Math.sin(this.time*2+e.wobble)*0.12;
        e.x=clamp(e.x+(ax/dist+sway*-ay/dist)*e.speed*dt,e.radius+3,this.width-e.radius-3);
        e.y=clamp(e.y+(ay/dist+sway*ax/dist)*e.speed*dt,e.radius+3,this.height-e.radius-3);
      }
      if(e.stun<=0 && e.contactCooldown<=0 && entityDistance(e,p)<=e.radius+p.radius+attack.attackReach){
        e.attackLeft=attack.attackWindup;e.attackTotal=attack.attackWindup;
        e.attackX=p.x;e.attackY=p.y;e.attackRadius=attack.attackRadius;
        this.event('telegraph',{kind:e.kind});
      }
    }
    this.updateShots(dt);
    this.enemies=this.enemies.filter(e=>e.alive);
    // Replenish while the current engagement is still alive. No countdown,
    // no empty pause between phaselets, and no extra spawns in later waves.
    if(this.reinforcementGroupsLeft>0 && this.waveKills>=this.reinforcementNextAt){
      for(let i=0;i<FIRST_WAVE_REINFORCEMENT_SIZE;i++)this.spawnEnemy('swarm');
      this.reinforcementGroupsLeft--;
      this.reinforcementNextAt+=FIRST_WAVE_REINFORCEMENT_SIZE;
      this.event('reinforcements',{wave:this.wave,count:FIRST_WAVE_REINFORCEMENT_SIZE,groupsLeft:this.reinforcementGroupsLeft});
      this.fx('announcement',this.width/2,this.height*0.3,{label:'INCOMING',life:0.75});
    }
    this.effects=this.effects.filter(f=>(f.life-=dt)>0);
    this.updateParticles(dt);
    if(this.player.hp<=0){this.state='dead';this.event('dead',{score:this.score,wave:this.wave});this.fx('pulse',p.x,p.y,{radius:48,color:'#ff6f85',life:0.7});return;}
    if(this.enemies.length===0) this.prepareUpgrade();
  }
  fire(angle) {
    const p=this.player;
    const w=WEAPONS[this.weapon];
    const rad=angle;
    const ox=p.x+Math.cos(rad)*10,oy=p.y+Math.sin(rad)*10;
    this.weaponCooldown=w.cooldown/this.stats.attackRate;
    this.fx('muzzle',ox,oy,{angle:rad,color:w.color,life:0.11,radius:this.weapon==='scatter'?10:6});
    this.fx('recoil',p.x,p.y,{angle:rad,life:0.08});
    this.event('shot',{weapon:this.weapon});
    const spawnBullet=(spread,damage,speed,range,size=1.8)=>{
      const a=rad+spread;
      this.shots.push({x:ox,y:oy,px:ox,py:oy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        damage:damage*this.stats.damage,left:range,range,radius:size,weapon:this.weapon,alive:true});
    };
    if(this.weapon==='pulse'){
      spawnBullet(0,w.damage,310,w.range,2.1);
      for(let i=0;i<this.stats.extraShots;i++)spawnBullet((i%2?1:-1)*0.1*Math.ceil((i+1)/2),w.damage*0.62,300,w.range,1.35);
    } else if(this.weapon==='scatter'){
      const count=w.pellets+this.stats.extraShots;
      for(let i=0;i<count;i++)spawnBullet((i-(count-1)/2)*0.105,w.damage,this.rand(205,252),this.rand(105,w.range),1.75);
      this.fx('cone',ox,oy,{angle:rad,life:0.14});
    } else {
      const hits=this.enemies.filter(e=>e.alive).map(e=>{
        const t=(e.x-ox)*Math.cos(rad)+(e.y-oy)*Math.sin(rad);
        const dist=Math.abs((e.x-ox)*Math.sin(rad)-(e.y-oy)*Math.cos(rad));
        return {e,t,dist};
      }).filter(v=>v.t>=0&&v.t<=w.range&&v.dist<v.e.radius+3).sort((a,b)=>a.t-b.t).slice(0,3);
      let endx=ox+Math.cos(rad)*w.range,endy=oy+Math.sin(rad)*w.range;
      if(hits.length>0){const last=hits[hits.length-1];endx=last.e.x;endy=last.e.y;}
      this.fx('beam',ox,oy,{endx,endy,life:0.19,color:w.color});
      for(const {e} of hits)this.hitEnemy(e,w.damage*this.stats.damage,{x:e.x,y:e.y},'beam');
      this.fx('pulse',ox,oy,{radius:7,color:w.color,life:0.2});
    }
  }
  updateShots(dt){
    for(const bullet of this.shots){
      if(!bullet.alive)continue;
      bullet.px=bullet.x;bullet.py=bullet.y;
      const vx=bullet.vx*dt,vy=bullet.vy*dt;
      bullet.x+=vx;bullet.y+=vy;
      bullet.left-=Math.hypot(vx,vy);
      if(bullet.left<=0||bullet.x<0||bullet.y<0||bullet.x>this.width||bullet.y>this.height){bullet.alive=false;continue;}
      // Swept segment-circle collision: avoids fast projectiles tunneling through small targets.
      let victim=null,bestT=Infinity;
      for(const enemy of this.enemies){
        if(!enemy.alive)continue;
        const sx=bullet.x-bullet.px,sy=bullet.y-bullet.py;
        const d=sx*sx+sy*sy;
        const t=d<=0?0:clamp(((enemy.x-bullet.px)*sx+(enemy.y-bullet.py)*sy)/d,0,1);
        const cx=bullet.px+t*sx,cy=bullet.py+t*sy;
        if(sq(enemy.x-cx)+sq(enemy.y-cy)<=sq(enemy.radius+bullet.radius)&&t<bestT){victim=enemy;bestT=t;}
      }
      if(victim){
        bullet.alive=false;
        this.hitEnemy(victim,bullet.damage,{x:bullet.x,y:bullet.y},bullet.weapon);
      }
    }
    this.shots=this.shots.filter(b=>b.alive);
  }
  hitEnemy(enemy,damage,at,weapon){
    if(!enemy.alive)return;
    enemy.hp=Math.max(0,enemy.hp-damage);
    enemy.flash=0.09;enemy.stun=0.085;
    this.fx('hit',at.x,at.y,{color:WEAPONS[weapon].color,life:0.19});
    this.spawnParticles(at.x,at.y,WEAPONS[weapon].color,4,34);
    this.event('hit',{weapon,damage:Math.round(damage)});
    if(enemy.hp<=0){
      enemy.alive=false;
      this.kills++;
      this.waveKills++;
      this.combo=this.comboTimer>0?this.combo+1:1;
      this.comboTimer=3.2;
      this.score+=ENEMIES[enemy.kind].score * (1+Math.floor(Math.min(this.combo,12)/4));
      this.fx('death',enemy.x,enemy.y,{radius:enemy.radius+7,color:ENEMIES[enemy.kind].fill,life:0.36});
      this.spawnParticles(enemy.x,enemy.y,ENEMIES[enemy.kind].fill,enemy.kind==='sentinel'?38:enemy.kind==='brute'?22:12,65);
      if(enemy.kind==='sentinel')this.event('boss-defeated',{wave:this.wave});
      this.event('kill',{kind:enemy.kind,combo:this.combo});
    }
  }
  hitPlayer(damage,from){
    const p=this.player;
    if(p.iframe>0)return false;
    p.hp=Math.max(0,p.hp-damage);
    p.iframe=0.40;
    this.fx('damage',p.x,p.y,{life:0.32,radius:18});
    this.spawnParticles(p.x,p.y,'#d7efff',7,38);
    this.event('hurt',{damage});
    if(from){const a=Math.atan2(p.y-from.y,p.x-from.x);p.x=clamp(p.x+Math.cos(a)*5,p.radius+8,this.width-p.radius-8);p.y=clamp(p.y+Math.sin(a)*5,p.radius+8,this.height-p.radius-8);}
    return true;
  }
  spawnParticles(x,y,color,count,speed){
    for(let i=0;i<count;i++){
      const angle=this.rand(0,PI2),vel=this.rand(speed*0.2,speed),life=this.rand(.18,.48);
      this.particles.push({x,y,vx:Math.cos(angle)*vel,vy:Math.sin(angle)*vel,life,total:life,color,size:this.rand(0,1)<.65?2:3});
    }
    if(this.particles.length>380)this.particles.splice(0,this.particles.length-380);
  }
  updateParticles(dt){
    for(const v of this.particles){v.x+=v.vx*dt;v.y+=v.vy*dt;v.vx*=0.96;v.vy*=0.96;v.life-=dt;}
    this.particles=this.particles.filter(p=>p.life>0);
  }
  summary(){return {seed:this.seed,state:this.state,wave:this.wave,score:this.score,kills:this.kills,hp:Math.ceil(this.player.hp),maxHp:this.stats.maxHp,weapon:this.weapon,combo:this.combo,mutations:[...this.mutations],enemies:this.enemies.length,paused:this.paused,time:Math.floor(this.time)}}
}
