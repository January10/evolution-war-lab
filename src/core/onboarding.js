// The first thirty combat seconds teach essential actions without pausing the arena.
// This state machine observes real player inputs and game events, not elapsed time alone.
const STEPS = Object.freeze([
  {id:'move', label:'01 / MOVE', message:'WASD / 方向键移动，躲开红色攻击预警'},
  {id:'dash', label:'02 / DASH', message:'移动时按 SHIFT 冲刺，短暂无敌'},
  {id:'switch', label:'03 / ARSENAL', message:'按 1 / 2 / 3 切换武器；系统会自动开火'},
]);

export class CombatGuide {
  constructor(){this.done=new Set();this.finishedAt=null;}

  observe({moveX=0,moveY=0,events=[],playing=true,time=0}={}){
    if(playing && (moveX!==0 || moveY!==0))this.done.add('move');
    for(const e of events){
      if(e.type==='dash')this.done.add('dash');
      if(e.type==='switch')this.done.add('switch');
    }
    if(this.done.size===STEPS.length && this.finishedAt===null)this.finishedAt=time;
  }

  hint({time=0,state='playing'}={}){
    if(state!=='playing'||time>=30)return null;
    const step=STEPS.find(s=>!this.done.has(s.id));
    if(step)return step;
    if(this.finishedAt!==null && time<this.finishedAt+2){
      return {id:'complete',label:'READY / 03',message:'操作已掌握！击败敌人，选择突变继续进化'};
    }
    return null;
  }
}
