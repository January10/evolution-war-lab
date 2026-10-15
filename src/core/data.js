export const WIDTH = 480;
export const HEIGHT = 270;
export const WEAPONS = Object.freeze({
  pulse: {
    label: '脉冲步枪', english: 'PULSE RIFLE', short: '高射速 · 稳定压制',
    cooldown: 0.16, damage: 18, range: 290, color: '#fbc46c', icon: '▰'
  },
  scatter: {
    label: '碎星霰弹', english: 'STAR SHOTGUN', short: '近距离 · 扇面爆发',
    cooldown: 0.67, damage: 12, pellets: 7, range: 175, color: '#ff7d6b', icon: '✳'
  },
  beam: {
    label: '棱镜光束', english: 'PRISM BEAM', short: '直线贯穿 · 高冲击',
    cooldown: 0.88, damage: 38, range: 315, color: '#85f9f5', icon: '➤'
  }
});
export const UPGRADES = Object.freeze([
  {id:'power', name:'高能弹芯', desc:'所有武器伤害 +22%', detail:'+22% DMG'},
  {id:'rate', name:'神经超频', desc:'所有武器射速 +17%', detail:'+17% FIRE'},
  {id:'hull', name:'活体装甲', desc:'生命上限 +30，并恢复 40', detail:'+30 MAX HP'},
  {id:'mobility', name:'推进变异', desc:'移动速度 +12%，冲刺冷却缩短', detail:'+12% SPEED'},
  {id:'regen', name:'纳米修复', desc:'每秒恢复 0.8 点生命', detail:'+0.8 HP/S'},
  {id:'multishot', name:'扩散突变', desc:'脉冲增加弹片、霰弹增加弹丸', detail:'+1 PROJECTILE'}
]);
export const ENEMIES = Object.freeze({
  swarm: {hp:32, speed:29, radius:5, damage:6, score:10, fill:'#f46f85', attackWindup:0.46, attackRadius:11, attackReach:3, attackCooldown:0.93},
  hunter: {hp:52, speed:40, radius:6, damage:10, score:18, fill:'#ff9a6e', attackWindup:0.37, attackRadius:13, attackReach:5, attackCooldown:0.88},
  brute: {hp:144, speed:19, radius:10, damage:16, score:35, fill:'#b36ef2', attackWindup:0.80, attackRadius:21, attackReach:9, attackCooldown:1.40},
});
