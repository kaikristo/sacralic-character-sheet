/* Explicit requirements for all 51 source classes; no guessing of narrative achievements. */
const CLASS_REQUIREMENTS={};
const reqStat=(code,min,strict=false)=>({type:'stat',code,min,strict});
const reqSkill=(family,min,count=1)=>({type:'skill',family,min,count});
const reqClass=(...names)=>({type:'class',names});
const reqFact=(key,label)=>({type:'fact',key,label});
const reqAny=(label,...items)=>({type:'any',label,items});
const reqAll=(label,...items)=>({type:'all',label,items});
const reqRace=name=>({type:'race',name});
Object.assign(CLASS_REQUIREMENTS,{
 'Боец':entry=>{const style=sourceConfig(entry.id).style;const strong=reqAll('Силовой стиль',reqSkill('strong',3),reqStat('STR',9)),agile=reqAll('Ловкий стиль',reqSkill('agile',3),reqStat('DEX',9));return [style==='STR'?strong:style==='DEX'?agile:reqAny('Один подходящий стиль',strong,agile)];},
 'Стрелок':[reqSkill('shooting',3),reqStat('ACC',9)],
 'Псион':[reqSkill('psi',3),reqStat('INT',9)],
 'Авантюрист':[reqAny('Воровство, взлом или азартные игры',reqSkill('theft',3),reqSkill('lock',3),reqSkill('gambling',3)),reqAny('DEX или LCK',reqStat('DEX',9),reqStat('LCK',9))],
 'Техник':[reqAny('Созидание или вождение',reqSkill('craft',3),reqSkill('driving',3)),reqAny('RTC или INT выше 9',reqStat('RTC',9,true),reqStat('INT',9,true))],
 'Ученый':[reqSkill('science',3),reqStat('INT',9,true)],
 'Артист':[reqSkill('art',3),reqStat('CHA',9,true)],
 'Телохранитель':[reqClass('Боец'),reqSkill('stamina',6)],
 'Бастион':[reqClass('Боец'),reqSkill('armor',5),reqSkill('stamina',5)],
 'Уворотчик':[reqClass('Боец'),reqSkill('agile',6),reqSkill('acrobatics',5)],
 'Разрушитель':[reqClass('Боец'),reqSkill('strong',6)],
 'Железный кулак':[reqClass('Боец'),reqSkill('strong',6),reqStat('STR',20)],
 'Джаггернаут':[reqClass('Боец'),reqSkill('strong',5),reqSkill('athletics',5)],
 'Критовик (да да, тупое название - придумайте лучше)':[reqClass('Боец'),reqSkill('agile',6),reqStat('LCK',20)],
 'Кубинский охотник':[reqSkill('combat',6),reqFact('cubanTrophy','Убить кубинское чудовище этим навыком и доставить трофей в Гавану')],
 'Снайпер':[reqClass('Стрелок'),reqSkill('sniper',6)],
 'Автоматчик':[reqClass('Стрелок'),reqSkill('automatic',6)],
 'Штурмовик':[reqClass('Стрелок'),reqAny('Средняя или тяжёлая броня',reqSkill('mediumArmor',6),reqSkill('heavyArmor',6))],
 'Пулеметчик':[reqClass('Стрелок'),reqSkill('heavy',6),reqSkill('automatic',5)],
 'Легкий стрелок':[reqClass('Стрелок'),reqSkill('light',6)],
 'Гранатометчик':[reqClass('Стрелок'),reqSkill('heavy',6),reqSkill('explosives',5)],
 'Поджигатель':[reqClass('Стрелок'),reqSkill('heavy',6)],
 'Тирадор':[reqClass('Стрелок'),reqStat('LCK',20)],
 'Ниндзя':[reqClass('Боец'),reqSkill('agile',5),reqSkill('stealth',6),reqAny('Ноко или обучение у клана',reqRace('Ноко'),reqFact('nokoTraining','Пройти обучение у клана Ноко'))],
 'Пирокинетик':[reqClass('Псион'),reqSkill('pyro',6)],
 'Ясновидец':[reqClass('Псион'),reqSkill('clairvoyance',6)],
 'Материализатор':[reqClass('Псион'),reqSkill('materialization',6)],
 'Телепат':[reqClass('Псион'),reqSkill('psionics',6)],
 'Шаман':[reqClass('Псион'),reqSkill('shamanism',6)],
 'Варден':[reqClass('Псион'),reqSkill('mind',6)],
 'Пси-универсал':[reqClass('Псион'),reqSkill('psi',5,2)],
 'Искатель':[reqClass('Авантюрист','Стрелок','Боец'),reqSkill('wildTerrain',5),reqFact('seekerTattoo','Получить татуировки Искателей ранга выше новичка')],
 'Следопыт':[reqClass('Авантюрист'),reqSkill('observation',6)],
 'Игрок':[reqClass('Авантюрист'),reqSkill('gambling',6)],
 'Шпион':[reqClass('Авантюрист'),reqSkill('stealth',6)],
 'Сыщик':[reqClass('Авантюрист'),reqSkill('observation',6),reqSkill('combat',5)],
 'Вор':[reqClass('Авантюрист'),reqAny('Взлом или карманник',reqSkill('lock',6),reqSkill('theft',6))],
 'Отравитель':[reqClass('Авантюрист'),reqSkill('chemistry',5)],
 'Уличный бард':[reqClass('Артист'),reqSkill('music',5,2)],
 'Зверовод: Хозяин стаи':[reqStat('CHA',20),reqSkill('taming',5),reqFact('threePets','Иметь трёх разных дрессированных питомцев')],
 'Зверовод: верный друг':[reqStat('CHA',20),reqSkill('taming',5),reqFact('petVictory','Иметь боевого питомца и совместную победу над противником более высокого уровня')],
 'Маэстро':[reqClass('Артист'),reqSkill('art',6)],
 'Дипломат':[reqClass('Артист'),reqSkill('conversation',6)],
 'Водитель-универсал':[reqClass('Техник'),reqSkill('driving',5,2)],
 'Таксист':[reqClass('Техник'),reqSkill('driving',6),reqSkill('city',5)],
 'Механик':[reqClass('Техник'),reqSkill('repair',6)],
 'Специалист':[reqClass('Техник'),reqSkill('craft',6)],
 'Хакер':[reqClass('Техник'),reqSkill('it',6)],
 'Специалист (ученый - название идет по специальности, например - химик, математик и т.д.)':[reqClass('Ученый'),reqSkill('science',6)],
 'Знаток':[reqClass('Ученый'),reqSkill('knowledge',5,2)],
 'Безумный ученый':[reqClass('Ученый'),reqFact('approvedIdea','Согласовать с мастером одержимость реализацией идеи')]
});
const REQUIREMENT_SKILLS={strong:'Ближний бой · силовой стиль',agile:'Ближний бой · ловкий стиль',shooting:'Любая стрельба',psi:'Пси-дисциплина',theft:'Воровство / карманные кражи',lock:'Взлом',gambling:'Азартные игры',craft:'Созидание / производство',driving:'Вождение / пилотирование',science:'Научный навык',art:'Навык искусства',stamina:'Стойкость',armor:'Любая броня',acrobatics:'Акробатика',athletics:'Атлетика',combat:'Боевой навык',sniper:'Снайперская стрельба',automatic:'Автоматическое оружие',mediumArmor:'Средняя броня',heavyArmor:'Тяжёлая броня',heavy:'Тяжёлое оружие',light:'Лёгкое стрелковое оружие',explosives:'Взрывотехника',stealth:'Скрытность',pyro:'Пирокинез',clairvoyance:'Ясновидение',materialization:'Материализация',psionics:'Псионика',shamanism:'Шаманизм',mind:'Стойкость разума / Пси-стойкость',wildTerrain:'Знание дикой местности',observation:'Наблюдательность',chemistry:'Химия',music:'Музыкальный навык',taming:'Приручение животных',conversation:'Разговор / убеждение',city:'Знание города',repair:'Ремонт',it:'ИТ / компьютерные технологии',knowledge:'Навык знаний'};
function requirementSkillMatches(skill,family){
 const raw=effectNorm(skill[0]),canonical=effectNorm(skillEffectName(skill)),name=raw+' '+canonical,key=combatKey(skill)||'';
 const patterns={theft:/воровств|карман/,lock:/взлом/,gambling:/азарт/,craft:/создани|созид|производ|крафт|кузнеч|портняж|столяр|плотниц/,driving:/вожден|пилотир/,science:/научн|наук|хими|физик|математ|биолог|геолог|астроном|психолог|социолог/,art:/искусств|исполнен|лицедей|актер|рисован|живопис|музык|пени|вокал|гитар|скрип|фортепиан|танц/,explosives:/взрывотех/,stealth:/скрытност/,pyro:/пирокин/,clairvoyance:/ясновид/,materialization:/материализац/,psionics:/псионик/,shamanism:/шаманизм/,observation:/наблюдательност/,chemistry:/хими/,music:/музык|пени|вокал|гитар|скрип|фортепиан|барабан|флейт|саксофон|труб|виолончел|контрабас|арф|балалайк|аккордеон/,taming:/приручен/,conversation:/разговор|убежден/,repair:/ремонт/,it:/компьютер|информацион|^ит$|\sит$/,knowledge:/знани/};
 if(family==='strong'||family==='agile')return key.includes(family==='strong'?'силовой':'ловкий')||(/ближн.*бо/.test(name)&&name.includes(family==='strong'?'силов':'ловк'));
 if(family==='shooting')return key.startsWith('Стрельба')||/стрельб/.test(name);
 if(family==='psi')return !/стойк|мист/.test(name)&&(isPsiSkill(skill)||/псидисциплин|псинавык/.test(name));
 if(family==='stamina')return raw==='стойкость'||canonical==='стойкость';
 if(family==='mind')return isMindResistanceSkill(skill);
 if(family==='armor')return /брон/.test(name);
 if(family==='mediumArmor')return /средн.*брон|брон.*средн/.test(name);
 if(family==='heavyArmor')return /тяжел.*брон|брон.*тяжел/.test(name);
 if(family==='acrobatics'||family==='athletics')return name.includes(family==='acrobatics'?'акробат':'атлетик');
 if(family==='combat')return skill[2]==='Боевые';
 if(family==='science'&&canonical.startsWith('знание'))return false;
 const weapon={sniper:'снайпер',automatic:'автомат',heavy:'тяжел',light:'легк'}[family];if(weapon)return key.startsWith('Стрельба')&&key.includes(weapon)||/стрельб|оруж/.test(name)&&!name.includes('брон')&&name.includes(weapon);
 if(family==='wildTerrain')return !/город/.test(raw)&&/местност|биом|лес|джунгл|тундр|пустын|горн|степ|болот|побереж/.test(raw)&&/знани|местност/.test(name);
 if(family==='city')return /город/.test(raw)&&/знани/.test(name);
 return !!patterns[family]?.test(name);
}
function requirementSkillValues(family){const distinct=new Map();for(const skill of state.skills.filter(s=>requirementSkillMatches(s,family))){const key=effectNorm(skill[0]),value={name:skill[0],level:effectiveSkillLevel(skill)};if(!distinct.has(key)||distinct.get(key).level<value.level)distinct.set(key,value);}return [...distinct.values()].sort((a,b)=>b.level-a.level);}
function evaluateClassRequirement(spec,entry,path='0'){
 const cfg=sourceConfig(entry.id);let met=false,label='',detail='',children=[];
 if(spec.type==='stat'){const value=statTotal(spec.code);met=spec.strict?value>spec.min:value>=spec.min;label=spec.code+' '+(spec.strict?'>':'≥')+' '+spec.min;detail='Сейчас '+value;}
 if(spec.type==='skill'){const values=requirementSkillValues(spec.family),qualified=values.filter(s=>s.level>=spec.min);met=qualified.length>=spec.count;label=(spec.count>1?spec.count+' разных: ':'')+REQUIREMENT_SKILLS[spec.family]+' ≥ '+spec.min;detail=values.length?values.map(s=>s.name+' '+s.level).join('; '):'Навык не изучен';if(spec.count>1)detail+=' · подходит '+qualified.length+'/'+spec.count;}
 if(spec.type==='class'){const selected=selectedClassEntries().filter(e=>sourceConfig(e.id).enabled!==false);met=selected.some(e=>spec.names.includes(e.title));label='Класс: '+spec.names.join(' или ');detail=met?'Выбран':'Не выбран';}
 if(spec.type==='race'){met=effectNorm(state.info.race)===effectNorm(spec.name);label='Раса: '+spec.name;detail='Сейчас '+state.info.race;}
 if(spec.type==='fact'){met=cfg.requirementFacts?.[spec.key]===true;label=spec.label;detail=met?'Подтверждено вручную':'Нужно подтверждение игрока / мастера';}
 if(spec.type==='all'||spec.type==='any'){children=spec.items.map((s,i)=>evaluateClassRequirement(s,entry,path+'.'+i));met=spec.type==='all'?children.every(r=>r.met):children.some(r=>r.met);label=spec.label;}
 return {key:path,type:spec.type,factKey:spec.key,label,detail,met,children};
}
function classEligibility(entry){const configured=CLASS_REQUIREMENTS[entry.title],specs=typeof configured==='function'?configured(entry):configured;const checks=(specs||[reqFact('unmapped','Требования источника требуют ручной проверки')]).map((s,i)=>evaluateClassRequirement(s,entry,String(i))),met=checks.every(r=>r.met),override=sourceConfig(entry.id).requirementsOverride?.enabled===true;return {checks,met,override,allowed:met||override,missing:checks.filter(r=>!r.met)};}
function setClassRequirementsOverride(id,enabled,reason=''){if(!CLASS_ENTRIES.some(e=>e.id===id))throw Error('Класс не найден.');const cfg=state.effects.sources[id]??={};cfg.requirementsOverride={enabled:!!enabled,reason:String(reason).slice(0,500)};}
function setClassRequirementFact(id,key,value){const entry=CLASS_ENTRIES.find(e=>e.id===id);if(!entry)throw Error('Класс не найден.');const flatten=items=>items.flatMap(s=>[s,...flatten(s.items||[])]),configured=CLASS_REQUIREMENTS[entry.title],specs=typeof configured==='function'?configured(entry):configured;if(!flatten(specs||[]).some(s=>s.type==='fact'&&s.key===key))throw Error('Условие не найдено.');const cfg=state.effects.sources[id]??={};cfg.requirementFacts={...cfg.requirementFacts,[key]:!!value};}
const beforeCheckedClassSelection=setClassSelection;
setClassSelection=function(id,selected){const entry=CLASS_ENTRIES.find(e=>e.id===id);if(selected&&entry&&!classEligibility(entry).allowed)throw Error('Не выполнены требования '+entry.title+'. Проверьте список или включите ручное исключение.');return beforeCheckedClassSelection(id,selected);};
function renderRequirementCheck(result,entry){return `<li class="requirement-check ${result.met?'requirement-met':'requirement-missing'}"><span aria-hidden="true">${result.met?'✓':'○'}</span><div><b>${esc(result.label)}</b>${result.detail?'<small>'+esc(result.detail)+'</small>':''}${result.type==='fact'?`<label class="check-row"><input type="checkbox" data-class-fact="${entry.id}" data-fact-key="${result.factKey}" ${result.met?'checked':''}>Подтверждено</label>`:''}${result.children.length?'<ul>'+result.children.map(c=>renderRequirementCheck(c,entry)).join('')+'</ul>':''}</div></li>`;}
function renderClassRequirements(entry,selected){const eligibility=classEligibility(entry),cfg=sourceConfig(entry.id);return `<section class="class-eligibility" aria-label="Проверка требований: ${esc(entry.title)}"><p class="requirement-status ${eligibility.met?'requirement-met':eligibility.override?'requirement-override':'requirement-missing'}">${eligibility.met?'✓ Требования выполнены':eligibility.override?'Ручное исключение · требования не выполнены':'Не выполнено условий: '+eligibility.missing.length}</p>${selected&&!eligibility.met?'<small>Класс уже выбран: сохранённые способности продолжают действовать.</small>':''}<details ${eligibility.met?'':'open'}><summary>Проверка характеристик, навыков и классов</summary><ul class="requirement-list">${eligibility.checks.map(r=>renderRequirementCheck(r,entry)).join('')}</ul></details><details class="requirement-override-settings" ${eligibility.override?'open':''}><summary>Ручное исключение</summary><label class="check-row"><input type="checkbox" data-class-requirement-override="${entry.id}" ${eligibility.override?'checked':''}>Разрешить выбор без выполнения требований</label><label>Причина / решение мастера<input data-class-requirement-reason="${entry.id}" maxlength="500" value="${esc(cfg.requirementsOverride?.reason||'')}" placeholder="Необязательно"></label></details></section>`;}
const beforeCheckedClassCard=renderClassCard;
renderClassCard=function(entry,selected=false){const eligibility=classEligibility(entry);let html=beforeCheckedClassCard(entry,selected);html=html.replace(/<p class="class-requirements">[\s\S]*?<\/p>/,renderClassRequirements(entry,selected));if(!selected&&!eligibility.allowed)html=html.replace('data-class-select="'+entry.id+'"','disabled data-class-select="'+entry.id+'"');return html;};
const beforeCheckedClassesPage=renderClassesPage;
renderClassesPage=function(){return beforeCheckedClassesPage().replace('Требования показаны для проверки игроком. Выбор остаётся доступным для переноса существующих персонажей и решений ведущего.','Характеристики, навыки и классы проверяются автоматически. Сюжетные условия подтверждаются вручную. Для исключения включите ручное разрешение в карточке класса.');};
document.addEventListener('change',event=>{const el=event.target,id=el.dataset.classRequirementOverride||el.dataset.classRequirementReason||el.dataset.classFact;if(!id)return;event.stopImmediatePropagation();try{if(el.dataset.classFact)setClassRequirementFact(id,el.dataset.factKey,el.checked);else{const current=sourceConfig(id).requirementsOverride||{};setClassRequirementsOverride(id,el.dataset.classRequirementOverride?el.checked:current.enabled,el.dataset.classRequirementReason?el.value:el.closest('.class-eligibility')?.querySelector('[data-class-requirement-reason]')?.value??current.reason??'');}save();if(!el.dataset.classRequirementReason)render();}catch(error){toast(error.message);}},true);
document.addEventListener('input',event=>{const el=event.target,id=el.dataset.classRequirementReason;if(!id)return;event.stopImmediatePropagation();setClassRequirementsOverride(id,sourceConfig(id).requirementsOverride?.enabled===true,el.value);save();},true);
render();
