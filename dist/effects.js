/* Explicit Sacralic modifiers. Base values are never rewritten by recurring effects. */
const EFFECT_STATS=['STR','DEX','CON','RTC','ACC','INT','LCK','CHA'];
const EFFECT_CATEGORIES=['Расы','Классы','Престиж-классы','Простые фиты','Эпик'];
const effectNorm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]/g,'');
let effectsOpenSource=null;
function migrateEffects(){
 if(!state.effects||typeof state.effects!=='object'||Array.isArray(state.effects))state.effects={};
 for(const key of ['sources','adjustments','overrides','baseCaps'])if(!state.effects[key]||typeof state.effects[key]!=='object'||Array.isArray(state.effects[key]))state.effects[key]={};
 if(!Array.isArray(state.effects.custom))state.effects.custom=[];
 state.effects.custom=state.effects.custom.filter(e=>e&&typeof e.id==='string'&&typeof e.target==='string'&&Number.isFinite(e.value)&&['add','percent','multiply','set'].includes(e.op));
 const used=new Set();for(const s of state.skills){if(typeof s[7]!=='string'||used.has(s[7]))s[7]=crypto.randomUUID();used.add(s[7]);}
 if(!Number.isFinite(state.play.apBase))state.play.apBase=state.play.apMax;
 state.effects.version=1;
}
function sourceConfig(id){const c=state.effects?.sources?.[id];return c&&typeof c==='object'&&!Array.isArray(c)?c:{};}
function selectedRaceEntry(){return RULE_ENTRIES.find(e=>e.category==='Расы'&&effectNorm(e.title)===effectNorm(state.info.race));}
function selectedEffectSources(){
 const list=[],race=selectedRaceEntry();if(race)list.push({...race,automatic:true});
 for(const id of state.play.pinned){const e=RULE_ENTRIES.find(e=>e.id===id);if(e&&EFFECT_CATEGORIES.includes(e.category)&&e.category!=='Расы'&&!list.some(x=>x.id===id))list.push(e);}
 const bonusClass=race&&({'Диззри':'Техник','Соло':'Стрелок','Ладрон':'Авантюрист'})[race.title];
 if(bonusClass){const e=RULE_ENTRIES.find(e=>e.category==='Классы'&&e.title===bonusClass);if(e&&!list.some(s=>s.id===e.id))list.push({...e,automatic:true,grantedBy:race.title});}
 return list;
}
function toggleRulePin(id){const e=RULE_ENTRIES.find(r=>r.id===id);if(e?.category==='Расы'){state.info.race=e.title;state.play.pinned=state.play.pinned.filter(key=>RULE_ENTRIES.find(r=>r.id===key)?.category!=='Расы');const model=effectsForSource(e);if(model.choices.some(c=>!model.cfg[c.key]))effectsOpenSource=id;return;}const i=state.play.pinned.indexOf(id);if(i<0){state.play.pinned.push(id);if(e&&EFFECT_CATEGORIES.includes(e.category)){const model=effectsForSource(e);if(model.choices.some(c=>!model.cfg[c.key]))effectsOpenSource=id;}}else state.play.pinned.splice(i,1);}
function skillIdentity(skill){return skill[7]||'';}
function skillEffectName(skill){return SKILL_CATALOG.find(e=>e.id===skill[6])?.name||skill[0];}
function effectSkillMatches(skill,scope){
 const name=skillEffectName(skill).toLowerCase();
 const patterns={melee:/ближний бой/,ranged:/стрельба/,stealth:/скрытност/,observation:/наблюдатель/,conversation:/разговор|убежден/,knowledge:/знани/,repair:/ремонт/,psi:/пси|пирокин|материализац|ясновид|шаманизм/,mental:/пси|мист|разум|дух/,art:/искусств|исполнен|музык/};
 return !scope||scope==='all'||scope.startsWith('id:')&&skillIdentity(skill)===scope.slice(3)||scope.startsWith('attribute:')&&skill[3]===scope.slice(10)||!!patterns[scope]?.test(name);
}
function effectsForSource(source){
 const cfg=sourceConfig(source.id),effects=[],choices=[],conditions=[];let n=0;
 const count=Number.isSafeInteger(cfg.count)?Math.max(1,Math.min(50,cfg.count)):1;
 const level=Number.isSafeInteger(cfg.level)?Math.max(1,cfg.level):state.info.level;
 const add=(target,value,label,options={})=>effects.push({id:source.id+'/'+(options.key||effectNorm(target.split(':')[0]+' '+label)),sourceId:source.id,source:source.title,url:source.url,target,value,label,op:'add',...options,sourceEnabled:cfg.enabled!==false});
 const conditional=(key,label)=>{conditions.push({key,label});return !!cfg.conditions?.[key];};
 const choose=(key,label,type)=>{choices.push({key,label,type});return cfg[key]||'';};
 const pickedSkill=()=>choose('skill','Навык для бонуса','skill');
 const pickedStat=()=>choose('stat','Характеристика для бонуса','stat');
 const stat=(code,value,label)=>add('stat:'+code,value,label);
 const cap=(code,value)=>add('cap:'+code,value,'Максимум '+code);
 const skill=(scope,value,label,options={})=>add('chance',value,label,{scope,...options});
 const skillLevel=(id,value,label)=>add('skillLevel',value,label,{scope:'id:'+id,requires:!!id});
 const name=source.title;
 if(source.category==='Расы'){
  const raceBonuses={'Диззри':{INT:5,CHA:5,CON:-5},'Амфибии каста Воинов.':{CON:5,STR:5,INT:-5},'Амфибии - каста Шаманов':{CON:5},'Ноко':{DEX:10,CHA:-5},'Соло':{ACC:5,STR:-5},'Тини':{RTC:5,LCK:-5},'Ладрон':{LCK:5,STR:-5},'Морферы.':Object.fromEntries(EFFECT_STATS.map(c=>[c,2]))};
  for(const [code,value] of Object.entries(raceBonuses[name]||{}))stat(code,value,'Расовый модификатор '+code);
  const caps={'Диззри':['CON',10],'Амфибии каста Воинов.':['INT',10],'Ноко':['CHA',10],'Соло':['STR',10],'Тини':['LCK',10],'Ладрон':['STR',10]};
  if(caps[name])add('cap:'+caps[name][0],caps[name][1],'Расовый предел',{op:'setBase'});
  const unlimited={'Диззри':['INT','CHA'],'Амфибии каста Воинов.':['CON','STR'],'Амфибии - каста Шаманов':['CON'],'Ноко':['DEX'],'Соло':['ACC'],'Тини':['RTC'],'Ладрон':['LCK']};
  for(const code of unlimited[name]||[])add('cap:'+code,0,'Нет расового ограничения '+code,{op:'unlimited'});
  if(name==='Человек')for(const code of EFFECT_STATS)cap(code,5);
  if(name==='Морферы.')for(const code of EFFECT_STATS){add('cap:'+code,20,'Жёсткий предел морфера',{op:'set'});add('stat:'+code,20,'Ни один параметр не выше 20',{op:'upper'});}
 if(name==='Диззри'){add('move:jump',5,'Длина прыжка');if(state.info.level>=10){const active=conditional('trade','Разговор при торговле');add('skillLevel',1,'Торговый Разговор',{scope:'conversation',condition:active});}if(state.info.level>=20){add('chance',10,'Сопротивление мистике / псионике',{scope:'mental',modes:['defense']});}}
  if(name.startsWith('Амфибии')){if(state.info.level>=10){const active=conditional('underwater','Под водой');skill('all',20,'Атаки под водой',{combatOnly:true,modes:['normal','aimed'],condition:active});}}
  if(name==='Ноко'){
   const senses=conditional('senses','Наблюдение зрением или слухом');skill('observation',20,'Тонкий слух и зрение',{condition:senses});add('jumpCost',1,'Прыжок Ноко',{op:'set'});
   if(state.info.level>=10){const family=choose('family','Семья / окрас Ноко','family');if(['black','red'].includes(family))add('skillLevel',1,'Семейный ловкий стиль',{scope:'melee',attribute:'DEX'});if(['black','gray'].includes(family))add('skillLevel',1,'Семейная скрытность',{scope:'stealth'});}
  }
  if(name==='Соло'){const id=pickedSkill();skillLevel(id,1,'Рождённый с оружием');}
  if(name==='Тини'){const haste=conditional('haste','Ускорение Тини (движение по прямой)');add('move:walk',5,'Ускорение',{condition:haste});add('move:run',5,'Ускорение',{condition:haste});}
  if(name==='Ладрон'&&state.info.level>=10){const blur=conditional('blur','Размытая форма; броня снята');add('move:run',1,'Бег в размытой форме',{condition:blur});}
 }
 if(source.category==='Классы'){
  if(name==='Боец'){const style=choose('style','Стиль бойца','style');add('cap:'+(style==='STR'?'STR':'DEX'),5,'Максимум по стилю',{requires:!!style});cap('CON',5);}
  else{const table=ruleTable('Классы');let start=source.row-1;for(let i=start;i<table.rows.length&&(i===start||!table.rows[i][0]);i++){const text=String(table.rows[i][4]||'');const value=Number(text.match(/\+\s*(\d+)/)?.[1]);if(value)for(const code of text.match(/STR|AGL|CON|RCT|ACC|INT|LCK|CHA/g)||[])cap(statAlias(code),value);}}
 }
 if(source.category==='Простые фиты'){
  if(name==='Всезнайка')skill('knowledge',5,'Броски знания');
  if(name==='Дуболом'){skill('melee',10,'Попадание в ближнем бою',{modes:['normal','aimed']});add('dodge',-20,'Штраф на уворот');}
  if(name==='Крадущаяся тень'){skill('stealth',10,'Скрытность');skill('observation',-20,'Наблюдательность');}
  if(name==='Мастер на все руки')skill('repair',5,'Ремонт');
  if(name==='Меткий стрелок')skill('ranged',5,'Прицельный выстрел',{modes:['aimed']});
  if(name==='На грани безумия'){const id=pickedSkill();skill('id:'+id,10,'Выбранная пси-дисциплина',{requires:!!id});add('chance',-20,'Защита от INT',{scope:'attribute:INT',modes:['defense']});}
  if(name==='Предельная концентрация'){skill('attribute:INT',10,'Защита от INT',{modes:['defense']});const passive=conditional('passive','Пассивная пси-способность');skill('psi',passive?10:-20,'Пси-способность',{modes:['normal','aimed']});}
  if(name==='Неисправимый лгун'||name==='Честный переговорщик'){const context=choose('speech','Ситуация разговора','speech');skill('conversation',name==='Неисправимый лгун'?(context==='lie'?10:-20):(context==='truth'?10:-40),'Убеждение: выбранный контекст',{condition:!!context});}
  if(name==='Параноидальная готовность')add('initiative',5,'Реакция для инициативы / превента');
  if(name==='Попрыгун'){add('dodge',10,'Уворот');skill('melee',-20,'Попадание в ближнем бою',{modes:['normal','aimed']});}
  if(name==='Соколиный глаз'){skill('observation',10,'Наблюдательность');skill('stealth',-20,'Скрытность');}
  if(name==='Увеличить максимум стата (стат)'){const code=pickedStat();add('cap:'+code,5*count,'Максимум выбранного параметра',{requires:!!code});}
  if(name==='Увеличить шанс успеха (навык)'){const id=pickedSkill();skill('id:'+id,5*count,'Шанс выбранного навыка',{requires:!!id});}
 }
 if(source.category==='Эпик'){
  if(name==='Профессионал (навык)'){const id=pickedSkill();skillLevel(id,count,'Профессиональный навык');add('skillCap:'+id,count,'Максимум навыка',{requires:!!id});}
  if(name==='Быстрота рефлексов')add('ap',3,'Дополнительные ОД');
  if(name==='Поднять характеристику (стат)'){const code=pickedStat();add('stat:'+code,5*count,'Поднятая характеристика',{requires:!!code});}
  if(name==='Взять 20'){const code=pickedStat();add('stat:'+code,20,'Характеристика считается 20',{op:'set',requires:!!code,respectCap:true});}
  if(name==='Снять ограничение (стат)'){const code=pickedStat();add('cap:'+code,0,'Снято ограничение',{op:'unlimited',requires:!!code});}
  if(name==='Железное здоровье')add('hp',50*count,'Базовые HP увеличены',{op:'percent'});
  if(name==='Счастливчик (бой)'||name==='Счастливчик (мир)')add('critical',5*count,'Шанс критического успеха',{category:name.includes('бой')?'Боевые':'Мирные'});
  if(name==='Исключение промаха'){const id=pickedSkill();skill('id:'+id,95,'Фиксированный шанс',{op:'set',requires:!!id,modes:['normal','aimed']});}
 }
 if(source.category==='Престиж-классы'){
  const row=ruleTable('Престиж-классы').rows[source.row-1],caps=String(row[4]||'');for(const code of caps.match(/STR|AGL|CON|RCT|ACC|INT|LCK|CHA/g)||[])cap(statAlias(code),5);
  if(name==='Бастион')add('hpModifier',3,'Множитель HP вместо 2',{op:'set'});
  if(name==='Уворотчик')add('dodge',10,'Абсолютный бонус уворота');
  if(name==='Легкий стрелок'){add('move:walk',1,'Скорость передвижения');add('move:run',1,'Скорость бега');}
  if(name==='Материализатор')add('hp','EPMAX','HP от максимального EP');
  if(name==='Телохранитель'){const active=conditional('protectedAttacked','Цель атаковала охраняемого в этом раунде');skill('all',level/4,'Атака по обидчику охраняемого',{modes:['normal','aimed'],combatOnly:true,condition:active});}
  if(name==='Снайпер'){const optics=conditional('optics','Прицельный выстрел с оптикой');skill('ranged','ACC','Бонус оптики',{modes:['aimed'],condition:optics});}
  if(name==='Зверовод: верный друг'){const nearby=conditional('nearby','Питомец рядом в пределах навыка; оба в сознании');add('ap','CHA_TENS','Взаимопонимание с питомцем',{condition:nearby});}
  if(name==='Вор'){const illegal=conditional('illegal','Противозаконное действие'),evasion=conditional('evasion','Успешный уворот; после него не атаковал');skill('all','LCK','Противозаконное действие',{condition:illegal});add('dodge','LCK','Уворот после успешной защиты',{condition:evasion});}
  if(name==='Дипломат'){const persuasion=conditional('persuasion','Бросок убеждения');skill('conversation',level/3,'Убеждение дипломата',{condition:persuasion});}
  if(name==='Маэстро'){const id=pickedSkill(),perform=conditional('perform','Исполнение основного искусства');skill('id:'+id,level/3,'Исполнение маэстро',{requires:!!id,condition:perform});}
  if(name==='Игрок'){const id=pickedSkill(),specialized=conditional('specialized','Выбранная азартная игра');skill('id:'+id,level/4,'Игровая специализация',{requires:!!id,condition:specialized});}
  if(name==='Следопыт'){const id=choose('terrainSkill','Навык знания текущей местности','skill'),active=conditional('terrain','На знакомой местности');add('chance','TERRAIN','Все броски на знакомой местности',{scope:'all',condition:active,requires:!!id,terrainSkill:id});}
  if(name==='Безумный ученый'){const unrelated=conditional('unrelated','Действие не ведёт к выбранной идее');skill('all',(unrelated?-1:1)*level/2,'Одержимость идеей');}
 }
 for(const custom of state.effects?.custom||[])if(custom.sourceId===source.id)effects.push({...custom,sourceId:source.id,source:source.title,url:source.url,sourceEnabled:cfg.enabled!==false});
 return {source,cfg,effects,choices,conditions,count,level};
}
function allEffectSpecs(){return selectedEffectSources().flatMap(source=>effectsForSource(source).effects);}
function effectExpression(value,spec){
 if(typeof value==='number')return value;
 if(value==='TERRAIN'){const s=state.skills.find(s=>skillIdentity(s)===spec.terrainSkill);return s?effectiveSkillLevel(s):0;}
 if(value==='EPMAX')return state.play.resources.filter(r=>/^(ep|ер|энергия)$/i.test(r.name.trim())).reduce((n,r)=>Math.max(n,r.max),0);
 if(value==='CHA_TENS')return Math.floor(statTotal('CHA')/10);
 return EFFECT_STATS.includes(value)?statTotal(value):0;
}
function applicableEffects(target,context={}){
 return allEffectSpecs().filter(e=>{
  if(e.target!==target&&!(target.startsWith('chance:')&&e.target==='chance')&&!(target.startsWith('skillLevel:')&&e.target==='skillLevel'))return false;
  if(e.scope&&(!context.skill||!effectSkillMatches(context.skill,e.scope)))return false;
  if(e.attribute&&context.skill?.[3]!==e.attribute)return false;
  if(e.category&&context.skill?.[2]!==e.category)return false;
  if(e.combatOnly&&context.skill?.[2]!=='Боевые')return false;
  if(e.modes&&!e.modes.includes(context.mode||'normal'))return false;
  return true;
 }).map(e=>{const adjustment=state.effects.adjustments[e.id];const enabled=e.sourceEnabled&&e.requires!==false&&e.condition!==false&&adjustment?.enabled!==false;return {...e,enabled,manual:Number.isFinite(adjustment?.value),value:Number.isFinite(adjustment?.value)?adjustment.value:effectExpression(e.value,e)};});
}
function resolveEffectTarget(base,target,context={}){
 const lines=applicableEffects(target,context),active=lines.filter(e=>e.enabled);let value=base;
 if(active.some(e=>e.op==='unlimited'))value=null;
 else{
  for(const e of active.filter(e=>e.op==='setBase'))value=e.value;
  if(value!==null){for(const e of active.filter(e=>e.op==='multiply'))value*=e.value;value*=1+active.filter(e=>e.op==='percent').reduce((n,e)=>n+e.value,0)/100;value+=active.filter(e=>e.op==='add').reduce((n,e)=>n+e.value,0);for(const e of active.filter(e=>e.op==='set')){value=e.value;if(e.respectCap){const cap=statCap(target.split(':')[1]);if(cap!==null)value=Math.min(value,cap);}}for(const e of active.filter(e=>e.op==='upper'))value=Math.min(value,e.value);}
 }
 const override=state.effects.overrides[target];if(override?.enabled&&Number.isFinite(override.value))value=override.mode==='set'?override.value:(value??0)+override.value;
 return {base,value,lines,override};
}
function statCap(code){const base=state.effects.baseCaps[code];return resolveEffectTarget(Number.isFinite(base)?base:null,'cap:'+code).value;}
const beforeEffectsStatBonus=statBonus;
statTotal=function(code){const base=Number(state.stats.find(s=>s[1]===code)?.[2]||0)+beforeEffectsStatBonus(code);return Math.max(1,resolveEffectTarget(base,'stat:'+code).value);};
statBonus=function(code){return statTotal(code)-Number(state.stats.find(s=>s[1]===code)?.[2]||0);};
function effectiveSkillLevel(skill){return Math.max(1,Math.floor(resolveEffectTarget(skill[1],'skillLevel:'+skillIdentity(skill),{skill}).value));}
const beforeEffectsSkillResult=skillResult;
skillResult=function(skill){const effective=[...skill];effective[1]=effectiveSkillLevel(skill);const result=beforeEffectsSkillResult(effective);if(result.error)return result;return {...result,value:resolveEffectTarget(result.value,'chance:'+skillIdentity(skill),{skill}).value};};
const beforeEffectsHp=hpFormulaResult;
hpFormulaResult=function(formula=state.info.hpFormula,modifier=state.info.hpModifier){const actualModifier=resolveEffectTarget(modifier,'hpModifier').value,result=beforeEffectsHp(formula,actualModifier);if(result.error)return result;const value=Math.floor(resolveEffectTarget(result.value,'hp').value);return Number.isSafeInteger(value)&&value>=0?{value,error:''}:{value:null,error:'Некорректный итог HP.'};};
const beforeEffectsMovement=movementValues;
movementValues=function(config=state.play.movement){
 const vars=Object.fromEntries(state.stats.map(s=>[s[1],statTotal(s[1])]));Object.assign(vars,{WALKBASE:state.play.walk,RUNBASE:state.play.run,LVL:state.info.level,AGL:statTotal('DEX'),RCT:statTotal('RTC')});
 try{const walk=resolveEffectTarget(calculateFormula(config.walkFormula,vars)+config.walkBonus,'move:walk').value;vars.WALK=walk;const run=resolveEffectTarget(calculateFormula(config.runFormula,vars)+config.runBonus,'move:run').value;vars.RUN=run;const jump=Math.floor(resolveEffectTarget(calculateFormula(config.jumpFormula,vars)+config.jumpBonus,'move:jump').value),jumpCost=resolveEffectTarget(2,'jumpCost').value;if([walk,run,jump].some(n=>!Number.isFinite(n)||n<0)||!Number.isSafeInteger(jumpCost)||jumpCost<1)throw Error('Проверьте бонусы движения.');return {walk,run,jump,jumpCost,error:''};}catch(error){return {walk:null,run:null,jump:null,jumpCost:2,error:error.message};}
};
function refreshEffectAp(){const previous=Number.isFinite(state.effects.lastApMax)?state.effects.lastApMax:state.play.apMax;const spent=Math.max(0,previous-state.play.ap);const next=Math.max(0,Math.floor(resolveEffectTarget(state.play.apBase,'ap').value));state.play.apMax=next;state.play.ap=Math.max(0,next-spent);state.effects.lastApMax=next;}
const beforeEffectsSnapshot=actionSnapshot;
actionSnapshot=function(label,cost){beforeEffectsSnapshot(label,cost);state.play.history[state.play.history.length-1].apMax=state.play.apMax;};
function undoEffectAction(){const p=state.play,last=p.history.pop();if(!last)return;const spent=Math.max(0,(last.apMax??p.apBase)-last.ap);Object.assign(p,{round:last.round,ap:Math.max(0,p.apMax-spent),conditions:last.conditions});}
const beforeEffectsDerived=derivedPlay;
derivedPlay=function(){const d=beforeEffectsDerived();d.initiative=resolveEffectTarget(statTotal('RTC'),'initiative').value;d.prevent=d.initiative>=51?10:d.initiative>=41?7:d.initiative>=31?5:d.initiative>=21?3:0;let base=statTotal('DEX');for(const s of state.skills){const row=COMBAT_TABLE[combatKey(s)]?.[effectiveSkillLevel(s)];if(row&&/уворот/.test(row.attribute))try{base=Math.max(base,calculateFormula(row.attribute.replace(/%.*$/,'').replace(/AGL/g,'DEX'),{DEX:statTotal('DEX')}));}catch{}}d.dodge=resolveEffectTarget(base,'dodge').value;const move=movementValues();d.jump=move.jump;return d;};
resolveRoll=function(skill,mode,modifier,superiority,roll){
 const vars=Object.fromEntries(state.stats.map(s=>[s[1],statTotal(s[1])])),effective=[...skill];effective[1]=effectiveSkillLevel(skill);let base=statTotal(skill[3]),result=beforeEffectsSkillResult(effective),target=result.value;if(result.error)throw Error(result.error);
 if(mode==='aimed'){const expr=COMBAT_TABLE[combatKey(skill)]?.[effectiveSkillLevel(skill)]?.hit.split(',')[1]?.trim();if(!expr||expr==='нет')throw Error('На этом уровне прицельное действие недоступно.');target=calculateFormula(expr.replace(/AGL/g,'DEX'),vars);}
 if(mode==='defense'){const defense=COMBAT_TABLE[combatKey(skill)]?.[effectiveSkillLevel(skill)]?.attribute;if(defense&&/уворот/.test(defense)){base=statTotal('DEX');target=resolveEffectTarget(calculateFormula(defense.replace(/%.*$/,'').replace(/AGL/g,'DEX'),vars),'dodge').value;}}
 target=resolveEffectTarget(target,'chance:'+skillIdentity(skill),{skill,mode}).value+modifier-(mode==='defense'?superiority*5:0);
 const pure=mode==='defense'&&roll<=base,success=roll<=target||pure,criticalChance=resolveEffectTarget(statTotal('LCK')/2,'critical',{skill,mode}).value;
 return {name:skill[0],roll,target,base,pure,success,critical:success&&roll<=base&&roll<=criticalChance,mode};
};
const beforeEffectsCombatInfo=renderCombatInfo;
renderCombatInfo=function(skill){const effective=[...skill];effective[1]=effectiveSkillLevel(skill);let extra='<p class="help-copy">Таблица выше показывает основу навыка. Итог обычного действия с выбранными бонусами: '+(chance(skill)??'ошибка')+'%.</p>';try{extra+='<p class="help-copy">Итог прицельного действия: '+resolveRoll(skill,'aimed',0,0,100).target+'%.</p>';}catch{}return beforeEffectsCombatInfo(effective)+extra;};
function effectTargetLabel(key){const [kind,id]=key.split(':');const s=state.skills.find(s=>skillIdentity(s)===id);return ({stat:'Характеристика',cap:'Максимум',chance:'Шанс',skillLevel:'Уровень навыка',skillCap:'Максимум навыка',move:'Движение'})[kind]?({stat:'Характеристика',cap:'Максимум',chance:'Шанс',skillLevel:'Уровень навыка',skillCap:'Максимум навыка',move:'Движение'})[kind]+' · '+(s?.[0]||({walk:'Шаг',run:'Бег',jump:'Прыжок'})[id]||id):({hp:'Максимальные HP',hpModifier:'Модификатор HP',ap:'ОД в раунд',dodge:'Уворот',initiative:'Инициатива',jumpCost:'ОД за прыжок',critical:'Критический шанс'})[key]||key;}
function targetBaseValue(key){
 const [kind,id]=key.split(':'),s=state.skills.find(s=>skillIdentity(s)===id);
 if(kind==='stat')return Number(state.stats.find(s=>s[1]===id)?.[2]||0)+beforeEffectsStatBonus(id);
 if(kind==='cap')return Number.isFinite(state.effects.baseCaps[id])?state.effects.baseCaps[id]:null;
 if(kind==='chance'&&s){const copy=[...s];copy[1]=effectiveSkillLevel(s);return beforeEffectsSkillResult(copy).value;}
 if(kind==='skillLevel'&&s)return s[1];if(kind==='skillCap')return 5;
 if(key==='hpModifier')return state.info.hpModifier;if(key==='hp')return beforeEffectsHp(state.info.hpFormula,resolveEffectTarget(state.info.hpModifier,'hpModifier').value).value;
 if(key==='ap')return state.play.apBase;if(key==='dodge')return statTotal('DEX');if(key==='initiative')return statTotal('RTC');if(key==='jumpCost')return 2;
 if(kind==='move'){try{const c=state.play.movement,vars=Object.fromEntries(state.stats.map(s=>[s[1],statTotal(s[1])]));Object.assign(vars,{WALKBASE:state.play.walk,RUNBASE:state.play.run,LVL:state.info.level,AGL:statTotal('DEX'),RCT:statTotal('RTC')});const walk=calculateFormula(c.walkFormula,vars)+c.walkBonus;vars.WALK=resolveEffectTarget(walk,'move:walk').value;const run=calculateFormula(c.runFormula,vars)+c.runBonus;vars.RUN=resolveEffectTarget(run,'move:run').value;return id==='walk'?walk:id==='run'?run:calculateFormula(c.jumpFormula,vars)+c.jumpBonus;}catch{return null;}}
 return 0;
}
function renderTargetBreakdown(key){
 const s=state.skills.find(s=>skillIdentity(s)===key.split(':')[1]),result=resolveEffectTarget(targetBaseValue(key),key,{skill:s});if(result.value!==null&&['hp','ap','move:jump'].includes(key))result.value=Math.floor(result.value);
 const stat=key.startsWith('stat:')?state.stats.find(s=>s[1]===key.split(':')[1]):null;
 return `<div class="bonus-breakdown"><b>${esc(effectTargetLabel(key))}</b><div class="bonus-line"><span>База${stat?' '+stat[2]+' · ручной бонус '+stat[3]+' · экипировка '+(beforeEffectsStatBonus(stat[1])-stat[3]):''}</span><strong>${result.base??'не задана'}</strong></div>${result.lines.map(e=>`<div class="bonus-line ${e.enabled?'':'bonus-inactive'}"><span>${esc(e.source)} · ${esc(e.label)}${e.manual?' · вручную':''}${!e.enabled?' · выключено / условие не выполнено':''}</span><strong>${e.op==='unlimited'?'без предела':e.op==='percent'?e.value+'%':e.op==='multiply'?'× '+e.value:e.op==='set'||e.op==='setBase'?'= '+e.value:'('+e.value+')'}</strong></div>`).join('')}${result.override?.enabled?`<div class="bonus-line"><span>Ручная поправка · ${result.override.mode==='set'?'замена итога':'добавление'}</span><strong>${result.override.value}</strong></div>`:''}<div class="bonus-line bonus-final"><span>Итог${result.value===null?' · исходный предел не задан или снят':''}</span><strong>${result.value===null?'—':Math.round(result.value*100)/100}</strong></div></div>`;
}
function renderEffectChoice(choice,cfg){const options=choice.type==='stat'?EFFECT_STATS.map(c=>[c,c]):choice.type==='skill'?state.skills.map(s=>[skillIdentity(s),s[0]]):choice.type==='family'?[['black','Чёрные'],['red','Рыжие'],['gray','Серые'],['striped','Полосатые']]:choice.type==='style'?[['STR','Силовой (STR)'],['DEX','Ловкий (DEX)']]:[['truth','Правда'],['lie','Ложь']];return `<label>${esc(choice.label)}<select data-effect-choice="${choice.key}"><option value="">Выберите…</option>${options.map(([value,label])=>`<option value="${esc(value)}" ${cfg[choice.key]===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;}
function renderSourceSettings(id){const source=selectedEffectSources().find(e=>e.id===id);if(!source)return '';const model=effectsForSource(source),cfg=model.cfg;return `<dialog id="effect-source-dialog" class="formula-dialog effect-source-dialog" aria-labelledby="effect-source-title"><div class="toolbar"><h2 id="effect-source-title">${esc(source.title)}</h2><button data-effect-action="close" aria-label="Закрыть бонусы">×</button></div><p class="help-copy">${esc(source.category)}. Максимумы параметров не прибавляются к самим параметрам. При уже учтённом вручную бонусе выключите его строку, чтобы избежать двойного учёта.</p><label class="check-row"><input id="effect-source-enabled" type="checkbox" ${cfg.enabled!==false?'checked':''}> Применять этот источник</label><div class="fields">${model.choices.map(c=>renderEffectChoice(c,cfg)).join('')}<label>Количество взятий (для повторяемых эффектов)<input id="effect-count" type="number" min="1" max="50" step="1" value="${model.count}"></label>${source.category==='Престиж-классы'?`<label>Уровень класса для lvl-эффектов<input id="effect-class-level" type="number" min="1" value="${model.level}"></label>`:''}</div>${model.conditions.map(c=>`<label class="check-row"><input type="checkbox" data-effect-condition="${c.key}" ${cfg.conditions?.[c.key]?'checked':''}> ${esc(c.label)}</label>`).join('')}<h3>ЧИСЛОВЫЕ ЭФФЕКТЫ</h3><div class="effect-adjustments">${model.effects.map(e=>{const a=state.effects.adjustments[e.id]||{};return `<div class="effect-adjustment"><label class="check-row"><input type="checkbox" data-effect-enabled="${e.id}" ${a.enabled!==false?'checked':''}> ${esc(e.label)}<small>${esc(effectTargetLabel(e.target))}</small></label><label>Замена величины<input type="number" step="any" data-effect-value="${e.id}" value="${Number.isFinite(a.value)?a.value:''}" placeholder="${typeof e.value==='number'?e.value:esc(e.value)}"></label></div>`;}).join('')||'<p class="help-copy">У этого источника нет постоянного числового модификатора перечисленных показателей. Его правила доступны ниже; при необходимости добавьте свой модификатор.</p>'}</div><details><summary>Текст правила / требования</summary><p class="rule-text">${esc(source.text)}</p><a href="${source.url}" target="_blank" rel="noopener">Источник Sacralic ↗</a></details><p class="help-copy">Правила, меняющие выбор цели, дайсы урона, иммунитеты, обучение и разовые выдачи очков, не превращаются в бонус к шансу. Их текст остаётся в карточке. Требования выбора проверяются игроком; условные эффекты включаются флажками.</p><div id="effect-error" class="formula-error" role="status"></div><div class="dialog-actions"><button data-effect-action="reset-source">Сбросить настройки</button><button data-effect-action="save-source">Применить бонусы</button></div></dialog>`;}
function renderEffectsPage(){
 const sources=selectedEffectSources(),keys=[...EFFECT_STATS.flatMap(c=>['stat:'+c,'cap:'+c]),'hp','hpModifier','ap','dodge','initiative','critical','jumpCost','move:walk','move:run','move:jump',...state.skills.flatMap(s=>['skillLevel:'+skillIdentity(s),'chance:'+skillIdentity(s)])];
 return `<section class="panel effects-page">${playHeading('АВТОМАТИЧЕСКИЕ МОДИФИКАТОРЫ','Бонусы и источники')}<p class="help-copy">Раса берётся из личного дела; классы и фиты — из выбранных записей справочника. Формулы и базовые значения сохраняются. Каждый источник можно настроить, выключить или заменить вручную.</p><div class="effects-toolbar"><button data-effect-action="select-class">+ Класс / престиж</button><button data-effect-action="select-feat">+ Фит</button></div><div class="effect-sources">${sources.map(s=>{const m=effectsForSource(s);return `<article><div><small>${esc(s.category)}${s.automatic?' · автоматически'+(s.grantedBy?' от '+esc(s.grantedBy):''):''}</small><b>${esc(s.title)}</b><span>${m.cfg.enabled===false?'Выключено':m.effects.length+' числовых эффектов'}${m.choices.some(c=>!m.cfg[c.key])?' · требуется выбор':''}${m.conditions.length?' · есть условия':''}</span></div><button data-effect-source="${s.id}">Настроить</button></article>`;}).join('')}</div><h3>ХАРАКТЕРИСТИКИ И ПРЕДЕЛЫ</h3><div class="rule-grid">${EFFECT_STATS.map(c=>renderTargetBreakdown('stat:'+c)+renderTargetBreakdown('cap:'+c)).join('')}</div><h3>HP И ОЧКИ ДЕЙСТВИЯ</h3><div class="rule-grid">${['hpModifier','hp','ap'].map(renderTargetBreakdown).join('')}</div><h3>РУЧНАЯ ПОПРАВКА</h3><p class="help-copy">Добавить к вычислению или принудительно установить итог. Пустые поля не действуют. Поправки независимы от купленных очков и не меняют стоимость повышения.</p><div class="manual-override-form"><label>Показатель<select id="effect-override-target">${keys.map(key=>`<option value="${key}">${esc(effectTargetLabel(key))}</option>`).join('')}</select></label><label>Режим<select id="effect-override-mode"><option value="add">Добавить к итогу</option><option value="set">Установить итог</option></select></label><label>Значение<input id="effect-override-value" type="number" step="any"></label><button data-effect-action="add-override">Применить поправку</button></div><div class="effect-overrides">${Object.entries(state.effects.overrides).filter(([key,v])=>v?.enabled).map(([key,v])=>`<div><b>${esc(effectTargetLabel(key))}</b><span>${v.mode==='set'?'=':'('}${v.value}${v.mode==='set'?'':')'}</span><button data-effect-remove="${esc(key)}">Убрать</button></div>`).join('')}</div><details><summary>Базовые пределы характеристик</summary><p class="help-copy">В таблице нет общего числового предела для всех рас. Укажите исходные пределы вашей кампании, если они используются. Расовые явные ограничения и модификаторы максимумов учитываются отдельно.</p><div class="fields">${EFFECT_STATS.map(c=>`<label>${c}<input type="number" min="1" step="1" data-base-cap="${c}" value="${state.effects.baseCaps[c]??''}" placeholder="Не задан"></label>`).join('')}</div><button data-effect-action="save-caps">Сохранить исходные пределы</button></details><h3>СВОЙ ЭФФЕКТ ОТ ИСТОЧНИКА</h3><div class="manual-override-form"><label>Источник<select id="effect-custom-source">${sources.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('')}</select></label><label>Показатель<select id="effect-custom-target">${keys.map(key=>`<option value="${key}">${esc(effectTargetLabel(key))}</option>`).join('')}</select></label><label>Бонус<input id="effect-custom-value" type="number" step="any"></label><button data-effect-action="add-custom">Добавить эффект</button></div>${state.effects.custom.map(e=>`<p>${esc(e.sourceId)} · ${esc(effectTargetLabel(e.target))} (${e.value}) <button data-effect-custom-remove="${e.id}">Убрать</button></p>`).join('')}<p id="effects-page-error" class="formula-error" role="status"></p></section>`;
}
function saveSourceSettings(){const source=selectedEffectSources().find(s=>s.id===effectsOpenSource),model=effectsForSource(source),cfg={...model.cfg,enabled:document.querySelector('#effect-source-enabled').checked,conditions:{...model.cfg.conditions}},count=Number(document.querySelector('#effect-count').value);if(!Number.isSafeInteger(count)||count<1||count>50)throw Error('Количество взятий: целое от 1 до 50.');cfg.count=count;document.querySelectorAll('[data-effect-choice]').forEach(el=>cfg[el.dataset.effectChoice]=el.value);document.querySelectorAll('[data-effect-condition]').forEach(el=>cfg.conditions[el.dataset.effectCondition]=el.checked);const level=document.querySelector('#effect-class-level');if(level){const n=Number(level.value);if(!Number.isSafeInteger(n)||n<1)throw Error('Введите уровень класса от 1.');cfg.level=n;}const adjustments={...state.effects.adjustments};for(const row of document.querySelectorAll('[data-effect-enabled]')){const value=document.querySelector(`[data-effect-value="${row.dataset.effectEnabled}"]`).value.trim();if(value!==''&&!Number.isFinite(Number(value)))throw Error('Некорректная величина эффекта.');adjustments[row.dataset.effectEnabled]={enabled:row.checked,...(value!==''?{value:Number(value)}:{})};}state.effects.sources[source.id]=cfg;state.effects.adjustments=adjustments;effectsOpenSource=null;}
const beforeEffectsSourceCard=sourceCard;
sourceCard=function(entry,pinnable=true){let html=beforeEffectsSourceCard(entry,pinnable);if(entry.category==='Расы'&&selectedRaceEntry()?.id===entry.id)html=html.replace('aria-pressed="false"','aria-pressed="true"').replace('>☆</button>','>★</button>').replace('Добавить в способности:','Выбранная раса:');if(EFFECT_CATEGORIES.includes(entry.category)&&selectedEffectSources().some(e=>e.id===entry.id))html=html.replace('</article>',`<button class="source-bonus-button" data-effect-source="${entry.id}">⚙ Бонусы и условия</button></article>`);return html;};
const beforeEffectsStatDialog=renderStatDialog,beforeEffectsHpDialog=renderHpDialog,beforeEffectsFormulaDialog=renderFormulaDialog;
renderStatDialog=function(){let html=beforeEffectsStatDialog();if(statEdit<0)return html;const s=state.stats[statEdit];html=html.replace(/<p class="muted">От надетых предметов:[\s\S]*?<\/p>/,'<p class="muted">Экипировка: '+(beforeEffectsStatBonus(s[1])-(s[3]||0))+'. Итог с автоматическими бонусами: '+statTotal(s[1])+'.</p>');return html.replace('<div class="dialog-actions">',renderTargetBreakdown('stat:'+s[1])+renderTargetBreakdown('cap:'+s[1])+'<div class="dialog-actions">');};
renderHpDialog=function(){return beforeEffectsHpDialog().replace('<div class="dialog-actions">',renderTargetBreakdown('hpModifier')+renderTargetBreakdown('hp')+'<div class="dialog-actions">');};
renderFormulaDialog=function(){const html=beforeEffectsFormulaDialog();if(formulaOpen<0)return html;return html.replace('<div class="dialog-actions">',renderTargetBreakdown('skillLevel:'+skillIdentity(state.skills[formulaOpen]))+renderTargetBreakdown('chance:'+skillIdentity(state.skills[formulaOpen]))+'<div class="dialog-actions">');};
const beforeEffectsSavePlay=savePlayEditor,beforeEffectsPlayDialog=renderPlayDialog;
savePlayEditor=function(){if(playDialog!=='combat-settings')return beforeEffectsSavePlay();const max=readPlayNumber('play-apmax'),ap=readPlayNumber('play-ap'),walk=readPlayNumber('play-walk'),run=readPlayNumber('play-run'),effectiveMax=Math.max(0,Math.floor(resolveEffectTarget(max,'ap').value));if(!Number.isSafeInteger(max)||!Number.isSafeInteger(ap)||ap>effectiveMax)throw Error('Текущие ОД должны быть целыми и не выше итога с бонусами ('+effectiveMax+').');Object.assign(state.play,{apBase:max,apMax:effectiveMax,ap,walk,run});state.effects.lastApMax=effectiveMax;playDialog=null;};
renderPlayDialog=function(){let html=beforeEffectsPlayDialog();if(playDialog==='combat-settings')html=html.replace('ОД в раунд','Базовые ОД в раунд').replace(`id="play-apmax" type="number" value="${state.play.apMax}"`,`id="play-apmax" type="number" value="${state.play.apBase}"`);return html;};
const beforeEffectsRender=render,beforeEffectsSave=save;
save=function(){migrateEffects();refreshEffectAp();beforeEffectsSave();};
render=function(){migrateEffects();refreshEffectAp();beforeEffectsRender();if(libraryHome)return;
 if(page===8){const html=renderEffectsPage().replace('<h3>ХАРАКТЕРИСТИКИ И ПРЕДЕЛЫ</h3>','<details class="effect-stat-audit"><summary>Характеристики и пределы — раскрыть расчёт</summary>').replace('<h3>HP И ОЧКИ ДЕЙСТВИЯ</h3>','</details><h3>HP И ОЧКИ ДЕЙСТВИЯ</h3>');document.querySelector('#view').innerHTML=html;document.querySelector('.effects-page')?.insertAdjacentHTML('beforeend','<h3>ДВИЖЕНИЕ</h3><div class="rule-grid">'+['move:walk','move:run','move:jump','jumpCost'].map(renderTargetBreakdown).join('')+'</div>');}
 if(page===0){const active=selectedEffectSources().flatMap(s=>{const m=effectsForSource(s);return m.cfg.enabled===false?[]:m.conditions.filter(c=>m.cfg.conditions?.[c.key]).map(c=>`<button class="bonus-context-chip" data-effect-source="${s.id}">${esc(s.title)} · ${esc(c.label)}</button>`);}).join('');document.querySelector('.overview-tactics')?.insertAdjacentHTML('beforeend','<button class="bonus-overview-link" data-effect-action="open-page">Бонусы и источники →</button>'+active);}
 if(page===4){const movement=document.querySelector('.movement-panel'),m=movementValues();if(movement&&!m.error){const copy=movement.querySelector(':scope > .help-copy');if(copy)copy.textContent=`На оставшиеся ${state.play.ap} ОД: шаг ${Math.round(state.play.ap*m.walk*100)/100} клеток · бег ${Math.round(state.play.ap*m.run*100)/100} клеток · ${Math.floor(state.play.ap/m.jumpCost)} прыжков (${Math.floor(state.play.ap/m.jumpCost)*m.jump} клеток).`;const hint=movement.querySelector('.movement-metrics .play-metric:last-child span');if(hint)hint.textContent='клеток / '+m.jumpCost+' ОД';movement.insertAdjacentHTML('beforeend',`<button class="source-bonus-button" data-effect-action="open-page">Источники движения →</button>`);}const jump=document.querySelector('[data-play="spend"][data-label="Прыжок"]');if(jump){jump.dataset.cost=String(m.jumpCost);jump.innerHTML='Прыжок<small>'+m.jumpCost+' ОД</small>';jump.disabled=state.play.ap<m.jumpCost;}}
 document.querySelectorAll('.skill-list tr[data-skillrow]').forEach(row=>{const s=state.skills[Number(row.dataset.skillrow)],level=effectiveSkillLevel(s);if(level!==s[1]){const cell=row.querySelector('td:nth-child(2)');cell.insertAdjacentHTML('beforeend',`<small class="effective-skill-level" title="Базовый уровень ${s[1]}, итог с бонусами ${level}">итог ${level}</small>`);}});
 if(effectsOpenSource){document.querySelector('#view').insertAdjacentHTML('beforeend',renderSourceSettings(effectsOpenSource));document.querySelector('#effect-source-dialog').showModal();}
};
playPages.splice(playPages.length-1,0,['Бонусы',8]);
document.addEventListener('cancel',e=>{if(e.target.id==='effect-source-dialog')effectsOpenSource=null;},true);
document.addEventListener('change',e=>{if(e.target.closest('#effect-source-dialog')||e.target.closest('.effects-page'))e.stopImmediatePropagation();},true);
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-effect-action],[data-effect-source],[data-effect-remove],[data-effect-custom-remove]');if(!button)return;e.stopImmediatePropagation();const d=button.dataset;
 try{
  if(d.effectSource){effectsOpenSource=d.effectSource;render();return;}
  if(d.effectRemove){delete state.effects.overrides[d.effectRemove];save();render();return;}
  if(d.effectCustomRemove){state.effects.custom=state.effects.custom.filter(v=>v.id!==d.effectCustomRemove);save();render();return;}
  switch(d.effectAction){
   case 'open-page':page=8;break;
   case 'close':effectsOpenSource=null;break;
   case 'save-source':saveSourceSettings();break;
   case 'reset-source':delete state.effects.sources[effectsOpenSource];for(const key of Object.keys(state.effects.adjustments))if(key.startsWith(effectsOpenSource+'/'))delete state.effects.adjustments[key];break;
   case 'select-class':page=6;referenceQuery='';referenceCategory='Классы';break;
   case 'select-feat':page=6;referenceQuery='';referenceCategory='Простые фиты';break;
   case 'add-override':{const key=document.querySelector('#effect-override-target').value,raw=document.querySelector('#effect-override-value').value.trim(),value=Number(raw),mode=document.querySelector('#effect-override-mode').value;if(!raw||!Number.isFinite(value)||mode==='set'&&value<0)throw Error('Введите корректное значение.');state.effects.overrides[key]={mode,value,enabled:true};break;}
   case 'save-caps':{const caps={};for(const input of document.querySelectorAll('[data-base-cap]')){const raw=input.value.trim(),n=Number(raw);if(raw&&(!Number.isSafeInteger(n)||n<1))throw Error('Предел — целое число от 1 или пустое поле.');if(raw)caps[input.dataset.baseCap]=n;}state.effects.baseCaps=caps;break;}
   case 'add-custom':{const sourceId=document.querySelector('#effect-custom-source').value,target=document.querySelector('#effect-custom-target').value,raw=document.querySelector('#effect-custom-value').value.trim(),value=Number(raw);if(!sourceId||!raw||!Number.isFinite(value))throw Error('Выберите источник и числовой бонус.');state.effects.custom.push({id:crypto.randomUUID(),sourceId,target,value,op:'add',label:'Ручной эффект источника'});break;}
  }
  save();render();
 }catch(error){const el=document.querySelector('#effect-error')||document.querySelector('#effects-page-error');if(el)el.textContent=error.message;else toast(error.message);}
},true);
// Register migrations before library.openCharacter invokes the original preparation pipeline.
const beforeEffectsPrepare=prepareCharacter;
prepareCharacter=function(data){state=validateCharacterData(data);migrateCharacter(state);migrateProgression();migrateAllocation();migratePlay();migrateUi();migrateMovement();migrateEffects();refreshEffectAp();applyUiScales();syncMaxHp();};
if(!libraryHome){migrateEffects();save();render();}
