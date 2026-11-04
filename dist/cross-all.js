/* All 42 cells of Sacralic's cross-stat table. Conditional world facts are explicit inputs. */
const CROSS_RULES=RULE_ENTRIES.filter(e=>e.category==='Кросс-бонусы');
for(const e of CROSS_RULES){const column=Number(e.id.split('-').at(-1));e.url=e.url.replace(/range=A\d+/, 'range='+String.fromCharCode(64+column)+e.row);}
Object.assign(ABILITY_TARGETS,{damageReduction:'Уменьшение входящего урона',intActionPoints:'ОД только для INT',criticalPower:'Бонус показателя крита',attackDamageDice:'Дополнительные дайсы урона'});
const beforeCrossTargetLabel=effectTargetLabel;
effectTargetLabel=function(key){return ({chance:'Шанс навыка',skillLevel:'Уровень навыка',attackArmorPen:'Бронебойность атаки',attackCost:'Стоимость атаки, ОД'})[key]||beforeCrossTargetLabel(key);};
let crossStatDepth=0,crossExtraDialog=null,crossActionSkill=null;
const crossPair=e=>[...e.stats].sort().join('/');
function crossRequirementsMet(e){if(!e)return false;crossStatDepth++;try{return e.stats.every(c=>statTotal(c)>=e.threshold);}finally{crossStatDepth--;}}
crossActive=function(codes,threshold=21){const e=crossRule(codes,threshold);return !!e&&sourceConfig(e.id).enabled!==false&&crossRequirementsMet(e);};
const beforeAllCrossSources=selectedEffectSources;
selectedEffectSources=function(){const sources=beforeAllCrossSources().filter(e=>e.category!=='Кросс-бонусы');return crossStatDepth?sources:sources.concat(CROSS_RULES.filter(crossRequirementsMet).map(e=>({...e,automatic:true})));};
const beforeAllCrossEffects=effectsForSource;
effectsForSource=function(source,configuration){
 if(source.category!=='Кросс-бонусы')return beforeAllCrossEffects(source,configuration);
 const cfg=configuration||sourceConfig(source.id),effects=[],choices=[],conditions=[],p=crossPair(source),tier=source.threshold;
 const add=(target,value,label,key,options={})=>effects.push({id:source.id+'/'+key,sourceId:source.id,source:source.title,url:source.url,target,value,label,op:'add',sourceEnabled:cfg.enabled!==false,...options});
 const cond=(key,label)=>{conditions.push({key,label});return !!cfg.conditions?.[key];};
 const chosen=(key,label)=>{choices.push({key,label,type:'skill'});return cfg[key]||'';};
 const chance=(scope,value,label,key,options={})=>add('chance',value,label,key,{scope,...options});
 const replaced=codes=>tier===21&&crossActive(codes,31);
 if(p==='INT/STR'&&tier===21)chance('melee',10,'STR 21 + INT 21: ближний бой','meleeChance',{modes:['normal','aimed']});
 if(p==='CON/INT'&&tier===21)chance('mindResistance',10,'INT 21 + CON 21: стойкость разума','mindChance');
 if(p==='DEX/STR'){const value=tier===31?3:1,options={condition:!replaced(['DEX','STR']),scope:'meleeThrow'};add('attackArmorPen',value,'Крит и ББ ближнего боя / метания','armorPen',options);add('criticalPower',value,'Показатель крита ближнего боя / метания','criticalPower',options);}
 if(p==='CON/STR')add('damageReduction',tier===31?100:50,'Уменьшение входящего урона','reduction',{condition:!replaced(['CON','STR'])});
 if(p==='CON/DEX'){add('armor',tier===31?2:Math.floor(statTotal('DEX')/10),tier===31?'Дополнительная броня':'Броня за десятки DEX','armor');if(tier===31)add('incomingCriticalPower',-3,'Показатель крита атакующего','incomingCriticalPower');}
 if(p==='ACC/STR'){if(tier===21)add('attackDamageDice',Math.floor(statTotal('STR')/10),'Сила в физическом метании','throwStrength',{scope:'throwPhysical'});else {add('attackArmorPen',3,'ББ тяжёлого оружия','armorPen',{scope:'heavy'});add('criticalPower',3,'Крит тяжёлого оружия','criticalPower',{scope:'heavy'});}}
 if(p==='ACC/DEX'){const options={scope:'throw',condition:!replaced(['DEX','ACC'])};add('attackArmorPen',tier===31?3:1,'ББ метания','armorPen',options);add('criticalPower',tier===31?3:1,'Показатель крита метания','criticalPower',options);}
 if(p==='DEX/INT'&&tier===21)add('dodge',5,'DEX 21 + INT 21: уворот','dodge');
 if(p==='INT/RTC')add('intActionPoints',tier===31?5:3,'ОД только для действий от INT','intAp',{condition:!replaced(['INT','RTC'])});
 if(p==='ACC/INT'){if(tier===21){const id=chosen('rangedSkill','Вид стрелкового оружия: навык');chance('id:'+id,10,'Выбранный вид стрельбы','rangedChance',{requires:!!id&&!!state.skills.find(s=>skillIdentity(s)===id&&combatKey(s)?.startsWith('Стрельба')),modes:['normal','aimed']});}else chance('observation',20,'Анализ мелочей и зрение датчика','observation');}
 if(p==='CHA/STR'){if(tier===21){chance('intimidation',10,'Запугивание','intimidation');chance('conversation',10,'Разговор используется для запугивания','intimidatingConversation',{condition:cond('intimidating','Разговор: проверка запугивания')});}else add('attackArmorPen',crossMysticPower(),'Мистическая сила: ББ рукопашных атак','mysticArmorPen',{scope:'melee',condition:crossHasMystic()});}
 if(p==='CHA/DEX'&&tier===31)add('dodge',crossMysticPower(),'Мистическая сила: уворот','mysticDodge',{condition:crossHasMystic()});
 if(p==='CHA/CON'&&tier===21){chance('spiritResistance',10,'Стойкость духа','spiritChance');chance('conversation',20,'Разговор с противоположным полом','conversation',{condition:cond('oppositeSex','Разговор с персонажем противоположного пола: мастер разрешил бонус')});}
 for(const custom of state.effects?.custom||[])if(custom.sourceId===source.id&&!custom.target.startsWith('stat:')&&!custom.target.startsWith('cap:'))effects.push({...custom,sourceId:source.id,source:source.title,url:source.url,sourceEnabled:cfg.enabled!==false});
 return {source,cfg,effects,choices,conditions,count:1,level:state.info.level};
};
const beforeCrossChoice=renderEffectChoice;
renderEffectChoice=function(choice,cfg){if(choice.key!=='rangedSkill')return beforeCrossChoice(choice,cfg);return `<label>${esc(choice.label)}<select data-effect-choice="rangedSkill"><option value="">Выберите…</option>${state.skills.filter(s=>combatKey(s)?.startsWith('Стрельба')).map(s=>`<option value="${skillIdentity(s)}" ${cfg.rangedSkill===skillIdentity(s)?'selected':''}>${esc(s[0])}</option>`).join('')}</select></label>`;};
function crossHasMystic(){return state.skills.some(s=>effectNorm(skillEffectName(s))==='мистика');}
function crossMysticPower(){return Math.max(0,Number(state.play.rules?.crossMysticPower)||0);}
const beforeAllCrossMatch=effectSkillMatches;
effectSkillMatches=function(skill,scope){const name=effectNorm(skillEffectName(skill)),key=combatKey(skill)||'';if(scope==='mindResistance')return isMindResistanceSkill(skill);if(scope==='spiritResistance')return name==='стойкостьдуха';if(scope==='intimidation')return /запугиван/.test(name);if(scope==='meleeThrow')return key.startsWith('Ближний бой')||key==='Метание';if(scope==='throw'||scope==='throwPhysical')return key==='Метание';if(scope==='heavy')return key==='Стрельба(тяжелое)';return beforeAllCrossMatch(skill,scope);};
// Replace the initial four-cell adapter: these effects now flow through normal source settings.
applicableEffects=function(target,context={}){const statTarget=target.startsWith('stat:')||target.startsWith('cap:');if(statTarget)crossStatDepth++;try{return beforeCrossApplicable(target,context).filter(e=>e.scope!=='throwPhysical'||!context.item||!/энерг|дух|пси/i.test(context.item.details?.damageType||context.item.details?.type||''));}finally{if(statTarget)crossStatDepth--;}};
function crossPassiveLabels(e){const p=crossPair(e),t=e.threshold;const labels={
 'ACC/CON':t===21?'Зрение в темноте':'Иммунитет к ослеплению','CON/INT':t===31?'Иммунитет к подавлению пси-дисциплин':'','CHA/CON':t===31?'Иммунитет к подавлению мистики':'',
 'DEX/RTC':t===21?'Уворот врага ловкостью не даёт контрудара':'','ACC/RTC':t===21?'Иммунитет к неожиданным атакам':'Первый выстрел в раунде — неожиданная атака',
 'ACC/CHA':t===31?'Эфирное зрение, без зрения сквозь стены':'','CHA/INT':t===21?'В разговоре научные навыки и знания считаются не ниже 3':''};
 return labels[p]||'';}
function crossFlags(){return {darkVision:crossActive(['CON','ACC']),blindImmune:crossActive(['CON','ACC'],31),psiSuppressionImmune:crossActive(['CON','INT'],31),mysticSuppressionImmune:crossActive(['CON','CHA'],31),ambushImmune:crossActive(['RTC','ACC']),etherealVision:crossActive(['ACC','CHA'],31),noEnemyDodgeCounter:crossActive(['DEX','RTC'])};}
function crossIntRemaining(){const max=resolveEffectTarget(0,'intActionPoints').value,r=abilityState();return Math.max(0,max-(r.crossIntRound===state.play.round?r.crossIntSpent||0:0));}
function spendIntAction(cost,label){if(!Number.isSafeInteger(cost)||cost<0||cost>crossIntRemaining())throw Error('Недостаточно специальных ОД от INT.');spendAction(0,label);const r=abilityState();if(r.crossIntRound!==state.play.round){r.crossIntRound=state.play.round;r.crossIntSpent=0;}r.crossIntSpent=(r.crossIntSpent||0)+cost;}
const beforeCrossSpend=spendAction;
spendAction=function(cost,label){if(crossActionSkill?.[3]!=='INT'||!crossIntRemaining())return beforeCrossSpend(cost,label);const used=Math.min(cost,crossIntRemaining()),remaining=cost-used;if(remaining>state.play.ap)throw Error('Недостаточно ОД.');beforeCrossSpend(remaining,label);const r=abilityState();if(r.crossIntRound!==state.play.round){r.crossIntRound=state.play.round;r.crossIntSpent=0;}r.crossIntSpent=(r.crossIntSpent||0)+used;};
const beforeCrossWeapon=performWeaponAttack;
performWeaponAttack=function(index){crossActionSkill=attackNumbers(state.items[index]).skill;try{const r=beforeCrossWeapon(index);if(crossActive(['RTC','ACC'],31)&&weaponSkillKey(state.items[index])?.startsWith('Стрельба')){const first=abilityState().crossFirstShotRound!==state.play.round;abilityState().crossFirstShotRound=state.play.round;if(first)state.log.unshift('RTC 31 + ACC 31: первый выстрел раунда — неожиданная атака.');}return r;}finally{crossActionSkill=null;}};
const beforeCrossAttackNumbers=attackNumbers;
attackNumbers=function(item){const a=beforeCrossAttackNumbers(item),ctx={skill:a.skill,attackKey:a.key,item};a.crossSources=[];for(const [target,base] of [['attackArmorPen',a.bbBase===null?null:0],['criticalPower',0],['attackDamageDice',0]]){if(base===null)continue;const result=resolveEffectTarget(base,target,ctx);a.crossSources.push(...result.lines.filter(e=>e.enabled&&CROSS_RULES.some(s=>s.id===e.sourceId)));if(target==='criticalPower')a.criticalPowerBonus+=result.value;if(target==='attackDamageDice'&&result.value){const die=Number(a.baseDamage?.match(/d(\d+)/i)?.[1]||100);a.damage=normalizedAbilityDamage(a.damage+' '+(result.value>=0?'+ ':'- ')+Math.abs(result.value)+'d'+die);a.skillDice+=result.value;}}
 for(const e of a.crossSources)a.notes.push(e.source+': '+e.label+' ('+e.value+')');return a;};
const beforeCrossRollAdvice=abilityRollAdvice;
abilityRollAdvice=function(skill,mode){const notes=beforeCrossRollAdvice(skill,mode),f=crossFlags();if(mode==='defense'&&f.ambushImmune)notes.push('Иммунитет к неожиданным атакам: RTC 21 + ACC 21.');if(mode==='defense'&&f.noEnemyDodgeCounter)notes.push('DEX 21 + RTC 21: уворот врага ловкостью не даёт контрудара.');return notes;};
const beforeCrossResolveRoll=resolveRoll;
resolveRoll=function(skill,mode,modifier,superiority,roll){const f=crossFlags(),name=effectNorm(skillEffectName(skill));if((isPsiSkill(skill)&&f.psiSuppressionImmune)||(name==='мистика'&&f.mysticSuppressionImmune))superiority=0;return beforeCrossResolveRoll(skill,mode,modifier,superiority,roll);};
function crossIncomingDamage(amount){if(!Number.isSafeInteger(amount)||amount<0)throw Error('Урон должен быть целым числом от 0.');const reduction=Math.max(0,resolveEffectTarget(0,'damageReduction').value);return {amount:Math.max(0,Math.ceil(amount-reduction)),reduction};}
function receiveCrossDamage(amount){const d=crossIncomingDamage(amount);state.info.hp=Math.max(0,state.info.hp-d.amount);state.log.unshift('Входящий урон '+amount+' − уменьшение '+d.reduction+' = '+d.amount+'.');state.log=state.log.slice(0,100);return d;}
const beforeCrossApplyHit=applyHit;
applyHit=function(){const input=document.querySelector('#hit-damage'),original=input.value,raw=Number(original);if(!Number.isSafeInteger(raw)||raw<=0)return beforeCrossApplyHit();const d=crossIncomingDamage(raw);if(!d.amount){state.log.unshift('Входящий урон '+raw+' полностью поглощён кросс-бонусом ('+d.reduction+').');damageOpen=false;return true;}input.value=String(d.amount);try{return beforeCrossApplyHit();}finally{input.value=original;}};
const beforeCrossDamageDialog=renderDamageDialog;
renderDamageDialog=function(){const html=beforeCrossDamageDialog(),reduction=resolveEffectTarget(0,'damageReduction').value;return reduction?html.replace('<div class="dialog-actions">','<p class="cross-action-result">Уменьшение урона ('+reduction+') применяется автоматически после брони. <button data-effect-source="'+crossRule(['STR','CON'],crossActive(['STR','CON'],31)?31:21).id+'">Источник</button></p><div class="dialog-actions">'):html;};
const beforeAllCrossBodyMap=renderBodyMap;
renderBodyMap=function(){const e=crossRule(['CON','RTC'],31),a=crossActions(e)[0];return beforeAllCrossBodyMap()+(crossActive(['CON','RTC'],31)?'<button class="zone-reroll-button" data-cross-extra="'+e.id+'" data-cross-index="0" '+(abilityUses(e,a)>=abilityLimit(a)?'disabled':'')+'>Выбрать зону · 1 ОД</button>':'');};
const CROSS_ACTIONS={
 'RTC/STR:21':[{id:'reflect',label:'Отразить метательный снаряд',cost:1,stat:'STR'}],
 'RTC/STR:31':[{id:'bullet',label:'Остановить пулю',cost:1,stat:'STR'}],
 'DEX/RTC:31':[{id:'freeDodge',label:'Действие после успешного уворота (до 3 ОД)'}],
 'DEX/INT:31':[{id:'retryDodge',label:'Повторный уворот после провала',stat:'INT'}],
 'INT/STR:31':[{id:'vulnerability',label:'Анализ уязвимости: двойной урон',stat:'INT'}],
 'CHA/STR:31':[{id:'intimidateFirst',label:'Первое нацеливание врага: критический промах',stat:'STR',target:true}],
 'CHA/DEX:21':[{id:'aura',label:'Выбрать видящего вас врага: штраф CHA/2',target:true}],
 'CHA/DEX:31':[{id:'charmStrike',label:'Спецприём ближнего боя (+2 ОД)',cost:2,target:true,targetCha:true}],
 'CON/RTC:31':[{id:'chooseZone',label:'Выбрать зону входящего попадания · 1 ОД',cost:1,period:'round',limit:1,zone:true}],
 'CHA/RTC:21':[{id:'slip',label:'Право оговорки',period:'day',limit:1}],
 'CHA/RTC:31':[{id:'peace',label:'Право мира',period:'battle',limit:1,confirm:true}],
 'CHA/INT:21':[{id:'knowledge',label:'Поверхностные знания в разговоре',knowledge:true}],
 'CHA/INT:31':[{id:'truth',label:'Отличить правду от лжи',stat:'CHA+INT'}]
};
function crossActions(e){return CROSS_ACTIONS[crossPair(e)+':'+e.threshold]||[];}
function crossUseAction(id,index,options={}){
 const source=CROSS_RULES.find(e=>e.id===id),action=source&&crossActions(source)[index];if(!source||!action||!crossActive(source.stats,source.threshold))throw Error('Требования способности не выполнены.');ensureActiveAbilities();if(abilityUses(source,action)>=abilityLimit(action))throw Error('Применения закончились.');
 if(action.target&&!String(options.target||'').trim())throw Error('Укажите цель.');if(action.targetCha&&(!Number.isFinite(options.cha)||options.cha<0))throw Error('Укажите CHA цели.');if(action.zone&&(!Number.isInteger(options.zone)||options.zone<0||options.zone>5))throw Error('Выберите зону.');
 if(['freeDodge','retryDodge'].includes(action.id)&&!options.confirm)throw Error('Подтвердите исход предыдущего уворота.');
 if(action.id==='freeDodge'&&(!Number.isInteger(options.cost)||options.cost<0||options.cost>3))throw Error('Стоимость бесплатного действия: от 0 до 3 ОД.');
 const knowledgeSkill=action.knowledge&&state.skills.find(s=>skillIdentity(s)===options.skill);if(action.knowledge&&!options.confirm)throw Error('Подтвердите проверку научного навыка или знания в разговоре.');
 const target=action.knowledge?(knowledgeSkill?chance([...knowledgeSkill,Math.max(3,effectiveSkillLevel(knowledgeSkill))]):30+statTotal('INT')):action.stat==='CHA+INT'?statTotal('CHA')+statTotal('INT'):action.stat?statTotal(action.stat):null,roll=target!==null?(options.roll??randomDie(100)):null;if(roll!==null&&(!Number.isInteger(roll)||roll<1||roll>100))throw Error('Бросок d100: от 1 до 100.');
 if(action.id==='peace'&&!options.confirm&&options.rounds!==undefined&&(!Number.isInteger(options.rounds)||options.rounds<1||options.rounds>6))throw Error('Ожидался d6.');
 if(action.id==='intimidateFirst'&&abilityState().crossFirstTargets?.includes(String(options.target).trim().toLowerCase()))throw Error('Этот противник уже выбирал вас целью в текущем бою.');
 spendAction(action.cost||0,action.label);markAbilityUse(source,action);let result=action.label;
 if(target!==null)result+=': d100 '+roll+' / '+target+'% — '+(roll<=target?'УСПЕХ':'НЕУСПЕХ');
 if(action.knowledge)result+='; '+(knowledgeSkill?.[0]||'неизученный научный навык / знание')+'; уровень не ниже 3 только для этого разговора';
 if(action.id==='retryDodge')result+='; контрудар не предоставляется';
 if(action.id==='freeDodge')result+='; выполнено «'+String(options.description||'действие')+'» стоимостью '+options.cost+' ОД бесплатно';
 if(action.id==='aura')result+='; '+options.target+': все броски ('+(-statTotal('CHA')/2)+'), пока видит персонажа';
 if(action.id==='charmStrike'){result+='; '+options.target+': штраф уворота '+Math.max(0,statTotal('CHA')-options.cha)+' п.п.; обычная атака оплачивается отдельно';aggressiveAbilityAction();}
 if(action.id==='intimidateFirst'){(abilityState().crossFirstTargets??=[]).push(String(options.target).trim().toLowerCase());result+='; цель '+options.target+'; показатель критического промаха 1';}
 if(action.id==='chooseZone'){zone=options.zone;result+=': '+names[zone];abilityState().crossZoneResult={zone,round:state.play.round,chosen:true};}
 if(action.id==='peace'){if(!options.confirm){const rounds=options.rounds??randomDie(6);if(!Number.isInteger(rounds)||rounds<1||rounds>6)throw Error('Ожидался d6.');abilityState().crossPeaceUntil=state.play.round+rounds;result+=': разговор неуспешен, запрет атак '+rounds+' раундов';}else result+=': разговор успешен';}
 state.log.unshift(source.title+' · '+result);state.log=state.log.slice(0,100);return {text:result,roll,target,success:target===null?null:roll<=target,zone:action.zone?zone:null};
}
const beforeCrossAggressive=aggressiveAbilityAction;
aggressiveAbilityAction=function(){if((abilityState().crossPeaceUntil||0)>state.play.round)throw Error('Право мира: атаки запрещены ещё '+(abilityState().crossPeaceUntil-state.play.round)+' раундов.');return beforeCrossAggressive();};
// Check before resource mutations as well as in the common aggressive-action hook.
const beforePeaceWeapon=performWeaponAttack;
performWeaponAttack=function(index){if((abilityState().crossPeaceUntil||0)>state.play.round)throw Error('Право мира: атаки временно запрещены.');return beforePeaceWeapon(index);};
const beforePeaceDual=performDualWield,beforePeaceMove=executeMeleeMove,beforePeaceAbility=useAbility;
performDualWield=function(...args){if((abilityState().crossPeaceUntil||0)>state.play.round)throw Error('Право мира: атаки временно запрещены.');return beforePeaceDual(...args);};
executeMeleeMove=function(id,...args){const move=RULE_ENTRIES.find(e=>e.id===id);if((abilityState().crossPeaceUntil||0)>state.play.round&&!/стойка$/.test(move?.title||''))throw Error('Право мира: атаки временно запрещены.');return beforePeaceMove(id,...args);};
useAbility=function(id,index,...args){const source=selectedEffectSources().find(e=>e.id===id),action=source&&ABILITY_ACTIONS[source.title]?.[index];if((abilityState().crossPeaceUntil||0)>state.play.round&&['charge','burst','counter','dual'].includes(action?.id))throw Error('Право мира: атаки временно запрещены.');return beforePeaceAbility(id,index,...args);};
const beforeFullCrossGaze=useCharmingGaze,beforeFullZoneReroll=rerollIncomingZone;
useCharmingGaze=function(target,cha){ensureActiveAbilities();if((abilityState().crossPeaceUntil||0)>state.play.round)throw Error('Право мира: атакующее воздействие запрещено.');return beforeFullCrossGaze(target,cha);};
rerollIncomingZone=function(original,roll=randomDie(6)){ensureActiveAbilities();return beforeFullZoneReroll(original,roll);};
renderCrossAbilities=function(){const sources=CROSS_RULES.filter(e=>crossRequirementsMet(e));if(!sources.length)return '';return '<section class="cross-stat-abilities"><h3>Кросс-бонусы</h3>'+sources.map(e=>{const m=effectsForSource(e),enabled=m.cfg.enabled!==false;return `<article><b>${esc(e.title)}</b>${!enabled?'<small>Выключено вручную</small>':''}<details><summary>Эффекты и источник</summary><p class="rule-text">${esc(e.text)}</p>${m.effects.map(s=>{const a=state.effects.adjustments[s.id]||{};return '<p>'+esc(s.label)+' ('+(a.value??s.value)+')'+(s.condition===false?' · условие не активно':'')+'</p>';}).join('')}<p>${esc(crossPassiveLabels(e))}</p><a href="${e.url}" target="_blank" rel="noopener">Sacralic ↗</a></details><button data-effect-source="${e.id}">⚙ Настроить</button>${enabled?crossActions(e).map((a,i)=>`<button data-cross-extra="${e.id}" data-cross-index="${i}" ${abilityUses(e,a)>=abilityLimit(a)?'disabled':''}>${esc(a.label)}${a.period?' · '+Math.max(0,abilityLimit(a)-abilityUses(e,a))+'/'+abilityLimit(a):''}</button>`).join(''):''}${enabled&&crossPair(e)==='CON/RTC'&&e.threshold===21?'<button data-cross-action="zone">Перебросить зону · 1 ОД</button>':''}${enabled&&crossPair(e)==='ACC/CHA'&&e.threshold===21?'<button data-cross-action="gaze" '+(!crossGazeRemaining()?'disabled':'')+'>Применить · 0 ОД · '+crossGazeRemaining()+'/1</button>':''}</article>`;}).join('')+(crossHasMystic()&&(crossActive(['STR','CHA'],31)||crossActive(['DEX','CHA'],31))?'<label>Мистическая сила<input data-cross-mystic type="number" min="0" value="'+crossMysticPower()+'"></label>':'')+(resolveEffectTarget(0,'intActionPoints').value?'<p>Специальные ОД от INT: '+crossIntRemaining()+' / '+resolveEffectTarget(0,'intActionPoints').value+'</p><button data-cross-extra="int-ap">Действие от INT</button>':'')+'<div class="ability-actions"><button data-ability="reset" data-period="battle">Новый бой</button><button data-ability="reset" data-period="day">Новые сутки</button></div></section>';};
function renderCrossExtraDialog(){if(!crossExtraDialog)return '';const d=crossExtraDialog,e=CROSS_RULES.find(e=>e.id===d.id),a=e&&crossActions(e)[d.index];return `<dialog id="cross-extra-dialog" class="formula-dialog" aria-labelledby="cross-extra-title"><div class="toolbar"><h2 id="cross-extra-title">${esc(a?.label||'Действие от INT')}</h2><button data-cross-extra-close aria-label="Закрыть кросс-действие">×</button></div>${e?'<p class="rule-text">'+esc(e.text)+'</p>':''}${a?.target?'<label>Цель<input id="cross-extra-target" maxlength="160"></label>':''}${a?.knowledge?'<label>Навык<select id="cross-extra-skill"><option value="">Неизученный научный навык / знание</option>'+abilitySkillOptions(s=>/знани|наук|хими|физик|математ|биолог|медицин|истори|географ/i.test(skillEffectName(s)))+'</select></label><label class="check-row"><input id="cross-extra-confirm" type="checkbox">Научный навык или знание проверяется в разговоре</label>':''}${a?.targetCha?'<label>CHA цели<input id="cross-extra-cha" type="number" min="0"></label>':''}${a?.zone?'<label>Зона<select id="cross-extra-zone">'+names.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('')+'</select></label>':''}${['freeDodge','retryDodge','peace'].includes(a?.id)?'<label class="check-row"><input id="cross-extra-confirm" type="checkbox">'+(a.id==='peace'?'Разговор успешен':a.id==='freeDodge'?'Предыдущий уворот успешен':'Предыдущий уворот провален')+'</label>':''}${a?.id==='freeDodge'||d.id==='int-ap'?'<label>Действие<input id="cross-extra-description" maxlength="160"></label><label>Стоимость, ОД<input id="cross-extra-cost" type="number" min="0" max="'+(a?3:crossIntRemaining())+'" value="1"></label>':''}<p id="cross-extra-error" role="status"></p>${d.result?'<p class="cross-action-result">'+esc(d.result)+'</p>':'<button data-cross-extra-execute>Применить</button>'}<button data-cross-extra-close>Закрыть</button></dialog>`;}
const beforeCrossAllRender=render;
render=function(){beforeCrossAllRender();if(libraryHome){crossExtraDialog=null;return;}if(crossExtraDialog){document.querySelector('#view').insertAdjacentHTML('beforeend',renderCrossExtraDialog());document.querySelector('#cross-extra-dialog').showModal();}};
document.addEventListener('click',event=>{const open=event.target.closest('[data-cross-extra]'),close=event.target.closest('[data-cross-extra-close]'),execute=event.target.closest('[data-cross-extra-execute]');if(!open&&!close&&!execute)return;event.preventDefault();event.stopImmediatePropagation();if(close){crossExtraDialog=null;document.querySelector('#cross-extra-dialog')?.remove();return;}if(open){crossExtraDialog={id:open.dataset.crossExtra,index:Number(open.dataset.crossIndex||0)};render();return;}try{const val=id=>document.querySelector('#cross-extra-'+id)?.value||'',d=crossExtraDialog;if(d.id==='int-ap'){spendIntAction(Number(val('cost')),val('description')||'Действие от INT');d.result='Потрачено '+val('cost')+' специальных ОД от INT.';state.log.unshift(d.result);}else d.result=crossUseAction(d.id,d.index,{target:val('target'),skill:val('skill'),cha:val('cha')===''?NaN:Number(val('cha')),zone:Number(val('zone')),confirm:!!document.querySelector('#cross-extra-confirm')?.checked,cost:Number(val('cost')),description:val('description')}).text;save();render();}catch(error){document.querySelector('#cross-extra-error').textContent=error.message;}},true);
document.addEventListener('change',event=>{if(!event.target.matches('[data-cross-mystic]'))return;event.stopImmediatePropagation();const value=Number(event.target.value);if(Number.isFinite(value)&&value>=0){abilityState().crossMysticPower=value;save();render();}},true);
document.addEventListener('cancel',event=>{if(event.target.id==='cross-extra-dialog'){event.preventDefault();crossExtraDialog=null;event.target.remove();}},true);
document.addEventListener('click',event=>{if(!event.target.closest('#hurt')||!resolveEffectTarget(0,'damageReduction').value)return;event.preventDefault();event.stopImmediatePropagation();try{receiveCrossDamage(Number(document.querySelector('#delta').value));save();render();}catch(error){toast(error.message);}},true);

render();
