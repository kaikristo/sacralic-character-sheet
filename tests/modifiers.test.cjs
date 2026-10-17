const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),elements={},listeners={};
const element=()=>({value:'',textContent:'',innerHTML:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},prepend(){},append(){},remove(){},insertAdjacentHTML(){},showModal(){},querySelector(){return null;}});
const ctx={structuredClone,console,crypto:webcrypto,Date,Blob,URL,Uint8Array,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},indexedDB:{open:()=>({})},window:{scrollTo(){},matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem(){}},document:{body:element(),documentElement:{style:{setProperty(){}}},createElement:element,querySelector:s=>elements[s]??=element(),querySelectorAll:()=>[],addEventListener(type,fn){(listeners[type]??=[]).push(fn);}}};
vm.createContext(ctx);for(const file of ['combat','experience','catalog','app','rules-data','play','storage','library','effects','workflow','tabletop','wounds','modifiers'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const run=s=>vm.runInContext(s,ctx);run('migrateEffects();');



run('const talking=state.skills[0],tid=skillIdentity(talking);state.play.skillBonuses[tid]={level:2,chance:10}');assert.equal(run('effectiveSkillLevel(talking)'),7);assert.equal(run('chance(talking)'),72);assert.equal(run('talking[1]'),5);assert.equal(run('renderFormulaDialog()'),'');
run('const melee=state.skills.find(s=>s[2]==="Боевые"),before=chance(melee);state.play.customConditions=[{id:"test",name:"Помеха",enabled:true,modifiers:[{target:"chance:combat",op:"add",value:-15}]}]');assert.equal(run('chance(melee)'),run('before-15'));assert.equal(run('chance(talking)'),72);run('state.play.customConditions[0].enabled=false');assert.equal(run('chance(melee)'),run('before'));
run('state.play.customConditions=[{id:"con",name:"Выносливость",enabled:true,modifiers:[{target:"stat:CON",op:"add",value:5}]}];state.info.hp=3500;syncMaxHp();');assert.equal(run('naturalStatValue("CON",20)'),20);assert.equal(run('statTotal("CON")'),25);assert.equal(run('state.info.maxhp'),4500);assert.equal(run('state.info.hp'),4400);run('state.play.customConditions[0].enabled=false;syncMaxHp()');assert.equal(run('state.info.hp'),3500);
run('state.play.customConditions=[];const light=["Стрельба (лёгкое)",5,"Боевые","ACC",defaultFormula,"","sacralic-0",crypto.randomUUID()];state.skills.push(light);const gun={name:"Пистолет CZ",qty:1,category:"Оружие",equipped:true,details:{ammoCurrent:"0"}};state.items=[gun];state.play.ap=10;');assert.equal(run('attackAmmo(gun).cost'),1);assert.equal(run('attackAmmo(gun).max'),12);
run('performWeaponAttack(0)');assert.equal(run('gun.details.ammoCurrent'),'-1');assert.equal(run('state.play.ap'),4);run('undoEffectAction()');assert.equal(run('gun.details.ammoCurrent'),'0');assert.equal(run('state.play.ap'),10);
run('delete gun.details.ammoCurrent;performWeaponAttack(0)');assert.equal(run('gun.details.ammoCurrent'),'11');run('undoEffectAction()');assert.equal(run('Object.hasOwn(gun.details,"ammoCurrent")'),false);assert.equal(run('attackAmmo(gun).current'),12);
run('state.play.ap=0;');assert.throws(()=>run('performWeaponAttack(0)'),/Недостаточно/);assert.equal(run('attackAmmo(gun).current'),12);
run('state.play.ap=10;gun.details.ammoCurrent="2";gun.details.ammoPerAttack="3";performWeaponAttack(0)');assert.equal(run('gun.details.ammoCurrent'),'-1');run('undoEffectAction();gun.details.ammoPerAttack="-1";');assert.throws(()=>run('performWeaponAttack(0)'),/Боезапас/);assert.equal(run('gun.details.ammoCurrent'),'2');assert.equal(run('state.play.ap'),10);
run('gun.details.ammoPerAttack="1";state.play.customConditions=[{id:"attack",name:"Ярость",enabled:true,modifiers:[{target:"attackCost",op:"add",value:-1},{target:"attackDamage",op:"add",value:20},{target:"attackArmorPen",op:"add",value:2}]}]');assert.equal(run('attackNumbers(gun).cost'),5);assert.ok(run('attackNumbers(gun).damage.endsWith("+ 20")'));assert.equal(run('attackNumbers(gun).bb'),18);assert.ok(run('renderAvailableAttacks().includes("attack-chance")'));
run('gun.details.ammoCurrent="-3";const restored=validateCharacterData(JSON.parse(JSON.stringify(state)))');assert.equal(run('restored.items[0].details.ammoCurrent'),'-3');assert.equal(run('restored.play.skillBonuses[tid].level'),2);assert.equal(run('restored.play.customConditions[0].modifiers.length'),3);
assert.ok(run('renderFeatBalances().includes("feat-simple")'));assert.ok(run('!renderFeatBalances().includes("выдано")'));run('damageOpen=true');assert.ok(run('!renderDamageDialog().includes("Броня")'));assert.ok(run('!renderDamageDialog().includes("data-wound-armor")'));
run('gun.details.actionCost="6"');assert.match(run('renderWeapons()'),/data-tabletop="attack"/);
console.log('Passed: manual skill level/chance bonuses, scoped conditions and HP preservation, signed ammunition with undo, attack effects and compact presentation.');

run('page=0');assert.ok(!run('renderAvailableAttacks()').includes('data-tabletop="attack"'));assert.match(run('renderWeapons()'),/data-tabletop="attack"/);
ctx.Event=Event;
const modal={tagName:'DIALOG',open:true,getBoundingClientRect:()=>({left:20,right:200,top:30,bottom:300}),dispatchEvent(event){assert.equal(event.type,'cancel');this.cancelled=true;return true;},close(){this.open=false;}};
ctx.testModal=modal;
assert.equal(run('isDialogBackdrop({target:testModal,clientX:5,clientY:50})'),true);
assert.equal(run('isDialogBackdrop({target:testModal,clientX:30,clientY:50})'),false);
run('dismissDialogBackdrop(testModal)');assert.equal(modal.cancelled,true);assert.equal(modal.open,false);
modal.open=true;modal.dispatchEvent=event=>{event.preventDefault();return false;};run('dismissDialogBackdrop(testModal)');assert.equal(modal.open,true);
console.log('Passed: overview attack controls hidden, combat execution retained, backdrop bounds and cancellable dismissal.');

run('state.play.favoriteSkills=[];toggleFavoriteSkill(state.skills.indexOf(light))');assert.ok(run('isFavoriteSkill(light)'));assert.match(run('renderPlaySummary()'),/Шансы избранных навыков/);assert.ok(run('renderFavoriteSkills().includes(chance(light)+"%")'));
run('state.skills.reverse();migrateEffects()');assert.ok(run('isFavoriteSkill(light)'));assert.ok(run('validateCharacterData(JSON.parse(JSON.stringify(state))).play.favoriteSkills.includes(skillIdentity(light))'));
run('toggleFavoriteSkill(state.skills.indexOf(light))');assert.equal(run('renderFavoriteSkills()'),'');
assert.deepEqual(JSON.parse(run('JSON.stringify(SKILL_CATALOG.filter(s=>s.id.startsWith("sacralic-armor-")).map(s=>s.name))')),['Легкая броня','Средняя броня','Тяжелая броня']);assert.equal(run('SKILL_CATALOG[0].id'),'sacralic-0');
// Simulate touch pointer handlers independently of the browser, including cancellation.
run('creationDraft=newCreationDraft()');
const dialog={...element(),getBoundingClientRect:()=>({top:0,bottom:600}),querySelectorAll:()=>[],querySelector:()=>element(),scrollTop:180};elements['.creation-dialog']=dialog;
const handle={...element(),dataset:{poolToken:'1'},disabled:false,textContent:'10',setPointerCapture(){},closest:selector=>selector==='dialog'?dialog:null};
const slot={...element(),dataset:{createStat:'2'},closest:()=>slot};ctx.document.elementFromPoint=()=>slot;
const down=listeners.pointerdown.find(fn=>fn.toString().includes('creationPointer={')),move=listeners.pointermove.find(fn=>fn.toString().includes('const d=creationPointer')),up=listeners.pointerup.find(fn=>fn.toString().includes('const d=creationPointer'));
const touch={pointerType:'touch',pointerId:7,clientX:50,clientY:100,preventDefault(){},target:{closest:()=>handle}};
down(touch);move({...touch,clientX:130,clientY:250});up({...touch,clientX:130,clientY:250});assert.equal(run('creationDraft.assigned[2]'),1);assert.equal(dialog.scrollTop,180);assert.equal(run('creationPointer'),null);
down(touch);run('clearCreationDrag()');assert.equal(run('creationPointer'),null);
console.log('Passed: favorite skill migration, live chances and JSON round trip, stable armor catalog IDs, touch creation drag and cancellation.');
