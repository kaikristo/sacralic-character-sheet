/* Explicit uses, resource payments and full melee move selection. */
let abilityDialog=null,abilityResult='';
const ABILITY_ACTIONS={
 'Амбидекстрия':[{id:'dual',label:'Одновременно двумя оружиями'}],
 'Всезнайка':[{id:'untrainedKnowledge',label:'Знание без изученного навыка'}],
 'Мастер на все руки':[{id:'untrainedRepair',label:'Ремонт без изученного навыка'}],
 'Серая мышь':[{id:'gray',label:'Проверить узнавание лица'}],
 'Отключение болевого порога':[{id:'shock',label:'Первая стойкость: успех',period:'battle',limit:1}],
 'Право на ошибку (класс)':[{id:'retry',label:'Применить право на ошибку',period:'day',limit:1},{id:'debt',label:'Отметить штрафной провал'}],
 'Вне игры':[{id:'out',label:'Объявить себя вне боя',period:'day',limit:1}],
 '9 жизней':[{id:'life',label:'Выжить с 1 HP',period:'lifetime',limit:9}],
 'Телохранитель':[{id:'intercept',label:'Перехватить атаку',cost:1}],
 'Уворотчик':[{id:'counter',label:'Контрудар: бросок'}],
 'Джаггернаут':[{id:'charge',label:'Движение с атакой',period:'round',limit:1}],
 'Пулеметчик':[{id:'burst',label:'Шквальная очередь',period:'round',limit:1}],
 'Ниндзя':[{id:'hide',label:'Войти в скрытность',cost:1}],
 'Ясновидец':[{id:'foresight',label:'Действие в конце первого раунда',period:'battle',limit:1},{id:'allies',label:'Связь с союзниками'}],
 'Телепат':[{id:'telepath',label:'Крит участника: восстановить EP'}],
 'Варден':[{id:'epDamage',label:'Получить урон за EP'}],
 'Искатель':[{id:'event',label:'Отменить негативное событие',period:'day',limit:()=>Math.floor(statTotal('LCK')/10)},{id:'luck',label:'Переброс LCK',period:'day',limit:1}],
 'Сыщик':[{id:'hypothesis',label:'Проверить гипотезу',period:'quest',limit:1},{id:'truth',label:'Проверить правду',period:'conversation',limit:1}],
 'Уличный бард':[{id:'rumor',label:'Собрать слухи'},{id:'song',label:'Песня: взять 25'}],
 'Дипломат':[{id:'motives',label:'Вопрос о мотивах',period:'conversation',limit:1}],
 'Механик':[{id:'repair',label:'Экстренный ремонт',cost:10}],
 'Хакер':[{id:'hack',label:'Безопасный взлом',period:'day',limit:1}],
 'Фаворит':[{id:'reputation',label:'Рассчитать репутацию'}],
 'Специалист':[{id:'work',label:'Рассчитать очки производства'}],
 'Специалист (ученый - название идет по специальности, например - химик, математик и т.д.)':[{id:'work',label:'Рассчитать очки исследования'}],
 'Безумный ученый':[{id:'work',label:'Рассчитать очки для идеи'}],
 'Водитель-универсал':[{id:'vehicle',label:'Рассчитать HP транспорта'}],
 'Улучшенный духовный выстрел':[{id:'spirit',label:'Рассчитать духовный урон'}]
};
function abilityPeriod(period){const r=abilityState();return period==='round'?state.play.round:period==='lifetime'?'lifetime':r[period]||1;}
function abilityUseKey(source,action){return source.id+'/'+action.id+'/'+(action.period||'event')+'/'+abilityPeriod(action.period);}
function abilityUses(source,action){return abilityState().uses[abilityUseKey(source,action)]||0;}
function abilityLimit(action){return typeof action.limit==='function'?action.limit():action.limit??Infinity;}
function ensureActiveAbilities(){if(abilityState().incapacitated)throw Error('После «9 жизней» активные действия запрещены до завершения игровых суток.');}
function markAbilityUse(source,action){const limit=abilityLimit(action),used=abilityUses(source,action);if(used>=limit)throw Error('Применения закончились: '+used+' / '+limit+'.');abilityState().uses[abilityUseKey(source,action)]=used+1;}
function useAbility(id,index,options={}){
 const source=selectedEffectSources().find(s=>s.id===id&&sourceConfig(id).enabled!==false),action=source&&ABILITY_ACTIONS[source.title]?.[index];if(!source||!action)throw Error('Способность не выбрана или выключена.');
 const r=abilityState(),name=source.title,L=effectsForSource(source).level;
 if(action.id==='dual')return performDualWield(Number(options.weapon),Number(options.weapon2));
 if(action.id!=='life')ensureActiveAbilities();
 if(abilityUses(source,action)>=abilityLimit(action))throw Error('Нет доступных применений.');
 if(action.id==='retry'&&r.errorDebt)throw Error('Сначала отметьте штрафной провал предыдущего применения.');
 if(action.id==='life'&&state.info.hp>0&&!state.play.dying&&!options.gm)throw Error('Подтвердите смертельное событие у ведущего.');
 if(action.id==='foresight'&&state.play.round!==1)throw Error('Бесплатное действие доступно только в первом раунде, после ходов остальных участников.');
 const value=Number(options.value??0);if(!Number.isFinite(value))throw Error('Введите корректное число.');
 const skill=state.skills.find(s=>skillIdentity(s)===options.skill),roll=options.roll??randomDie(100);
 let cost=action.cost||0,attack=null,item=null,ammo=null;
 if(['charge','burst'].includes(action.id)){item=state.items[options.weapon];if(!item?.equipped)throw Error('Выберите надетое оружие.');attack=attackNumbers(item);if(attack.cost===null)throw Error('Укажите ОД оружия.');
  if(action.id==='charge'&&!attack.key?.startsWith('Ближний бой'))throw Error('Нужно оружие ближнего боя.');
  if(action.id==='burst'&&!/пулем[её]т/i.test(item.name+' '+item.details?.type))throw Error('Нужен пулемёт.');cost=attack.cost+(action.id==='burst'?2:0);ammo=attackAmmo(item);
  if(action.id==='charge'&&(!Number.isSafeInteger(value)||value<0))throw Error('Клетки — целое число от 0.');
 }
 if(action.id==='allies'&&(!Number.isSafeInteger(value)||value<1||value>abilitySkillLevel(/ясновид/i)))throw Error('Укажите от 1 до S союзников.');
 if(['counter','song','repair'].includes(action.id)&&!skill)throw Error('Выберите навык.');
 if(action.id==='counter'&&!combatKey(skill)?.startsWith('Ближний бой'))throw Error('Выберите ближний бой.');
 if(action.id==='repair'&&!/ремонт/i.test(skill[0]))throw Error('Выберите навык ремонта.');
 if(action.id==='song'&&!/музык|искусств|исполн/i.test(skill[0]))throw Error('Выберите навык искусства.');
 if(action.id==='epDamage'&&(value<0||value>currentEnergy()))throw Error('Недостаточно EP.');
 if(action.id==='spirit'&&(!Number.isSafeInteger(value)||value<1||value>100))throw Error('X — число дайсов от 1 до 100.');
 if(action.id==='gray'&&!Number.isFinite(sourceConfig(id).manualChance))throw Error('Задайте шанс N в настройках источника; в исходнике числа нет.');
 const work=action.id==='work'?abilityWorkPoints(source,value,options.skill):null;
 spendAction(cost,source.title+' · '+action.label);markAbilityUse(source,action);let text=action.label;
 if(action.id==='retry')r.errorDebt=true;if(action.id==='debt')r.errorDebt=false;
 if(action.id==='out')r.offgameUntil=state.play.round+Math.max(1,Math.floor(statTotal('CHA')/10));
 if(action.id==='life'){state.play.history.at(-1).abilityRestoreHp=true;r.uses[source.id+':lifetime']=(r.uses[source.id+':lifetime']||0)+1;state.info.hp=1;state.play.dying=false;r.incapacitated=true;text='Выжил с 1 HP; активные действия запрещены в течение игровых суток.';}
 if(action.id==='hide'){if(!state.play.conditions.includes('hidden'))state.play.conditions.push('hidden');}
 if(action.id==='allies'){const ep=Math.ceil(currentEnergy()/2);changeEnergy(-ep);text='Связь с '+value+' союзниками; потрачено '+ep+' EP.';}
 if(action.id==='telepath'){const ep=abilitySkillLevel(/псионик/i);changeEnergy(ep);text='Восстановлено '+ep+' EP.';}
 if(action.id==='epDamage'){changeEnergy(-value);text='Потрачено '+value+' EP вместо HP. Входящий урон подтверждает ведущий.';}
 if(action.id==='truth')text='Правдивость: '+roll+' / '+statTotal('INT')+' — '+(roll<=statTotal('INT')?'успех; ответ даёт ведущий':'неудача');
 if(action.id==='rumor')text='Слухи: '+roll+' / '+statTotal('CHA')+' — '+(roll<=statTotal('CHA')?'успех; сведения даёт ведущий':'неудача');
 if(action.id==='song')text='Песня: 25 / '+chance(skill)+' — '+(25<=chance(skill)?'успех':'неудача');
 if(action.id==='hack')text='Безопасный взлом: '+roll+' / '+L/2+' — '+(roll<=L/2?'успех':'неудача')+'; без критических последствий и подавления.';
 if(action.id==='counter'){const target=value+resolveEffectTarget(0,'counterChance',{skill}).value;text='Контрудар: '+roll+' / '+target+' — '+(roll<=target?'критический успех, показатель 1':'неудача');}
 if(action.id==='repair'){const hit=roll<=chance(skill);text='Экстренный ремонт: '+roll+' / '+chance(skill)+' — '+(hit?'работает '+Math.floor(L/2)+' раундов':'неудача')+'; повторный ремонт этого механизма запрещён.';}
 if(attack){if(ammo.cost){item.ammoIdentity??=crypto.randomUUID();state.play.history.at(-1).ammunition={id:item.ammoIdentity,hadCurrent:Object.hasOwn(item.details,'ammoCurrent'),current:item.details.ammoCurrent};item.details.ammoCurrent=String(ammo.current-ammo.cost*(action.id==='burst'?2:1));}const hit=roll<=attack.chance;
  if(action.id==='charge'&&hit){r.tempHp=(r.tempHp||0)+statTotal('CON')*value;r.tempHpRound=state.play.round;}
  text=action.label+': '+roll+' / '+attack.chance+' — '+(hit?'попадание':'промах')+(action.id==='charge'&&hit?' · временные HP '+r.tempHp:'')+(action.id==='burst'?' · пули и разброс ×2':'');aggressiveAbilityAction();
 }
 if(action.id==='reputation')text='Изменение репутации: '+resolveEffectTarget(value,'reputation').value;
 if(action.id==='vehicle')text='HP транспорта: '+Math.max(0,value)*2;
 if(action.id==='work')text='Очки работы: '+work;
 if(action.id==='spirit')text='Духовный урон: '+Array.from({length:value},()=>randomDie(100)).reduce((sum,die)=>sum+die,0);
 if(action.id==='gray')text='Узнавание: '+roll+' / '+sourceConfig(id).manualChance+'; трактовку результата подтверждает ведущий.';
 if(['untrainedKnowledge','untrainedRepair'].includes(action.id)){const virtual=[action.id==='untrainedKnowledge'?'Знание (без навыка)':'Ремонт (без навыка)',0,'Мирные','INT','','','', 'untrained'];const target=resolveEffectTarget(value,'chance:untrained',{skill:virtual}).value;text='Бросок без навыка: '+roll+' / '+target+' — '+(roll<=target?'успех':'неудача');}
 state.log.unshift(source.title+': '+text);state.log=state.log.slice(0,100);return text;
}
function aggressiveAbilityAction(){const r=abilityState();r.offgameUntil=0;const thief=abilitySource('Вор');if(thief){const cfg=state.effects.sources[thief.id]??={};cfg.conditions={...cfg.conditions,evasion:false};}state.play.conditions=state.play.conditions.filter(c=>c!=='hidden');}
function applyPainFailure(){
 const source=abilitySource('Отключение болевого порога');if(!source)return false;const action=ABILITY_ACTIONS[source.title][0];actionSnapshot('Проверка стойкости',0);
 const h=state.play.history.at(-1);h.abilityRestoreDeath=true;
 if(!abilityUses(source,action)){markAbilityUse(source,action);state.log.unshift('Отключение болевого порога: первая стойкость в бою автоматически успешна.');}
 else{state.play.deathFails=Math.min(3,state.play.deathFails+1);if(state.play.deathFails>=3){state.play.stabilized=true;state.play.dying=false;state.log.unshift('Отключение болевого порога: вместо смерти от шока — без сознания.');}}
 return true;
}
function castPsi(skillId,cost,critical=false,payHp=false){
 ensureActiveAbilities();const s=state.skills.find(s=>skillIdentity(s)===skillId);if(!s||!isPsiSkill(s))throw Error('Выберите пси-дисциплину.');
 if(!Number.isSafeInteger(cost)||cost<0)throw Error('Стоимость EP — целое число от 0.');
 if(abilitySource('Пси-универсал')&&effectiveSkillLevel(s)<Math.max(...state.skills.filter(isPsiSkill).map(effectiveSkillLevel))-1)throw Error('Пси-универсал: дисциплина отстаёт от максимальной более чем на 1.');
 if(payHp&&(!abilitySource('Варден')||state.info.hp<cost*10))throw Error('Недостаточно HP либо класс Варден не выбран.');
 if(!payHp&&currentEnergy()<cost&&!(/материализац/i.test(s[0])&&critical&&abilitySource('Материализатор')))throw Error('Недостаточно EP.');
 actionSnapshot('Пси-способность: '+s[0],0);abilityState().psiRound=state.play.round;
 if(/материализац/i.test(s[0])&&critical&&abilitySource('Материализатор'))changeEnergy(cost);else if(payHp){state.play.history.at(-1).abilityRestoreHp=true;state.info.hp-=cost*10;}else changeEnergy(-cost);
}
function advanceAbilityRound(){
 actionSnapshot('Новый раунд',0);const r=abilityState();
 if(!abilitySource('Варден')){if(abilitySource('Шаман')&&abilityConfig('Шаман').conditions?.noUrbanEvil)changeEnergy(abilitySkillLevel(/шаман/i));if(abilitySource('Пси-универсал')&&r.psiRound!==state.play.round)changeEnergy(Math.max(0,...state.skills.filter(isPsiSkill).map(effectiveSkillLevel)));}
 state.play.round++;state.play.conditions=state.play.conditions.filter(c=>c!=='running');migrateAbilityState();refreshEffectAp();state.play.ap=state.play.apMax;
}
const beforeAbilityActionSnapshot=actionSnapshot;
actionSnapshot=function(label,cost){beforeAbilityActionSnapshot(label,cost);Object.assign(state.play.history.at(-1),{abilityRules:structuredClone(abilityState()),abilityHp:state.info.hp,abilityDeath:{dying:state.play.dying,deathFails:state.play.deathFails,stabilized:state.play.stabilized},abilityThiefEvasion:abilityConfig('Вор').conditions?.evasion});};
const beforeAbilityUndo=undoEffectAction;
undoEffectAction=function(){const h=state.play.history.at(-1);if(h?.abilityRules){const ledger=abilityState().pointLedger,legacy=abilityState().legacyGrants;state.play.rules=structuredClone(h.abilityRules);state.play.rules.pointLedger=ledger;state.play.rules.legacyGrants=legacy;state.play.rules.grantsMigrated=true;if(h.abilityRestoreHp)state.info.hp=h.abilityHp;if(h.abilityRestoreDeath||h.abilityRestoreHp)Object.assign(state.play,h.abilityDeath);const thief=abilitySource('Вор');if(thief){const cfg=state.effects.sources[thief.id]??={};cfg.conditions={...cfg.conditions,evasion:h.abilityThiefEvasion};}refreshEffectAp();}beforeAbilityUndo();for(const ammo of h?.abilityAmmo||[]){const item=state.items.find(i=>i.ammoIdentity===ammo.id);if(item){if(ammo.hadCurrent)item.details.ammoCurrent=ammo.current;else delete item.details.ammoCurrent;}}};
function performDualWield(first,second){
 ensureActiveAbilities();if(!abilitySource('Амбидекстрия'))throw Error('Выберите Амбидекстрию.');if(first===second)throw Error('Выберите два разных оружия.');
 const items=[state.items[first],state.items[second]];if(items.some(i=>!i?.equipped||i.category!=='Оружие'))throw Error('Выберите два надетых оружия.');
 const attacks=items.map(attackNumbers),ammo=items.map(attackAmmo);if(attacks.some(a=>a.cost===null))throw Error('Укажите ОД обоих оружий.');if(ammo.some(a=>!Number.isSafeInteger(a.cost)||a.cost<0||!Number.isSafeInteger(a.current-a.cost)))throw Error('Проверьте боезапас.');
 const cost=Math.max(...attacks.map(a=>a.cost))+1;items.forEach(i=>i.ammoIdentity??=crypto.randomUUID());spendAction(cost,'Амбидекстрия: два оружия');state.play.history.at(-1).abilityAmmo=items.map(i=>({id:i.ammoIdentity,hadCurrent:Object.hasOwn(i.details,'ammoCurrent'),current:i.details.ammoCurrent}));
 items.forEach((i,n)=>{if(ammo[n].cost)i.details.ammoCurrent=String(ammo[n].current-ammo[n].cost);});aggressiveAbilityAction();
 const results=attacks.map((a,n)=>items[n].name+': '+randomDie(100)+' / '+(a.chance-10)+'%');const text=results.join('; ')+' · '+cost+' ОД';state.log.unshift(text);return text;
}
const beforeAbilitySpend=spendAction;
spendAction=function(cost,label){ensureActiveAbilities();beforeAbilitySpend(cost,label);if(/Движение|Бег|Прыжок/.test(label))abilityState().flurry=false;};
const beforeAbilityPerformWeapon=performWeaponAttack;
performWeaponAttack=function(index){const result=beforeAbilityPerformWeapon(index);aggressiveAbilityAction();return result;};
function meleeSkills(){return state.skills.filter(s=>combatKey(s)?.startsWith('Ближний бой'));}
function learnedMoves(){return RULE_ENTRIES.filter(e=>e.category==='Приёмы'&&state.play.pinned.includes(e.id));}
function meleeMoveSlots(){return meleeSkills().reduce((n,s)=>n+Math.max(0,Math.min(10,effectiveSkillLevel(s))-4),0);}
function moveRequirements(entry){
 const row=ruleTable('Приёмы').rows[entry.row-1],text=String(row[4]||''),missing=[];
 if(!meleeSkills().length)missing.push('нужен навык ближнего боя');else if(Math.max(...meleeSkills().map(effectiveSkillLevel))<5)missing.push('ближний бой 5 для открытия приёмов');
 for(const m of text.matchAll(/(AGL|STR|RCT)\s*>\s*(\d+)/g))if(statTotal(statAlias(m[1]))<=+m[2])missing.push(m[1]+' > '+m[2]);
 for(const title of ['Быстрый удар','Сильный удар','Оглушающий удар','Двойной удар'])if(text.includes(title)&&!learnedMoves().some(e=>e.title===title))missing.push(title);
 if(entry.title==='Комбинация'&&learnedMoves().filter(e=>e.title!=='Комбинация').length<2)missing.push('два других приёма');
 return missing;
}
function meleeMoveNumbers(entry,skill,item,baseCost){
 if(!entry||!skill||!combatKey(skill)?.startsWith('Ближний бой'))throw Error('Выберите приём и навык ближнего боя.');
 const row=ruleTable('Приёмы').rows[entry.row-1],attack=item?attackNumbers(item):null,raw=String(row[1]).trim(),ordinary=attack?.cost??baseCost;
 if(attack&&!attack.key?.startsWith('Ближний бой'))throw Error('Выберите оружие ближнего боя.');
 const absolute=!/^[+-]/.test(raw)&&/^\d+$/.test(raw),cost=absolute?+raw:raw==='-'?null:Number.isSafeInteger(ordinary)&&ordinary>=1?Math.max(1,ordinary+Number(raw)):null;
 const vars=Object.fromEntries(EFFECT_STATS.map(c=>[c,statTotal(c)]));Object.assign(vars,{AGL:statTotal('DEX'),RCT:statTotal('RTC')});
 let hit=null;if(row[2]==='стандарт')hit=chance(skill);else if(row[2]==='50% стандарт')hit=chance(skill)/2;else if(row[2]==='100%')hit=100;else if(row[2]!=='-'){const base=calculateFormula(String(row[2]).replace(/x/g,'*'),vars);hit=resolveEffectTarget(base,'chance:'+skillIdentity(skill),{skill}).value;}
 if(hit!==null&&!/стойка$/.test(entry.title))hit=resolveEffectTarget(hit,'meleeMoveChance',{skill}).value;
 return {cost,chance:hit,defense:row[3],requirements:row[4],description:row[5],damage:attack?.damage||abilityState().meleeBase.damage||'укажите урон',damageFactor:(entry.title==='Проникающий удар'?.5:1)*(attack?.damageFactor||1),armorIgnore:entry.title==='Сильный удар'?.5:entry.title==='Мощный удар'?1:0,targets:entry.title==='Двойной удар'?2:entry.title==='Круговой удар'?'все в досягаемости':1};
}
function executeMeleeMove(id,skillId,options={}){
 ensureActiveAbilities();const entry=learnedMoves().find(e=>e.id===id),skill=state.skills.find(s=>skillIdentity(s)===skillId);if(!entry)throw Error('Сначала выберите приём.');
 if(abilityState().stance?.name==='Защитная стойка')throw Error('В защитной стойке нельзя использовать приёмы.');
 const missing=moveRequirements(entry);if(missing.length&&!options.override)throw Error('Требования: '+missing.join(', '));
 const item=options.weapon!==undefined&&options.weapon!==''?state.items[Number(options.weapon)]:null,m=meleeMoveNumbers(entry,skill,item,options.baseCost??abilityState().meleeBase.cost);
 if(entry.title==='Комбинация'){
  const pair=(options.combo||[]).map(id=>learnedMoves().find(e=>e.id===id&&e.title!=='Комбинация'&&!/стойка$/.test(e.title)));
  if(pair.length!==2||!pair[0]||!pair[1]||pair[0].id===pair[1].id)throw Error('Выберите два разных изученных приёма без стоек.');
  if(!Number.isSafeInteger(options.comboCost)||options.comboCost<0)throw Error('Укажите согласованную с мастером стоимость комбинации.');
  const problems=pair.flatMap(moveRequirements);if(problems.length&&!options.override)throw Error('Требования: '+problems.join(', '));
  const results=pair.map(e=>{const n=meleeMoveNumbers(e,skill,item,options.baseCost),roll=randomDie(100);return {...n,title:e.title,roll,success:roll<=n.chance};});
  spendAction(options.comboCost,'Комбинация');aggressiveAbilityAction();const text='Комбинация: '+results.map(r=>r.title+' '+r.roll+'/'+r.chance+' — '+(r.success?'успех':'неудача')).join('; ');state.log.unshift(text);return {cost:options.comboCost,text,results};
 }
 if(m.cost===null)throw Error('Укажите стоимость обычного удара или выберите оружие.');
 const duration=options.duration??randomDie(6);if(/стойка$/.test(entry.title)&&(!Number.isInteger(duration)||duration<1||duration>6))throw Error('Длительность стойки: d6.');
 spendAction(m.cost,entry.title);const r=abilityState();let text;
 if(/стойка$/.test(entry.title)){r.stance={name:entry.title,level:effectiveSkillLevel(skill),until:state.play.round+duration};refreshEffectAp();text=entry.title+': '+duration+' раундов';}
 else{const roll=options.roll??randomDie(100);text=entry.title+': '+roll+' / '+m.chance+' — '+(roll<=m.chance?'успех':'неудача')+' · защита цели '+m.defense+' · '+m.cost+' ОД';if(entry.title==='Шквал ударов'){r.flurry=true;r.flurryRound=state.play.round;}aggressiveAbilityAction();}
 state.log.unshift(text);state.log=state.log.slice(0,100);return {...m,text};
}
