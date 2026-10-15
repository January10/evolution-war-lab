import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatGuide} from '../src/core/onboarding.js';

test('teaches movement immediately without pausing combat or hiding controls',()=>{
  const guide=new CombatGuide();
  assert.equal(guide.hint({time:0,state:'playing'}).id,'move');
  guide.observe({moveX:0,moveY:0,events:[{type:'shot'}],time:2});
  assert.equal(guide.hint({time:2}).id,'move');
  guide.observe({moveY:-1,playing:true,time:2.1});
  assert.equal(guide.hint({time:2.1}).id,'dash');
});

test('advances only on actual dash and weapon-switch game events',()=>{
  const guide=new CombatGuide();
  guide.observe({moveX:1,time:3});
  guide.observe({events:[{type:'shot'},{type:'telegraph'}],time:4});
  assert.equal(guide.hint({time:4}).id,'dash');
  guide.observe({events:[{type:'dash'}],time:5});
  assert.equal(guide.hint({time:5}).id,'switch');
  guide.observe({events:[{type:'switch',weapon:'scatter'}],time:7});
  assert.equal(guide.hint({time:7}).id,'complete');
  assert.equal(guide.hint({time:9.1}),null);
});

test('accepts actions in any order and does not falsely count paused movement',()=>{
  const guide=new CombatGuide();
  guide.observe({events:[{type:'switch',weapon:'beam'},{type:'dash'}],time:0.5});
  assert.equal(guide.hint({time:1}).id,'move');
  guide.observe({moveX:1,playing:false,time:2});
  assert.equal(guide.hint({time:2}).id,'move');
  guide.observe({moveX:1,playing:true,time:3});
  assert.equal(guide.hint({time:3}).id,'complete');
});

test('hides during upgrades/death and always ends after thirty combat seconds',()=>{
  const guide=new CombatGuide();
  assert.equal(guide.hint({time:5,state:'upgrade'}),null);
  assert.equal(guide.hint({time:5,state:'dead'}),null);
  assert.equal(guide.hint({time:29.99,state:'playing'}).id,'move');
  assert.equal(guide.hint({time:30,state:'playing'}),null);
  assert.equal(new CombatGuide().hint({time:0,state:'playing'}).id,'move');
});
