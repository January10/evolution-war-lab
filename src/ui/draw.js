import {WIDTH,HEIGHT,ENEMIES,WEAPONS} from '../core/data.js';
import {clamp} from '../core/rng.js';

const px=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
const lines=(ctx,color,width=1)=>{ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='butt';ctx.lineJoin='miter';};
const shadow='#07111e';

function drawArena(ctx,game){
  const w=game.width,h=game.height;
  px(ctx,0,0,w,h,'#081322');
  px(ctx,8,8,w-16,h-16,'#0b1b2b');
  // Desaturated pixel-floor tile grid and warning strips, no smoothed imagery.
  for(let y=15;y<h;y+=24){
    for(let x=15;x<w;x+=24){
      px(ctx,x,y,1,1,((x+y)%3===0)?'#254052':'#1a3244');
      if(x+23<w&&y+23<h){px(ctx,x+13,y+12,3,1,'#112638');}
    }
  }
  for(let x=8;x<w-8;x+=24){
    px(ctx,x,7,12,2,'#3d3842');px(ctx,x,h-9,12,2,'#3d3842');
    px(ctx,x+4,7,5,2,'#ad865c');px(ctx,x+4,h-9,5,2,'#ad865c');
  }
  for(let y=8;y<h-8;y+=22){px(ctx,7,y,2,12,'#3d3842');px(ctx,w-9,y,2,12,'#3d3842');}
  ctx.strokeStyle='#244457';ctx.lineWidth=1;
  ctx.strokeRect(8.5,8.5,w-17,h-17);
  ctx.strokeStyle='#152c3d';
  for(const [x,y] of [[w/2,h/2],[w/2-82,h/2],[w/2+82,h/2]]){
    ctx.beginPath();ctx.moveTo(x-14,y);ctx.lineTo(x+14,y);ctx.moveTo(x,y-14);ctx.lineTo(x,y+14);ctx.stroke();
  }
  // Decorative tech pylons, intentionally no collision promise.
  for(const [x,y] of [[86,63],[394,63],[86,207],[394,207]]){
    px(ctx,x-8,y-6,17,14,'#07121d');px(ctx,x-7,y-8,15,11,'#1b3a4a');
    px(ctx,x-4,y-7,9,2,'#3c5b67');px(ctx,x-3,y-2,7,2,'#327c91');
    px(ctx,x-5,y+3,11,2,'#0d2535');
  }
  // Directional corners make arena shape visually readable.
  for(const [x,y,hx,hy] of [[12,12,1,1],[w-12,12,-1,1],[12,h-12,1,-1],[w-12,h-12,-1,-1]]){
    px(ctx,x,y,13*hx,2,'#57c7c8');px(ctx,x,y,2,12*hy,'#57c7c8');
  }
}

function drawPlayer(ctx,game){
  const p=game.player;
  if(p.iframe>0 && Math.floor(game.time*30)%2===0)return;
  const x=Math.round(p.x),y=Math.round(p.y);
  px(ctx,x-7,y+5,15,4,'#061019');
  if(p.dashLeft>0){
    const ax=Math.cos(p.facing),ay=Math.sin(p.facing);
    for(let i=0;i<3;i++)px(ctx,x-ax*9-i*ax*7-2,y-ay*9-i*ay*7-2,5,5,i===2?'#1d5b7d':'#45adc2');
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(p.angle);
  px(ctx,-6,-6,12,12,shadow);
  px(ctx,-5,-5,10,10,'#2d6d87');
  px(ctx,-7,-3,3,6,'#1c4359');px(ctx,4,-3,3,6,'#1c4359');
  px(ctx,-3,-4,6,8,'#6ee1e0');
  px(ctx,0,-2,11,4,'#a9f4f1');px(ctx,9,-1,4,2,'#e8fbfa');
  px(ctx,-2,-2,4,4,'#183e54');
  ctx.restore();
  // Small directional green reticle over the player's chassis.
  px(ctx,x-1,y-9,3,2,'#ceffd3');
}

function drawEnemy(ctx,e,time){
  const x=Math.round(e.x),y=Math.round(e.y),col=ENEMIES[e.kind].fill;
  px(ctx,x-e.radius,y+e.radius-1,e.radius*2+1,3,'#060f19');
  ctx.save();ctx.translate(x,y);
  const bright=e.flash>0;
  if(e.kind==='swarm'){
    px(ctx,-5,-4,11,8,'#321f35');px(ctx,-4,-4,8,7,bright?'#fff1e8':col);
    px(ctx,-6,0,3,3,'#a33e65');px(ctx,3,0,3,3,'#a33e65');
    px(ctx,-2,-2,4,2,'#311726');px(ctx,-1,-2,2,1,'#f3d8d5');
  }else if(e.kind==='hunter'){
    px(ctx,-6,-5,13,11,'#43242c');px(ctx,-4,-5,9,9,bright?'#fff1e8':col);
    px(ctx,-8,-4,3,4,'#a84f49');px(ctx,5,1,3,4,'#a84f49');
    px(ctx,-1,-2,4,3,'#682e37');
  }else{
    px(ctx,-10,-10,21,19,'#32213e');px(ctx,-8,-8,17,15,bright?'#fff1e8':col);
    px(ctx,-9,-11,6,5,'#66348d');px(ctx,3,-11,6,5,'#66348d');
    px(ctx,-6,-2,13,4,'#402252');px(ctx,-3,-2,7,2,'#e7b8f5');
    px(ctx,-9,6,5,4,'#662f89');px(ctx,4,6,5,4,'#662f89');
  }
  ctx.restore();
  if(e.hp<e.maxHp && e.hp>0){
    const bw=e.kind==='brute'?22:14;
    px(ctx,x-Math.round(bw/2),y-e.radius-9,bw,2,'#381f38');
    px(ctx,x-Math.round(bw/2),y-e.radius-9,bw*clamp(e.hp/e.maxHp,0,1),2,col);
  }
}

function drawTelegraph(ctx,e){
  if(e.attackLeft<=0)return;
  const progress=clamp(1-e.attackLeft/e.attackTotal,0,1);
  const x=Math.round(e.attackX),y=Math.round(e.attackY),r=e.attackRadius;
  // Pixel-rect danger zone: brightens as the strike becomes imminent.
  px(ctx,x-r,y-r,2*r+1,2*r+1,progress>.68?'#cf2f3645':'#9c2c3440');
  ctx.strokeStyle=progress>.68?'#ffde86':'#ff7380';ctx.lineWidth=1;
  ctx.strokeRect(x-r+.5,y-r+.5,2*r,2*r);
  const size=Math.max(1,Math.round(2*r*progress));
  px(ctx,x-r,y-r-4,2*r+1,2,'#572e42');
  px(ctx,x-r,y-r-4,size,2,progress>.68?'#ffe190':'#ff9e86');
  const mark=progress>.68?'#fff1c3':'#ff9093';
  px(ctx,x-1,y-4,2,3,mark);px(ctx,x-1,y+2,2,2,mark);
}

function drawBullet(ctx,b){
  const color=b.weapon==='scatter'?'#ff9e72':'#ffc763';
  const a=Math.atan2(b.vy,b.vx);
  ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));ctx.rotate(a);
  px(ctx,-6,-1,8,3,color);px(ctx,2,-1,3,2,'#fff6d6');
  ctx.restore();
}

function drawFx(ctx,f){
  const t=clamp(f.life/f.total,0,1);
  if(f.type==='beam'){
    const dx=f.endx-f.x,dy=f.endy-f.y,L=Math.hypot(dx,dy),n=Math.ceil(L/4);
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.atan2(dy,dx));
    px(ctx,0,-3,L*t,6,'#166f82');px(ctx,0,-2,L*t,4,'#31e2e4');
    for(let i=0;i<n;i++){if(i%3===0)px(ctx,i*4,-1,3,2,'#f3fffb');}
    ctx.restore();
    px(ctx,f.endx-4,f.endy-4,8,8,'#50dbee');
    return;
  }
  if(f.type==='muzzle'){
    const r=(f.radius||6)*Math.max(t,.25);
    px(ctx,f.x-r/2,f.y-r/2,r,r,f.color||'#ffc163');
    px(ctx,f.x-2*r/3,f.y-1,4*r/3,2,'#fff5c8');
    px(ctx,f.x-1,f.y-2*r/3,2,4*r/3,'#fff5c8');
    return;
  }
  if(f.type==='recoil')return;
  if(f.type==='evade'){
    const r=5+Math.round((1-t)*12);
    ctx.strokeStyle='#87ffe2';ctx.lineWidth=2;
    ctx.strokeRect(Math.round(f.x-r),Math.round(f.y-r),r*2,r*2);
    return;
  }
  if(f.type==='hit'){
    const r=8*(1-t)+2;
    ctx.strokeStyle=f.color||'#ffce7a';ctx.lineWidth=2;
    ctx.strokeRect(Math.round(f.x-r/2),Math.round(f.y-r/2),Math.round(r),Math.round(r));
    return;
  }
  if(f.type==='death'||f.type==='pulse'||f.type==='damage'){
    const r=(f.radius||14)*(1-t)+2;
    ctx.strokeStyle=f.type==='damage'?'#ff7990':f.color||'#ffaf79';ctx.lineWidth=f.type==='death'?3:2;
    ctx.strokeRect(Math.round(f.x-r),Math.round(f.y-r),Math.round(r*2),Math.round(r*2));
    return;
  }
  if(f.type==='cone'){
    const dist=(1-t)*26+7,spread=13*(1-t)+4;
    const a=f.angle,xx=f.x+Math.cos(a)*dist,yy=f.y+Math.sin(a)*dist;
    ctx.save();ctx.translate(xx,yy);ctx.rotate(a);
    px(ctx,-3,-spread,3,5,'#ffc5a0');px(ctx,-3,spread-5,3,5,'#ffc5a0');
    ctx.restore();
  }
}

function drawParticles(ctx,particles){
  for(const p of particles)px(ctx,p.x,p.y,p.size,p.size,p.color);
}

function drawCrosshair(ctx,point){
  if(!point)return;
  const x=Math.round(point.x),y=Math.round(point.y);
  const c='#b8eff0';
  px(ctx,x-8,y-1,5,2,c);px(ctx,x+4,y-1,5,2,c);px(ctx,x-1,y-8,2,5,c);px(ctx,x-1,y+4,2,5,c);
  px(ctx,x,y,1,1,'#ffffff');
}

export function renderFrame(ctx,game,{crosshair=null}={}) {
  if(!ctx)return;
  const w=game.width||WIDTH,h=game.height||HEIGHT;
  ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,w,h);
  const shaking=game.effects.some(f=>f.type==='damage' || (f.type==='death' && f.radius>16));
  ctx.save();if(shaking)ctx.translate(Math.round(Math.sin(game.time*83)*1.4),0);
  drawArena(ctx,game);
  for(const e of game.enemies)drawTelegraph(ctx,e);
  for(const b of game.shots)drawBullet(ctx,b);
  for(const e of game.enemies)drawEnemy(ctx,e,game.time);
  drawPlayer(ctx,game);
  for(const fx of game.effects)drawFx(ctx,fx);
  drawParticles(ctx,game.particles);
  ctx.restore();
  drawCrosshair(ctx,crosshair);
  if(game.paused){
    px(ctx,0,0,w,h,'#09131fc9');
    ctx.fillStyle='#a8f5e9';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText('SYSTEM PAUSED',w/2,h/2);
  }
}
