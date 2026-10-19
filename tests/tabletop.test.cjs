const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),elements={};
const element=()=>({value:'',textContent:'',innerHTML:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},prepend(){},insertAdjacentHTML(){},showModal(){},querySelector(){return null;}});
const ctx={structuredClone,console,crypto:webcrypto,Date,Blob,URL,Uint8Array,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},indexedDB:{open:()=>({})},window:{scrollTo(){},matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem(){}},document:{body:element(),documentElement:{style:{setProperty(){}}},createElement:element,querySelector:s=>elements[s]??=element(),querySelectorAll:()=>[],addEventListener(){}}};
vm.createContext(ctx);for(const file of ['combat','experience','catalog','app','rules-data','play','storage','library','effects','workflow','tabletop'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const run=s=>vm.runInContext(s,ctx);run('migrateEffects();');

run('state.info.race="Ноко";state.stats.find(s=>s[1]==="DEX")[2]=10;state.stats.find(s=>s[1]==="CHA")[2]=8;migrateEffects();');
assert.equal(run('state.stats.find(s=>s[1]==="DEX")[2]'),20);assert.equal(run('statTotal("DEX")'),20);assert.equal(run('statBonus("DEX")'),0);assert.equal(run('state.stats.find(s=>s[1]==="CHA")[2]'),3);
run('migrateEffects();migrateEffects();');assert.equal(run('statTotal("DEX")'),20);
run('state.info.race="Человек";migrateEffects();');assert.equal(run('state.stats.find(s=>s[1]==="DEX")[2]'),10);assert.equal(run('state.stats.find(s=>s[1]==="CHA")[2]'),8);assert.equal(run('statCap("DEX")'),25);
run('state.info.race="Диззри";migrateEffects();');assert.equal(run('statBonus("INT")'),0);assert.equal(run('statTotal("INT")'),15);
run('state=migrateCharacter(validateCharacterData(JSON.parse(JSON.stringify(state))));migrateEffects();');assert.equal(run('statTotal("INT")'),15);
run('state.info.race="Человек";migrateEffects();const light=["Стрельба (лёгкое)",5,"Боевые","ACC",defaultFormula,"","sacralic-0"];state.skills=[light];const cz={name:"Пистолет CZ",category:"Оружие",equipped:true,details:{}};');
assert.equal(run('attackNumbers(cz).cost'),6);assert.equal(run('attackNumbers(cz).baseDamage'),'1d100');assert.equal(run('attackNumbers(cz).mastery'),100);assert.equal(run('attackNumbers(cz).bb'),16);assert.equal(run('attackNumbers(cz).range'),'50');assert.equal(run('attackNumbers(cz).damage'),'1d100 + 1d100 + 100');
run('light[1]=4;');assert.equal(run('attackNumbers(cz).mastery'),0);run('light[1]=6;');assert.equal(run('attackNumbers(cz).mastery'),200);
run('const fast=RULE_ENTRIES.find(e=>e.title==="Быстрый стрелок");state.play.pinned.push(fast.id);');assert.equal(run('attackNumbers(cz).cost'),5);
run('light[1]=10;');assert.equal(run('attackNumbers(cz).cost'),3);
run('state.effects.sources[fast.id]={enabled:false};');assert.equal(run('attackNumbers(cz).cost'),4);
run('cz.details.actionCostBonus=-1;');assert.equal(run('attackNumbers(cz).cost'),3);
run('state.items=[cz];');assert.ok(run('renderAvailableAttacks().includes("Выстрел · Пистолет CZ")'));assert.ok(run('!renderStat(state.stats[0],0).includes("stat-limit")'));run('statEdit=0;');assert.ok(run('renderStatDialog().includes("Максимум:")'));
console.log('Passed: permanent racial bases and migration, race changes, CZ attack damage/AB/mastery, skill and feat action costs, hidden caps.');

// The chosen skill, rather than the weapon type or the first matching skill, drives attacks.
run('state.play.pinned=[];state.items=[];const strong=["Ближний бой силовой стиль",6,"Боевые","STR",defaultFormula,"","sacralic-6"],agile=["Ближний бой ловкий стиль",2,"Боевые","DEX",defaultFormula,"","sacralic-5"];state.skills=[strong,agile];migrateEffects();const sword={name:"Один меч",category:"Оружие",equipped:true,qty:1,weight:0,value:0,notes:"",bonuses:{},details:{type:"Ближний бой силовой стиль",damage:"1d100",armorPen:"3",range:"1",actionCost:"6",mastery:"5/50"}};state.items=[sword];setWeaponSkill(0,skillIdentity(strong));');
assert.equal(run('attackNumbers(sword).skill===strong'),true);assert.equal(run('attackNumbers(sword).mastery'),100);assert.match(run('renderInventory()'),/data-weapon-skill="0"/);assert.match(run('renderItemDetails("Оружие",sword.details)'),/<select data-itemdetail="skill"/);
run('setWeaponSkill(0,skillIdentity(agile));');assert.equal(run('weaponSkillKey(sword)'),'Ближний бой ловкий стиль');assert.equal(run('attackNumbers(sword).skill===agile'),true);assert.equal(run('attackNumbers(sword).chance'),run('chance(agile)'));assert.equal(run('attackNumbers(sword).level'),2);assert.equal(run('attackNumbers(sword).mastery'),0);assert.equal(run('attackNumbers(sword).skillDice'),0);
run('var skillCopy=[...strong];skillCopy[7]=crypto.randomUUID();skillCopy[1]=1;skillCopy[4]="17";state.skills.push(skillCopy);setWeaponSkill(0,skillIdentity(skillCopy));');assert.equal(run('attackNumbers(sword).chance'),17);assert.equal(run('attackNumbers(sword).level'),1);
run('var custom=["Особый приём оружия",3,"Боевые","DEX","37","","",crypto.randomUUID()];state.skills.push(custom);setWeaponSkill(0,skillIdentity(custom));');assert.equal(run('attackNumbers(sword).chance'),37);assert.equal(run('attackNumbers(sword).skill===custom'),true);assert.equal(run('validateCharacterData(JSON.parse(JSON.stringify(state))).items[0].details.skill'),run('skillIdentity(custom)'));
assert.throws(()=>run('setWeaponSkill(0,"nonexistent")'),/списка/);assert.equal(run('sword.details.skill'),run('skillIdentity(custom)'));
run('state.skills=state.skills.filter(s=>s!==custom);');assert.equal(run('attackNumbers(sword).chance'),null);assert.match(run('weaponSkillOptions(sword.details)'),/Недоступный навык/);
run('setWeaponSkill(0,"");');assert.equal(run('weaponSkillKey(sword)'),'Ближний бой силовой стиль');assert.equal(run('sword.details.skill'),undefined);
run('state.skills=[];setWeaponSkill(0,"Ближний бой ловкий стиль");');assert.equal(run('weaponSkillKey(sword)'),'Ближний бой ловкий стиль');assert.equal(run('attackNumbers(sword).chance'),run('statTotal("DEX")'));assert.equal(run('attackNumbers(sword).level'),0);
console.log('Passed: explicit per-weapon skills override type, both melee styles, skill-specific mastery/dice/armor, duplicate and custom skills, stable saved IDs, deleted skills, validation and automatic fallback.');
