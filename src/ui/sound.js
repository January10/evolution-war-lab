/** Tiny synthesizer; user gesture is required to turn on WebAudio. */
export class Sound {
  constructor(){this.enabled=false;this.ctx=null;}
  toggle(){
    this.enabled=!this.enabled;
    if(this.enabled){
      try {this.ctx??=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume?.();}
      catch {this.enabled=false;}
    }
    return this.enabled;
  }
  tone(freq,duration=.06,kind='square',volume=.04,endFreq=null){
    if(!this.enabled||!this.ctx)return;
    const now=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=kind;o.frequency.setValueAtTime(freq,now);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),now+duration);
    g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
    o.connect(g);g.connect(this.ctx.destination);o.start(now);o.stop(now+duration+.01);
  }
  onEvent(event){
    if(!this.enabled)return;
    if(event.type==='shot'){
      const w=event.weapon;
      this.tone(w==='beam'?620:w==='scatter'?142:230,w==='beam'?.15:w==='scatter'?.12:.04,
        w==='beam'?'sawtooth':'square',w==='beam'?.032:.021,w==='beam'?150:w==='scatter'?60:100);
    }
    if(event.type==='kill')this.tone(150+Math.min(5,event.combo)*40,.10,'triangle',.035,55);
    if(event.type==='hurt')this.tone(72,.19,'sawtooth',.05,40);
    if(event.type==='telegraph' && event.kind==='brute')this.tone(470,.15,'triangle',.023,270);
    if(event.type==='evade')this.tone(770,.07,'sine',.018,940);
    if(event.type==='upgrade')this.tone(650,.24,'sine',.055,980);
  }
}
