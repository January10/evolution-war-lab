import {Game} from './core/game.js';
import {WIDTH,HEIGHT,WEAPONS} from './core/data.js';
import {renderFrame} from './ui/draw.js';
import {Sound} from './ui/sound.js';
import {CombatGuide} from './core/onboarding.js';

const root=document.querySelector('#app');
root.innerHTML=`
<div class="shell">
  <header class="masthead">
    <div class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="brand-copy"><div class="kicker">EXPERIMENTAL COMBAT / 001</div><h1>EVOLUTION <span>WAR LAB</span></h1><p>PIXEL FRONTLINE <b>·</b> GENOME SURVIVAL</p></div>
    <div class="header-actions"><span class="version">REBUILD V1.2.5</span><button id="mute" class="outline-btn" type="button">♪ SOUND OFF</button><button id="restart" class="outline-btn bright" type="button">↻ NEW RUN</button></div>
  </header>
  <section class="mission-banner"><span class="pulse-light"></span><span id="phase">LIVE EXPERIMENT</span><span class="banner-sep">//</span><span id="objectives">CLEAR THE HOSTILES TO EVOLVE</span><span class="banner-end">SECTOR 07 / DEEP CHAMBER</span></section>
  <main class="layout">
    <section class="game-area" aria-label="战斗区">
      <div class="scoreline">
        <div><span class="micro-label">WAVE / 阶段</span><strong id="wave">01</strong></div>
        <div><span class="micro-label">HOSTILES / 敌军</span><strong id="enemies">00</strong></div>
        <div><span class="micro-label">ELIMINATED / 击杀</span><strong id="kills">000</strong></div>
        <div><span class="micro-label">SCORE / 得分</span><strong id="score">000000</strong></div>
      </div>
      <div class="screen" id="screen"><canvas id="arena" width="${WIDTH}" height="${HEIGHT}" aria-label="像素风战斗竞技场">你的浏览器不支持 Canvas。</canvas>
        <div class="overlay hidden" id="upgradeOverlay" aria-live="polite"><div class="overlay-kicker">EVOLUTION POINT ACQUIRED</div><h2>选择下一代的突变</h2><p>进化不是菜单里的数字，而是下一波能活下来的能力。</p><div id="upgrades" class="upgrade-grid"></div><div class="overlay-hint">按 1 / 2 / 3 或点击突变卡片</div></div>
        <div class="overlay hidden" id="deadOverlay"><div class="overlay-kicker lost">EXPERIMENT TERMINATED</div><h2>这一代止步于此</h2><p id="deathSummary"></p><button id="retry" type="button" class="solid-btn">↻ 重新开始实验</button></div>
        <div id="tutorial" class="combat-guide" role="status" aria-live="polite"></div>
        <div class="screen-top"><span class="chip">LIVE / ARENA 07</span><span id="comboChip" class="chip combo hidden">COMBO ×2</span></div>
        <div class="screen-bottom"><span id="waveHint">SURVIVE. ADAPT. REPEAT.</span><span>480 × 270 NATIVE PIXELS</span></div>
      </div>
      <div class="under-screen"><span><b class="teal-square"></b> 自适应攻击已启用 — 敌人会主动追击</span><span id="eventText">战斗系统就绪</span></div>
      <div class="hud-bottom"><div class="hp-block"><div class="micro-label">HULL INTEGRITY / 生命值</div><div class="hp-track"><div id="hpFill"></div></div><div id="hpLabel">120 / 120</div></div><div class="dash-block"><div class="micro-label">EVASION MODULE / 冲刺</div><div class="dash-track"><div id="dashFill"></div></div><span id="dashLabel">READY · SHIFT</span></div></div>
    </section>
    <aside class="right-pane">
      <div class="side-title"><span>WEAPON ENGINE</span><small>SELECT 01 / 02 / 03</small></div>
      <div id="weapons" class="weapon-list"></div>
      <div class="side-title mutations-heading"><span>GENOME STATUS</span><small>LIVE MUTATIONS</small></div>
      <div class="genome-card"><div class="genome-grid"><div><small>FIRE RATE</small><b id="statRate">1.00×</b></div><div><small>DAMAGE</small><b id="statPower">1.00×</b></div><div><small>MOVE SPD</small><b id="statSpeed">1.00×</b></div><div><small>LINEAGE</small><b id="statGene">GEN 01</b></div></div><div id="mutations" class="mutations">突变序列尚未出现。</div></div>
      <div class="controls-card"><div class="side-title"><span>OPERATING MANUAL</span><small>INPUTS</small></div><div class="key-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>移动</span></div><div class="key-row"><kbd>SHIFT</kbd><span>短距离无敌冲刺</span></div><div class="key-row"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><span>切换武器 / 选择进化</span></div><div class="key-row"><kbd>鼠标</kbd><span>按住左键朝准星攻击</span></div><div class="key-row"><kbd>P</kbd><span>暂停 / 继续</span></div></div>
    </aside>
  </main>
  <footer class="footer"><span>EW/LAB · 2026</span><span>DIFFERENT WEAPONS. DIFFERENT FEEL. ONE SURVIVAL LOOP.</span><span>NO EXTERNAL GAME ASSETS</span></footer>
</div>`;
const q=id=>document.getElementById(id);
let game=new Game();
let guide=new CombatGuide();
const sound=new Sound();
const canvas=q('arena'),ctx=canvas.getContext('2d',{alpha:false});
const weaponItems=Object.entries(WEAPONS);
q('weapons').innerHTML=weaponItems.map(([id,w],i)=>`<button class="weapon-card" data-weapon="${id}" type="button" aria-label="武器${i+1}：${w.label}"><span class="weapon-index">0${i+1}</span><span class="weapon-icon w-${id}">${w.icon}</span><span class="weapon-info"><b>${w.english}</b><strong>${w.label}</strong><small>${w.short}</small></span><span class="weapon-key">${i+1}</span></button>`).join('');
for(const btn of q('weapons').querySelectorAll('button'))btn.addEventListener('click',()=>{game.chooseWeapon(btn.dataset.weapon);updateHUD();});
const keys=new Set();let pointer=null,manual=false,lastEvent='',lastFrame=performance.now(),acc=0,frames=0,highScore=0;
try{highScore=Number(localStorage.getItem('ewl_highscore')||0)||0;}catch{}

function newRun(){game=new Game({seed:Math.floor(Math.random()*0xFFFFFFFF)});guide=new CombatGuide();pointer=null;manual=false;keys.clear();lastEvent='已开始新一轮生存实验';updateHUD();}
q('restart').addEventListener('click',newRun);q('retry').addEventListener('click',newRun);
q('mute').addEventListener('click',()=>{const on=sound.toggle();q('mute').textContent=on?'♫ SOUND ON':'♪ SOUND OFF';});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function mapPointer(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
canvas.addEventListener('pointermove',e=>{pointer=mapPointer(e);});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;manual=true;pointer=mapPointer(e);try{canvas.setPointerCapture(e.pointerId);}catch{}});
canvas.addEventListener('pointerup',()=>{manual=false;});canvas.addEventListener('pointercancel',()=>{manual=false;});
canvas.addEventListener('pointerleave',()=>{if(!manual)pointer=null;});
function pauseOnFocusLoss(){
  keys.clear();manual=false;
  if(game.state==='playing' && !game.paused){
    game.togglePause();
    lastEvent='窗口失去焦点，游戏已自动暂停 · 按 P 继续';
    updateHUD();
  }
}
window.addEventListener('blur',pauseOnFocusLoss);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseOnFocusLoss();});
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(['Digit1','Digit2','Digit3'].includes(e.code) && !e.repeat){
    const idx=Number(e.code.slice(-1))-1;
    if(game.state==='upgrade')game.chooseUpgrade(game.upgradeChoices[idx]);
    else game.chooseWeapon(weaponItems[idx][0]);
    updateHUD();
  }
  if(e.code==='KeyP'&&!e.repeat)game.togglePause();
  if(e.code==='KeyR'&&!e.repeat)newRun();
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function updateHUD(){
  const data=game.summary(),p=game.player,s=game.stats;
  q('wave').textContent=String(data.wave).padStart(2,'0');q('enemies').textContent=String(data.enemies).padStart(2,'0');
  q('kills').textContent=String(data.kills).padStart(3,'0');q('score').textContent=String(data.score).padStart(6,'0');
  q('hpFill').style.width=`${100*p.hp/s.maxHp}%`;q('hpLabel').textContent=`${Math.ceil(p.hp)} / ${s.maxHp}`;
  q('dashFill').style.width=`${100*(1-p.dashReady/s.dashCooldown)}%`;q('dashLabel').textContent=p.dashReady<=0?'READY · SHIFT':`${p.dashReady.toFixed(1)}s RECHARGING`;
  q('phase').textContent=data.state==='playing'?(data.paused?'CHAMBER PAUSED':'LIVE EXPERIMENT'):data.state==='upgrade'?'GENOME MODIFICATION':'EXPERIMENT TERMINATED';
  const boss=game.enemies.some(e=>e.alive && e.kind==='sentinel');
  q('objectives').textContent=data.state==='playing'?(boss?'ELIMINATE SENTINEL // AVOID THE CROSS STRIKE':game.reinforcementGroupsLeft>0?'SURVIVE THE OPENING // MORE HOSTILES INBOUND':'CLEAR THE HOSTILES TO EVOLVE'):data.state==='upgrade'?'CHOOSE A MUTATION TO PROCEED':'RESTART TO TRY A NEW BUILD';
  q('waveHint').textContent=data.state==='playing'?'SURVIVE. ADAPT. REPEAT.':data.state==='upgrade'?'GENOME ADAPTATION IN PROGRESS':'NO SIGNAL';
  q('comboChip').classList.toggle('hidden',data.combo<2);q('comboChip').textContent=`COMBO ×${data.combo}`;
  q('statRate').textContent=s.attackRate.toFixed(2)+'×';q('statPower').textContent=s.damage.toFixed(2)+'×';q('statSpeed').textContent=s.speed.toFixed(2)+'×';q('statGene').textContent=`GEN ${String(data.wave).padStart(2,'0')}`;
  q('mutations').textContent=data.mutations.length?data.mutations.map(id=>({power:'高能弹芯',rate:'神经超频',hull:'活体装甲',mobility:'推进变异',regen:'纳米修复',multishot:'扩散突变'})[id]).join(' · '):'突变序列尚未出现。';
  q('eventText').textContent=lastEvent||'战斗系统就绪';
  const tutorial=guide.hint({time:game.time,state:data.state});
  q('tutorial').classList.toggle('hidden',!tutorial);
  if(tutorial)q('tutorial').textContent=`${tutorial.label} · ${tutorial.message}`;
  for(const b of q('weapons').querySelectorAll('button')){const selected=b.dataset.weapon===data.weapon;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}
  const upgradeVisible=data.state==='upgrade';
  if(upgradeVisible && q('upgradeOverlay').dataset.wave!==String(data.wave)){
    q('upgradeOverlay').dataset.wave=String(data.wave);
    q('upgrades').innerHTML=game.upgradeOptions().map((up,i)=>`<button type="button" data-choice="${up.id}" class="upgrade-option"><span>0${i+1} / MUTATION</span><strong>${up.name}</strong><small>${up.desc}</small><em>${up.detail}</em></button>`).join('');
    q('upgrades').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{game.chooseUpgrade(b.dataset.choice);updateHUD();}));
  }
  q('upgradeOverlay').classList.toggle('hidden',!upgradeVisible);
  q('deadOverlay').classList.toggle('hidden',data.state!=='dead');
  if(data.state==='dead')q('deathSummary').textContent=`第 ${data.wave} 波 · ${data.kills} 次击杀 · ${data.score} 分 · 最高 ${Math.max(highScore,data.score)} 分`;
}
function processEvents(){
  const events=game.drainEvents();
  guide.observe({events,time:game.time,playing:game.state==='playing'});
  for(const e of events){
    sound.onEvent(e);
    if(e.type==='wave')lastEvent=`第 ${e.wave} 波敌人已接近`;
    if(e.type==='reinforcements')lastEvent=`INCOMING: +${e.count} 敌军增援 · 继续移动并躲避`;
    if(e.type==='wave-clear')lastEvent=`第 ${e.wave} 波清除成功，选择变异`;
    if(e.type==='boss-appeared')lastEvent='警报：哨兵机甲入侵！朝斜向冲刺，逃离十字火线';
    if(e.type==='boss-defeated')lastEvent='SENTINEL DOWN — 哨兵机甲已摧毁';
    if(e.type==='boss-strike')lastEvent=e.hit?'CROSS STRIKE HIT — 快使用冲刺':'CROSS STRIKE EVADED — 完美躲避';
    if(e.type==='upgrade')lastEvent='突变已融入新一代基因';
    if(e.type==='switch')lastEvent=`切换武器：${WEAPONS[e.weapon].label}`;
    if(e.type==='telegraph')lastEvent='WARNING: TARGET LOCKED - MOVE OR DASH!';
    if(e.type==='evade')lastEvent='PERFECT EVADE - KEEP MOVING!';
    if(e.type==='kill' && e.combo>=3)lastEvent=`连杀 ×${e.combo} · 继续保持火力`;
    if(e.type==='dead'){
      lastEvent='本轮实验结束';highScore=Math.max(highScore,game.score);
      try{localStorage.setItem('ewl_highscore',String(highScore));}catch{}
    }
  }
}
function frame(now){
  const delta=Math.min(.08,(now-lastFrame)/1000);lastFrame=now;
  acc+=delta;
  const moveX=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const moveY=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  guide.observe({moveX,moveY,playing:game.state==='playing' && !game.paused,time:game.time});
  let loops=0;
  while(acc>=1/60&&loops++<6){
    game.step(1/60,{
      moveX,moveY,
      dash:keys.has('ShiftLeft')||keys.has('ShiftRight'),
      aim:manual?pointer:null
    });
    acc-=1/60;
  }
  processEvents();
  renderFrame(ctx,game,{crosshair:manual?pointer:null});
  if(++frames%5===0 || game.state!=='playing')updateHUD();
  requestAnimationFrame(frame);
}
updateHUD();requestAnimationFrame(frame);
