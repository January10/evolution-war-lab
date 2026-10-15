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
  {id:'power', name:'高能弹芯', desc:'首层伤害 +22%，重复选择收益递减', detail:'POWER · DIMINISHING'},
  {id:'rate', name:'神经超频', desc:'首层射速 +17%，重复选择收益递减', detail:'RATE · DIMINISHING'},
  {id:'hull', name:'活体装甲', desc:'首层生命上限 +30，恢复最多 40；叠加递减', detail:'ARMOR · DIMINISHING'},
  {id:'mobility', name:'推进变异', desc:'首层速度 +12%，叠加递减；冲刺加快', detail:'SPEED · DIMINISHING'},
  {id:'regen', name:'纳米修复', desc:'首层每秒回血 0.8，叠加递减', detail:'REGEN · DIMINISHING'},
  {id:'multishot', name:'扩散突变', desc:'脉冲或霰弹各增加 1 个弹丸，最多三层', detail:'+1 PROJECTILE (MAX 3)'}
]);
export const ENEMIES = Object.freeze({
  swarm: {hp:32, speed:29, radius:5, damage:6, score:10, fill:'#f46f85', attackWindup:0.46, attackRadius:11, attackReach:3, attackCooldown:0.93},
  hunter: {hp:52, speed:40, radius:6, damage:10, score:18, fill:'#ff9a6e', attackWindup:0.37, attackRadius:13, attackReach:5, attackCooldown:0.88},
  brute: {hp:144, speed:19, radius:10, damage:16, score:35, fill:'#b36ef2', attackWindup:0.80, attackRadius:21, attackReach:9, attackCooldown:1.40},
  sentinel: {hp:440, speed:20, radius:16, damage:23, score:300, fill:'#f7be5c', attackWindup:1.10, attackRadius:15, attackReach:65, attackCooldown:2.35, pattern:'cross', crossHalfLength:64, crossHalfWidth:9},
});
