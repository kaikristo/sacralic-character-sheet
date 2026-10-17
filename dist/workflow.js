/* Creation, advancement and table-facing controls. Persistent data stays in the character. */
const STARTING_POOL=[10,10,8,8,6,6,4,4];
let creationDraft=null,creationToken=null,featPickerOpen=false,featPickerCategory='Все',featPickerQuery='';
function newCreationDraft(){return {name:'',player:'',race:'Человек',mode:'array',pool:[...STARTING_POOL],assigned:Array(8).fill(null),rolled:false,rerollUsed:false};}
function rollStartingPool(random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){return Array.from({length:8},()=>1+Math.floor(random()*6)+1+Math.floor(random()*6));}
function canFreeReroll(pool){return pool.length===8&&!pool.some(n=>n>=10);}
function rerollCreation(draft,random){
 if(draft.rolled&&!canFreeReroll(draft.pool)&&draft.rerollUsed)return false;
 if(draft.rolled&&!canFreeReroll(draft.pool))draft.rerollUsed=true;
 draft.pool=rollStartingPool(random);draft.assigned=Array(8).fill(null);draft.rolled=true;return true;
}
function assignCreationToken(token,stat){
 if(!creationDraft||!Number.isInteger(token)||token<0||token>7||!Number.isInteger(stat)||stat<0||stat>7)return;
 const previous=creationDraft.assigned.indexOf(token),replaced=creationDraft.assigned[stat];
 if(previous>=0)creationDraft.assigned[previous]=replaced;
 creationDraft.assigned[stat]=token;creationToken=null;
}
function renderCreation(){
 const d=creationDraft??=newCreationDraft(),pool=d.mode==='array'?STARTING_POOL:d.pool,ready=d.mode==='array'||d.rolled;
 return `<dialog id="library-dialog" class="formula-dialog creation-dialog" aria-labelledby="library-dialog-title"><div class="toolbar"><h2 id="library-dialog-title">Новый персонаж</h2><button data-library="close-modal" aria-label="Закрыть создание">×</button></div><div class="fields"><label>Имя персонажа<input id="new-character-name" data-creation-field="name" value="${esc(d.name)}" maxlength="160"></label><label>Раса<select id="new-character-race" data-creation-field="race">${RULE_ENTRIES.filter(e=>e.category==='Расы').map(e=>`<option ${d.race===e.title?'selected':''}>${esc(e.title)}</option>`).join('')}</select></label><label>Имя игрока<input id="new-character-player" data-creation-field="player" value="${esc(d.player)}" maxlength="160"></label></div><h3>Стартовые характеристики</h3><div class="play-shortcuts"><button data-workflow="creation-mode" data-mode="array" aria-pressed="${d.mode==='array'}">Готовый пул · 10, 10, 8, 8, 6, 6, 4, 4</button><button data-workflow="creation-mode" data-mode="dice" aria-pressed="${d.mode==='dice'}">Броски · 8 × 2d6</button></div>${d.mode==='dice'?`<p class="help-copy">Если нет ни одного значения ≥ 10, переброс бесплатный. Дополнительно — один переброс без условий. Новый пул полностью заменяет старый; вернуться к нему нельзя.</p><button data-workflow="creation-roll" ${d.rolled&&!canFreeReroll(d.pool)&&d.rerollUsed?'disabled':''}>${!d.rolled?'Бросить 8 × 2d6':canFreeReroll(d.pool)?'Бесплатный переброс · нет значений ≥ 10':d.rerollUsed?'Переброс использован':'Перебросить · 1 без условий'}</button><p class="help-copy">Переброс без условий: ${d.rerollUsed?'использован':'доступен'}.</p>`:''}${ready?`<p class="help-copy">Перетащите число на характеристику. На телефоне: нажмите число, затем характеристику. Нажатие на назначенное число возвращает его в пул.</p><div class="creation-pool" aria-label="Пул характеристик">${pool.map((n,i)=>`<button draggable="true" data-pool-token="${i}" data-workflow="creation-token" ${d.assigned.includes(i)?'disabled':''} aria-pressed="${creationToken===i}" aria-label="Число ${n}, номер ${i+1}">${n}</button>`).join('')}</div><div class="creation-stats">${initial.stats.map((s,i)=>`<button data-workflow="creation-assign" data-create-stat="${i}" class="creation-slot"><span>${esc(s[0])}<small>${s[1]}</small></span><b>${d.assigned[i]===null?'—':pool[d.assigned[i]]}</b></button>`).join('')}</div>`:''}<p id="library-dialog-error" class="formula-error" role="status"></p><div class="dialog-actions"><button data-library="close-modal">Отмена</button><button data-library="create" ${!ready||d.assigned.some(n=>n===null)?'disabled':''}>Создать персонажа</button></div></dialog>`;
}
const beforeWorkflowLibraryDialog=renderLibraryDialog;
renderLibraryDialog=function(){return libraryModal==='new'?renderCreation():beforeWorkflowLibraryDialog();};
createCharacter=async function(){
 const d=creationDraft;if(!d?.name.trim())throw Error('Укажите имя персонажа.');
 if(!RULE_ENTRIES.some(e=>e.category==='Расы'&&e.title===d.race))throw Error('Выберите расу из списка.');
 if(d.assigned.some(n=>n===null)||new Set(d.assigned).size!==8||(d.mode==='dice'&&!d.rolled))throw Error('Распределите все восемь значений.');
 const data=createBlankCharacter(d.name,d.race,d.player),pool=d.mode==='array'?STARTING_POOL:d.pool;
 data.stats.forEach((s,i)=>s[2]=pool[d.assigned[i]]);
 data.creation={version:1,method:d.mode,pool:[...pool],assignment:[...d.assigned],rerollUsed:d.rerollUsed};
 const now=new Date().toISOString(),record={id:crypto.randomUUID(),createdAt:now,updatedAt:now,data};
 await characterStore.put(record);characterRecords.push(record);await openCharacter(record.id);creationDraft=null;creationToken=null;
};

const FEAT_LEVELS={simple:[10,20,40,50,70,80,100,110],penalty:[20,40,80],epic:[30,60,90,120]};
function featKind(entry){return entry.category==='Эпик'?'epic':'simple';}
function selectedFeats(){return state.play.pinned.map(id=>RULE_ENTRIES.find(e=>e.id===id)).filter(e=>e&&['Простые фиты','Эпик'].includes(e.category));}
function migrateFeatChoices(){
 if(!state.play.featChoices||typeof state.play.featChoices!=='object'||Array.isArray(state.play.featChoices))state.play.featChoices={};
 const selected=selectedFeats();for(const id of Object.keys(state.play.featChoices))if(!selected.some(e=>e.id===id))delete state.play.featChoices[id];
 for(const e of selected){const count=Math.max(1,state.effects.sources[e.id]?.count||1),kind=featKind(e);let choices=state.play.featChoices[e.id];if(!Array.isArray(choices))choices=[];choices=choices.slice(0,count).map(k=>kind==='epic'?'epic':k==='penalty'?'penalty':'simple');while(choices.length<count)choices.push(kind);state.play.featChoices[e.id]=choices;}
}
function featBalances(){migrateFeatChoices();const used=Object.values(state.play.featChoices).flat();return Object.fromEntries(Object.entries(FEAT_LEVELS).map(([key,levels])=>[key,{earned:levels.filter(l=>l<=state.info.level).length,used:used.filter(k=>k===key).length,left:levels.filter(l=>l<=state.info.level).length-used.filter(k=>k===key).length}]));}
function renderFeatBalances(){const b=featBalances();return `<div class="feat-balances">${[['simple','Простые'],['penalty','Со штрафом'],['epic','Эпические']].map(([key,label])=>`<span class="${b[key].left<0?'debt':''}">${label}: <b>${b[key].left}</b><small> / выдано ${b[key].earned}</small></span>`).join('')}</div>`;}
function renderFeatPickerResults(){const entries=RULE_ENTRIES.filter(e=>['Простые фиты','Эпик'].includes(e.category)&&(featPickerCategory==='Все'||e.category===featPickerCategory)&&(e.title+' '+e.text).toLowerCase().includes(featPickerQuery.toLowerCase()));return entries.map(e=>{const count=state.play.pinned.includes(e.id)?Math.max(1,state.effects.sources[e.id]?.count||1):0;return `<article class="feat-choice"><details><summary>${esc(e.title)} <small>${e.category==='Эпик'?'эпический':'простой'}${count?' · взято '+count:''}</small></summary><p>${esc(e.text)}</p><a href="${e.url}" target="_blank" rel="noopener">Исходная запись Sacralic ↗</a></details><div class="play-shortcuts"><button data-workflow="feat-add" data-feat-id="${e.id}" data-payment="${featKind(e)}">+ ${e.category==='Эпик'?'Эпический':'Простой'}</button>${e.category==='Простые фиты'?`<button data-workflow="feat-add" data-feat-id="${e.id}" data-payment="penalty">+ Со штрафом</button>`:''}${count?`<button data-workflow="feat-remove" data-feat-id="${e.id}">− Убрать один</button>`:''}</div></article>`;}).join('')||'<p>Ничего не найдено.</p>';}
function renderFeatPicker(){return `<dialog id="feat-picker" class="formula-dialog" aria-labelledby="feat-picker-title"><div class="toolbar"><h2 id="feat-picker-title">Выбрать фиты</h2><button data-workflow="close-feats" aria-label="Закрыть выбор фитов">×</button></div><div id="feat-picker-balance">${renderFeatBalances()}</div><p class="help-copy">Выбор разрешён при отрицательном балансе. Простые: 10, 20, 40, 50, 70, 80, 100, 110; со штрафом: 20, 40, 80; эпические: 30, 60, 90, 120. «Со штрафом» выбирайте, если фит содержит штраф. Требования и допустимость повторного взятия проверяет игрок.</p><div class="fields"><label>Поиск фита<input id="feat-search" type="search" value="${esc(featPickerQuery)}"></label><label>Категория<select id="feat-category">${['Все','Простые фиты','Эпик'].map(c=>`<option ${c===featPickerCategory?'selected':''}>${c}</option>`).join('')}</select></label></div><div id="feat-picker-results">${renderFeatPickerResults()}</div></dialog>`;}
function changeFeat(id,payment,remove=false){
 const e=RULE_ENTRIES.find(e=>e.id===id&&['Простые фиты','Эпик'].includes(e.category));if(!e)return;
 migrateFeatChoices();let choices=state.play.featChoices[id]||[];
 if(remove){choices.pop();if(!choices.length){state.play.pinned=state.play.pinned.filter(x=>x!==id);delete state.play.featChoices[id];}else state.play.featChoices[id]=choices;}
 else{choices.push(e.category==='Эпик'?'epic':payment==='penalty'?'penalty':'simple');if(!state.play.pinned.includes(id))state.play.pinned.push(id);state.play.featChoices[id]=choices;}
 state.effects.sources[id]={...state.effects.sources[id],count:Math.max(1,choices.length)};save();
}
renderSummaryFeats=function(){return `<section class="summary-feats"><div class="section-heading"><h3>ФИТЫ</h3><button data-workflow="open-feats">+ Выбрать</button></div>${renderFeatBalances()}${selectedFeats().map(e=>`<details><summary>${esc(e.title)}${(state.effects.sources[e.id]?.count||1)>1?' × '+state.effects.sources[e.id].count:''}</summary><p>${esc(e.text)}</p><button data-effect-source="${e.id}">Настроить бонусы</button></details>`).join('')||'<p class="help-copy">Выберите фиты в отдельном окне.</p>'}</section>`;};

function isPsiSkill(s){const entry=SKILL_CATALOG.find(e=>e.id===s[6]);return entry?.name==='Пси-навыки'||/пси|пирокин|телекин|телепат|материализац|ясновид/i.test(s[0])&&!/стойк/i.test(s[0]);}
function energyValues(){const skills=state.skills.filter(isPsiSkill),sum=skills.reduce((n,s)=>n+effectiveSkillLevel(s),0),int=statTotal('INT');return {sum,int,max:sum*int};}
const beforeWorkflowEffectExpression=effectExpression;
effectExpression=function(value,spec){return value==='EPMAX'?energyValues().max:beforeWorkflowEffectExpression(value,spec);};
function psiResistance(){const s=state.skills.find(s=>/пси[ -]?стойк/i.test(s[0]));return s?chance(s):statTotal('INT');}
const beforeWorkflowSummary=renderPlaySummary;
renderPlaySummary=function(){const d=derivedPlay(),ep=energyValues();return `<div class="play-summary">${metric('ОД',state.play.ap+' / '+state.play.apMax,'раунд '+state.play.round)}${metric('Уворот',d.dodge+'%','до условий и штрафов')}${metric('Болевой шок',d.shock===null?'Ошибка':d.shock+'%','ваша Стойкость / CON')}${metric('Пси-стойкость',psiResistance()+'%','навык / INT')}${metric('Энергия',ep.max,'Σ пси-навыков '+ep.sum+' × INT '+ep.int)}</div><div class="play-shortcuts"><button data-page="4">Открыть бой →</button><button data-play="reference">Правила под рукой</button></div>`;};
const beforeWorkflowAction=renderActionPanel;
renderActionPanel=function(){return beforeWorkflowAction().replace(metric('Инициатива',derivedPlay().initiative),'');};
function cumulativeCombatFeatures(skill){
 const key=combatKey(skill),level=effectiveSkillLevel(skill);if(!key)return [];
 const features=[];for(const [n,row] of Object.entries(COMBAT_TABLE[key]))if(+n<=level&&row.notes){for(const text of row.notes.split(',').map(t=>t.trim()).filter(Boolean)){
  // Quantified effects in these families replace the earlier value. Other unlocks remain.
  const family=/^шанс всех особенностей/.test(text)?'energyChance':/урона проходит всегда/.test(text)?'heavyPen':/од на (выстрел|удар|метание)/.test(text)?'actionCost':/перезарядка/.test(text)?'reload':/показатель критического/.test(text)?'critical':null;
  if(family){const old=features.findIndex(f=>f.family===family);if(old>=0)features.splice(old,1);}
  if(!family&&!/^\+\d+ прием|^\+\d+ атака по возможности/.test(text)&&features.some(f=>f.text===text))continue;
  features.push({level:+n,text,family});
 }}return features;
}
const beforeWorkflowCombatInfo=renderCombatInfo;
renderCombatInfo=function(skill){const features=cumulativeCombatFeatures(skill);return beforeWorkflowCombatInfo(skill)+(features.length?`<h3>Открытые особенности</h3><ul class="combat-features">${features.map(f=>`<li>${esc(f.text)} <small>· ур. ${f.level}</small></li>`).join('')}</ul><p class="help-copy">Показаны открытия до текущего уровня; замещающие значения показываются только в последней версии. Бонусы DMG, AB и шансы берутся из текущей строки таблицы.</p>`:'');};
const beforeWorkflowCombatPage=renderCombatPage;
renderCombatPage=function(){const techniques=state.play.pinned.map(id=>RULE_ENTRIES.find(e=>e.id===id)).filter(e=>e?.category==='Приёмы');return beforeWorkflowCombatPage()+`<section class="panel selected-techniques"><div class="section-heading"><h2>Выбранные приёмы</h2><button data-workflow="select-techniques">+ Приём</button></div>${techniques.map(e=>`<details><summary>${esc(e.title)}</summary><p>${esc(e.text)}</p><a href="${e.url}" target="_blank" rel="noopener">Sacralic ↗</a></details>`).join('')||'<p class="help-copy">Выберите свои приёмы — их полное описание будет доступно здесь.</p>'}</section>`;};

const beforeWorkflowCatalog=renderCatalogDialog;
renderCatalogDialog=function(){return beforeWorkflowCatalog().replace('<label>Навык из Sacralic',`<div class="fields"><label>Поиск навыка<input id="skill-catalog-search" type="search" placeholder="Название навыка"></label><label>Тип навыка<select id="skill-catalog-type"><option>Все</option><option>Мирные</option><option>Боевые</option></select></label></div><label>Навык из Sacralic`);};
function filterSkillCatalog(){const query=document.querySelector('#skill-catalog-search').value.toLowerCase(),type=document.querySelector('#skill-catalog-type').value,select=document.querySelector('#catalog-select'),old=select.value,entries=SKILL_CATALOG.filter(e=>(type==='Все'||e.category===type)&&e.name.toLowerCase().includes(query));select.innerHTML=entries.map(e=>`<option value="${e.id}" ${e.id===old?'selected':''}>${esc(e.name)}</option>`).join('');document.querySelector('[data-addcatalog]').disabled=!entries.length;if(entries.length)updateCatalogSettings();else document.querySelector('#catalog-settings').innerHTML='<p>Навыки не найдены. Можно создать собственный.</p>';}

function applyCollapsiblePanels(){
 state.ui.collapsed??={};const counts={};
 const panels=[...document.querySelectorAll('#view .panel, #view [data-ui-region="stats"], #view .overview-tactics, #view .summary-feats, #view .movement-panel')];
 for(const panel of panels){if(panel.classList.contains('left-sheet')||panel.closest('dialog'))continue;
  if(panel.classList.contains('overview-tactics'))panel.insertAdjacentHTML('afterbegin','<div class="section-heading"><h2>Общая информация</h2></div>');
  if(panel.classList.contains('combat-vitals'))panel.insertAdjacentHTML('afterbegin','<div class="section-heading"><h2>Здоровье в бою</h2></div>');
  let heading=[...panel.querySelectorAll('h2,h3')].find(h=>!h.closest('dialog')&&panels.filter(p=>p!==panel&&panel.contains(p)&&p.contains(h)).length===0);if(!heading)continue;
  let header=heading;while(header.parentElement!==panel)header=header.parentElement;
  const label=heading.textContent,key=page+':'+(panel.dataset.uiRegion||label),nth=counts[key]||0;counts[key]=nth+1;const id=key+':'+nth;
  const button=document.createElement('button');button.className='panel-collapse-toggle';button.dataset.collapsePanel=id;button.setAttribute('aria-expanded',String(!state.ui.collapsed[id]));button.innerHTML=`<span>${esc(label)}</span><span aria-hidden="true">${state.ui.collapsed[id]?'▸':'▾'}</span>`;heading.textContent='';heading.append(button);
  const body=document.createElement('div');body.className='collapsible-content';body.hidden=!!state.ui.collapsed[id];body.id='collapse-'+panels.indexOf(panel);button.setAttribute('aria-controls',body.id);
  for(const child of [...panel.childNodes])if(child!==header)body.append(child);panel.append(body);panel.classList.toggle('panel-collapsed',body.hidden);
 }
}
const beforeWorkflowRender=render;
render=function(){beforeWorkflowRender();if(libraryHome)return;applyCollapsiblePanels();if(featPickerOpen){document.querySelector('#view').insertAdjacentHTML('beforeend',renderFeatPicker());document.querySelector('#feat-picker').showModal();}};
document.addEventListener('input',event=>{
 if(event.target.dataset.creationField)creationDraft[event.target.dataset.creationField]=event.target.value;
 if(event.target.id==='feat-search'){featPickerQuery=event.target.value;document.querySelector('#feat-picker-results').innerHTML=renderFeatPickerResults();}
 if(event.target.id==='skill-catalog-search')filterSkillCatalog();
});
document.addEventListener('change',event=>{
 if(event.target.dataset.creationField)creationDraft[event.target.dataset.creationField]=event.target.value;
 if(event.target.id==='feat-category'){featPickerCategory=event.target.value;document.querySelector('#feat-picker-results').innerHTML=renderFeatPickerResults();}
 if(event.target.id==='skill-catalog-type')filterSkillCatalog();
});
document.addEventListener('dragstart',event=>{const token=event.target.closest('[data-pool-token]');if(token){creationToken=+token.dataset.poolToken;event.dataTransfer.setData('text/plain',token.dataset.poolToken);event.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragover',event=>{if(creationToken!==null&&event.target.closest('[data-create-stat]')){event.preventDefault();event.dataTransfer.dropEffect='move';}});
document.addEventListener('drop',event=>{const slot=event.target.closest('[data-create-stat]');if(slot&&creationToken!==null){event.preventDefault();assignCreationToken(creationToken,+slot.dataset.createStat);render();}});
document.addEventListener('cancel',event=>{if(event.target.id==='feat-picker')featPickerOpen=false;},true);
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.collapsePanel!==undefined){event.stopImmediatePropagation();const body=document.getElementById(b.getAttribute('aria-controls')),collapsed=!body.hidden;state.ui.collapsed[d.collapsePanel]=collapsed;body.hidden=collapsed;b.setAttribute('aria-expanded',String(!collapsed));b.lastElementChild.textContent=collapsed?'▸':'▾';body.parentElement.classList.toggle('panel-collapsed',collapsed);save();if(typeof refreshPanelLayout==='function')requestAnimationFrame(()=>refreshPanelLayout(body.parentElement));return;}
 if(d.library==='new')creationDraft??=newCreationDraft();
 if(d.library==='feats'||d.effectAction==='select-feat'){event.stopImmediatePropagation();featPickerOpen=true;render();return;}
 const action=d.workflow;if(!action)return;event.stopImmediatePropagation();
 switch(action){
  case 'creation-mode':if(creationDraft.mode!==d.mode){creationDraft.mode=d.mode;creationDraft.assigned=Array(8).fill(null);creationToken=null;}break;
  case 'creation-roll':rerollCreation(creationDraft);creationToken=null;break;
  case 'creation-token':creationToken=+d.poolToken;break;
  case 'creation-assign':if(creationToken!==null)assignCreationToken(creationToken,+d.createStat);else creationDraft.assigned[+d.createStat]=null;break;
  case 'open-feats':featPickerOpen=true;break;
  case 'close-feats':featPickerOpen=false;break;
  case 'feat-add':case 'feat-remove':changeFeat(d.featId,d.payment,action==='feat-remove');document.querySelector('#feat-picker-balance').innerHTML=renderFeatBalances();document.querySelector('#feat-picker-results').innerHTML=renderFeatPickerResults();return;
  case 'select-techniques':page=6;referenceCategory='Приёмы';referenceQuery='';break;
 }
 render();
},true);
render();
