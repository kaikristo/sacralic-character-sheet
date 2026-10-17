/* Explicit manual skill bonuses, toggled conditions and ammunition transactions. */
let conditionEditor=null,conditionDraft=null;
function migrateManualModifiers(){
 const ids=new Set(state.skills.map(skillIdentity));state.play.favoriteSkills=[...new Set((Array.isArray(state.play.favoriteSkills)?state.play.favoriteSkills:[]).filter(id=>typeof id==='string'&&ids.has(id)))];
 if(!state.play.skillBonuses||typeof state.play.skillBonuses!=='object'||Array.isArray(state.play.skillBonuses))state.play.skillBonuses={};
 for(const [id,b] of Object.entries(state.play.skillBonuses))state.play.skillBonuses[id]={level:Number.isSafeInteger(b?.level)?b.level:0,chance:Number.isFinite(b?.chance)?b.chance:0};
 if(!Array.isArray(state.play.customConditions))state.play.customConditions=[];
 state.play.customConditions=state.play.customConditions.filter(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&Array.isArray(c.modifiers)).map(c=>({...c,enabled:c.enabled!==false,modifiers:c.modifiers.filter(m=>m&&typeof m.target==='string'&&['add','percent'].includes(m.op)&&Number.isFinite(m.value))}));
}
const beforeManualMigrate=migrateEffects;
migrateEffects=function(){beforeManualMigrate();migrateManualModifiers();};
function skillManualBonus(s){return state.play.skillBonuses?.[skillIdentity(s)]||{level:0,chance:0};}
function modifierApplies(target,spec,context){
 if(spec===target)return true;
 if(target.startsWith('chance:'))return spec==='chance:all'||spec==='chance:combat'&&context.skill?.[2]==='Боевые'||spec==='chance:peaceful'&&context.skill?.[2]==='Мирные';
 return target.startsWith('skillLevel:')&&spec==='skillLevel:all';
}
const beforeManualApplicable=applicableEffects;
applicableEffects=function(target,context={}){
 const lines=beforeManualApplicable(target,context),s=context.skill,bonus=s&&skillManualBonus(s);
 const manualValue=target==='skillLevel:'+skillIdentity(s||[])?bonus?.level:target==='chance:'+skillIdentity(s||[])?bonus?.chance:0;
 if(manualValue)lines.push({id:'manual-skill/'+skillIdentity(s)+'/'+target,source:'Ручной бонус навыка',label:target.startsWith('chance:')?'Шанс':'Уровень',op:'add',value:manualValue,enabled:true,manual:true});
 for(const c of context.natural?[]:state.play.customConditions||[])for(const [i,m] of c.modifiers.entries())if(modifierApplies(target,m.target,context))lines.push({id:'condition/'+c.id+'/'+i,source:'Состояние: '+c.name,label:effectTargetLabel(m.target),op:m.op,value:m.value,enabled:c.enabled!==false});
 return lines;
};
naturalStatValue=function(code,base){return Math.max(1,resolveEffectTarget(base,'stat:'+code,{natural:true}).value);};
const beforeManualTargetLabel=effectTargetLabel;
effectTargetLabel=function(key){return ({'chance:all':'Все шансы','chance:combat':'Боевые шансы','chance:peaceful':'Мирные шансы','skillLevel:all':'Уровни всех навыков',attackCost:'Стоимость атаки, ОД',attackDamage:'Урон атаки',attackArmorPen:'ББ атаки'})[key]||beforeManualTargetLabel(key);};
const beforeManualFormulaDialog=beforeEffectsFormulaDialog;
renderFormulaDialog=function(){if(formulaOpen<0)return '';const s=state.skills[formulaOpen],b=skillManualBonus(s);return beforeManualFormulaDialog().replace('<label>Основная характеристика',`<div class="fields skill-bonus-editor"><label>Бонус к уровню навыка<input id="skill-level-bonus" type="number" step="1" value="${b.level}" aria-label="Бонус к уровню навыка"></label><label>Бонус к шансу, п.п.<input id="skill-chance-bonus" type="number" step="any" value="${b.chance}" aria-label="Бонус к шансу навыка"></label></div><p id="skill-bonus-error" class="formula-error" role="status"></p><label>Основная характеристика`).replace('<div class="dialog-actions">',`<details class="skill-bonus-audit"><summary>Из чего сложился бонус</summary>${renderTargetBreakdown('skillLevel:'+skillIdentity(s))}${renderTargetBreakdown('chance:'+skillIdentity(s))}</details><div class="dialog-actions">`);};
function applySkillBonusEditor(index){
 const old=state.skills[index],candidate=[...old],level=Number(document.querySelector('#skill-level-bonus').value),chanceBonus=Number(document.querySelector('#skill-chance-bonus').value);
 if(!Number.isSafeInteger(level)||!Number.isFinite(chanceBonus))throw Error('Уровень: целый бонус; шанс: числовой бонус или штраф.');
 candidate[4]=document.querySelector('#formula-expression').value;candidate[3]=document.querySelector('#formula-attribute').value;candidate[2]=document.querySelector('#formula-category').value;candidate[5]=document.querySelector('#formula-description').value;
 const id=skillIdentity(old),previous=state.play.skillBonuses[id];state.play.skillBonuses[id]={level,chance:chanceBonus};const result=skillResult(candidate);
 if(result.error){if(previous)state.play.skillBonuses[id]=previous;else delete state.play.skillBonuses[id];throw Error(result.error);}
 state.skills[index]=candidate;formulaOpen=-1;save();render();
}
function conditionTargets(){return ['chance:all','chance:combat','chance:peaceful','skillLevel:all',...EFFECT_STATS.map(c=>'stat:'+c),...state.skills.flatMap(s=>['chance:'+skillIdentity(s),'skillLevel:'+skillIdentity(s)]),'hp','hpModifier','ap','dodge','critical','move:walk','move:run','move:jump','jumpCost','attackCost','attackDamage','attackArmorPen'];}
function conditionSummary(c){return c.modifiers.map(m=>effectTargetLabel(m.target)+' ('+m.value+(m.op==='percent'?'%':'')+')').join(' · ');}
function renderCustomConditions(){return `<section class="custom-conditions"><div class="section-heading"><h3>Бонусы и штрафы</h3><button data-modifier="new-condition">+ Состояние</button></div>${(state.play.customConditions||[]).map(c=>`<article class="custom-condition ${c.enabled?'active':''}"><button data-modifier="toggle-condition" data-condition-id="${c.id}" aria-pressed="${c.enabled}" aria-label="${c.enabled?'Выключить':'Включить'} состояние ${esc(c.name)}"><span aria-hidden="true">${c.enabled?'●':'○'}</span> ${esc(c.name)}</button><button data-modifier="edit-condition" data-condition-id="${c.id}" aria-label="Настройки состояния ${esc(c.name)}">⚙</button><small>${esc(conditionSummary(c))}</small></article>`).join('')}</section>`;}
const beforeManualConditions=renderConditions;
renderConditions=function(){return beforeManualConditions().replace('Условия</h2>','Состояния</h2>').replace('<small class="muted">Памятки не меняют формулы. Учитывайте расовые исключения и решение мастера.</small>',renderCustomConditions());};
function openConditionEditor(id=null){const c=(state.play.customConditions||[]).find(c=>c.id===id);conditionEditor=id||'new';conditionDraft=c?structuredClone(c):{id:crypto.randomUUID(),name:'',enabled:true,modifiers:[{target:'chance:all',op:'add',value:0}]};}
function readConditionDraft(){if(!conditionDraft)return;conditionDraft.name=document.querySelector('#condition-name').value;conditionDraft.enabled=document.querySelector('#condition-enabled').checked;conditionDraft.modifiers=[...document.querySelectorAll('[data-condition-row]')].map(row=>({target:row.querySelector('[data-condition-target]').value,op:row.querySelector('[data-condition-op]').value,value:Number(row.querySelector('[data-condition-value]').value)}));}
function validateCustomCondition(c){if(!c.name.trim())throw Error('Укажите название состояния.');if(!c.modifiers.length)throw Error('Добавьте хотя бы один эффект.');for(const m of c.modifiers){if(!conditionTargets().includes(m.target)||!['add','percent'].includes(m.op)||!Number.isFinite(m.value))throw Error('Проверьте показатель и значение эффекта.');if(m.target==='attackDamage'&&m.op!=='add')throw Error('Для урона атаки используйте числовую прибавку.');}return {...c,name:c.name.trim()};}
function renderConditionEditor(){if(!conditionEditor)return '';const c=conditionDraft;return `<dialog id="condition-editor" class="formula-dialog" aria-labelledby="condition-editor-title"><div class="toolbar"><h2 id="condition-editor-title">Бонусы и штрафы состояния</h2><button data-modifier="close-condition" aria-label="Закрыть состояние">×</button></div><label>Название<input id="condition-name" value="${esc(c.name)}" maxlength="160"></label><label class="check-row"><input id="condition-enabled" type="checkbox" ${c.enabled?'checked':''}>Состояние активно</label><div class="condition-effect-rows">${c.modifiers.map((m,i)=>`<div data-condition-row="${i}"><label>Показатель<select data-condition-target>${conditionTargets().map(t=>`<option value="${esc(t)}" ${t===m.target?'selected':''}>${esc(effectTargetLabel(t))}</option>`).join('')}</select></label><label>Тип<select data-condition-op><option value="add" ${m.op==='add'?'selected':''}>Прибавка / штраф (шанс — п.п.)</option><option value="percent" ${m.op==='percent'?'selected':''}>Процент от значения</option></select></label><label>Значение<input data-condition-value type="number" step="any" value="${m.value}"></label><button data-modifier="remove-condition-effect" data-effect-index="${i}" aria-label="Удалить эффект ${i+1}">×</button></div>`).join('')}</div><button data-modifier="add-condition-effect">+ Эффект</button><p id="condition-editor-error" class="formula-error" role="status"></p><div class="dialog-actions">${conditionEditor!=='new'?'<button data-modifier="delete-condition">Удалить состояние</button>':''}<button data-modifier="save-condition">Сохранить состояние</button></div></dialog>`;}

function attackAmmo(item){const d=item.details||{},a=attackNumbers(item),source=weaponRule(item)?.row,legacy=String(d.ammo||'').match(/(-?\d+)\s*\/\s*(\d+)/),sourceCapacity=String(source?.[8]||'').match(/магазин\D*(\d+)/i);
 const max=d.ammoMax!==undefined&&d.ammoMax!==''&&Number.isSafeInteger(Number(d.ammoMax))?Number(d.ammoMax):legacy?Number(legacy[2]):sourceCapacity?Number(sourceCapacity[1]):null;
 const current=d.ammoCurrent!==undefined&&d.ammoCurrent!==''&&Number.isSafeInteger(Number(d.ammoCurrent))?Number(d.ammoCurrent):legacy?Number(legacy[1]):max??(a.key==='Метание'?Number(item.qty)||0:0);
 const burst=String(source?.[4]||'').match(/(\d+)\s*пул/i),cost=d.ammoPerAttack!==undefined&&d.ammoPerAttack!==''?Number(d.ammoPerAttack):(a.shooting||a.key==='Метание')?(/очеред/i.test(d.attackMode||'')?Number(burst?.[1]||3):1):0;
 return {current,max,cost};
}
function performWeaponAttack(index){const item=state.items[index];if(!item||item.category!=='Оружие'||!item.equipped)throw Error('Оружие не надето.');item.details??={};const a=attackNumbers(item),ammo=attackAmmo(item);if(a.cost===null)throw Error('Укажите стоимость атаки.');if(!Number.isSafeInteger(ammo.cost)||ammo.cost<0||!Number.isSafeInteger(ammo.current-ammo.cost))throw Error('Боезапас за атаку должен быть целым числом от 0.');
 spendAction(a.cost,'Атака: '+item.name);if(ammo.cost){item.ammoIdentity??=crypto.randomUUID();const snapshot=state.play.history.at(-1);snapshot.ammunition={id:item.ammoIdentity,index,name:item.name,hadCurrent:Object.hasOwn(item.details,'ammoCurrent'),current:item.details.ammoCurrent};item.details.ammoCurrent=String(ammo.current-ammo.cost);}return a;
}
const beforeAmmoUndo=undoEffectAction;
undoEffectAction=function(){const ammo=state.play.history.at(-1)?.ammunition;beforeAmmoUndo();if(ammo){const item=state.items.find(i=>i.ammoIdentity===ammo.id);if(item){if(ammo.hadCurrent)item.details.ammoCurrent=ammo.current;else delete item.details.ammoCurrent;}}};
const beforeAmmoSaveItem=saveItemDialog;
saveItemDialog=function(){const identity=state.items[itemEdit]?.ammoIdentity,index=itemEdit,result=beforeAmmoSaveItem();if(result&&identity&&index>=0)state.items[index].ammoIdentity=identity;return result;};
itemFields['Оружие'].push(['ammoPerAttack','Боезапас за атаку']);
const beforeConditionAttackNumbers=attackNumbers;
attackNumbers=function(item){const a=beforeConditionAttackNumbers(item),ctx={skill:a.skill};if(a.cost!==null){const next=resolveEffectTarget(a.cost,'attackCost',ctx);a.cost=Math.max(a.shooting?3:1,Math.floor(next.value));for(const e of next.lines.filter(e=>e.enabled))a.notes.push(e.source+': '+e.value+(e.op==='percent'?'%':'')+' ОД');}const damage=resolveEffectTarget(0,'attackDamage',ctx).value;if(damage)a.damage+=' '+(damage>0?'+ ':'− ')+Math.abs(damage);if(a.bb!==null)a.bb=resolveEffectTarget(a.bb,'attackArmorPen',ctx).value;return a;};
const beforeAmmoWeapons=renderWeapons;
renderWeapons=function(){let html=beforeAmmoWeapons();state.items.forEach((item,i)=>{if(item.category!=='Оружие'||!item.equipped||!item.details.actionCost)return;const a=attackNumbers(item),old=`<button data-play="spend" data-cost="${esc(item.details.actionCost)}" data-label="${esc(item.name)}">Действие · ${esc(item.details.actionCost)} ОД</button>`;html=html.replace(old,`<button data-tabletop="attack" data-weapon="${i}" ${a.cost===null||state.play.ap<a.cost?'disabled':''}>Атака · ${a.cost??'?'} ОД</button>`);});return html;};
renderFeatBalances=function(){const b=featBalances();return `<div class="feat-balances compact-feat-balances" aria-label="Очки фитов: простые ${b.simple.left}, со штрафом ${b.penalty.left}, эпические ${b.epic.left}"><span class="feat-simple" title="Простые фиты" aria-label="Простые фиты: ${b.simple.left}">${b.simple.left}</span><span aria-hidden="true">/</span><span class="feat-penalty" title="Фиты со штрафом" aria-label="Фиты со штрафом: ${b.penalty.left}">${b.penalty.left}</span><span aria-hidden="true">/</span><span class="feat-epic" title="Эпические фиты" aria-label="Эпические фиты: ${b.epic.left}">${b.epic.left}</span></div>`;};
const beforeCompactSummaryFeats=renderSummaryFeats;
renderSummaryFeats=function(){const html=beforeCompactSummaryFeats(),balances=renderFeatBalances();return html.replace(balances,'').replace('<h3>ФИТЫ</h3>','<h3>ФИТЫ</h3>'+balances);};
renderDamageDialog=function(){if(!damageOpen)return '';return `<dialog id="damage-dialog" class="formula-dialog" aria-labelledby="damage-heading"><div class="toolbar"><h2 id="damage-heading">${names[zone]}</h2><button data-closedamage aria-label="Закрыть ввод урона">×</button></div><label>Урон<input id="hit-damage" aria-label="Урон попадания" type="number" min="1" step="1" inputmode="numeric" autofocus></label><input id="hit-heavy-regen" type="checkbox" hidden ${state.info.heavyRegen?'checked':''}><div id="hit-error" class="formula-error" role="status"></div><div class="dialog-actions"><button data-closedamage>Отмена</button><button data-applyhit>Нанести урон</button></div></dialog>`;};
const beforeModifierRender=render;
render=function(){beforeModifierRender();if(libraryHome)return;if(page===0){const status=document.querySelector('[data-ui-region="status"]>.collapsible-content');if(status){status.insertAdjacentHTML('afterbegin',renderCustomConditions());requestAnimationFrame(()=>refreshPanelLayout());}}
 for(const row of document.querySelectorAll('.skill-list tr[data-skillrow]')){const s=state.skills[+row.dataset.skillrow],b=skillManualBonus(s),effective=row.querySelector('.effective-skill-level');if(effective){const delta=effectiveSkillLevel(s)-s[1];effective.textContent='('+delta+')';}if(b.chance)row.querySelector('.chance')?.insertAdjacentHTML('beforeend',`<small class="manual-skill-chance" title="Ручная поправка шанса">(${b.chance})</small>`);}
 if(conditionEditor){document.querySelector('#view').insertAdjacentHTML('beforeend',renderConditionEditor());document.querySelector('#condition-editor').showModal();}
};
document.addEventListener('cancel',event=>{if(event.target.id==='condition-editor'){conditionEditor=null;conditionDraft=null;}},true);
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.applyformula!==undefined){event.stopImmediatePropagation();try{applySkillBonusEditor(+b.dataset.applyformula);}catch(e){document.querySelector('#skill-bonus-error').textContent=e.message;}return;}
 const action=b.dataset.modifier;if(!action)return;event.stopImmediatePropagation();try{switch(action){
 case 'new-condition':openConditionEditor();break;
 case 'edit-condition':openConditionEditor(b.dataset.conditionId);break;
 case 'toggle-condition':{const c=state.play.customConditions.find(c=>c.id===b.dataset.conditionId);if(c)c.enabled=!c.enabled;save();break;}
 case 'close-condition':conditionEditor=null;conditionDraft=null;break;
 case 'add-condition-effect':readConditionDraft();conditionDraft.modifiers.push({target:'chance:all',op:'add',value:0});break;
 case 'remove-condition-effect':readConditionDraft();conditionDraft.modifiers.splice(+b.dataset.effectIndex,1);break;
 case 'delete-condition':state.play.customConditions=state.play.customConditions.filter(c=>c.id!==conditionEditor);conditionEditor=null;conditionDraft=null;save();break;
 case 'save-condition':{readConditionDraft();const c=validateCustomCondition(conditionDraft),i=state.play.customConditions.findIndex(x=>x.id===c.id);if(i<0)state.play.customConditions.push(c);else state.play.customConditions[i]=c;conditionEditor=null;conditionDraft=null;save();break;}
 }render();}catch(e){const error=document.querySelector('#condition-editor-error');if(error)error.textContent=e.message;else toast(e.message);}
},true);
migrateEffects();render();

function renderFavoriteSkills(){const skills=state.skills.filter(isFavoriteSkill);return skills.length?`<div class="favorite-skill-chances" aria-label="Шансы избранных навыков">${skills.map(s=>`<div><span>${esc(s[0])}</span><strong>${chance(s)===null?'Ошибка':chance(s)+'%'}</strong></div>`).join('')}</div>`:'';}
const beforeFavoriteSummary=renderPlaySummary;
renderPlaySummary=function(){return beforeFavoriteSummary().replace('</div><div class="play-shortcuts">','</div>'+renderFavoriteSkills()+'<div class="play-shortcuts">');};
document.addEventListener('click',event=>{const b=event.target.closest('[data-favorite-skill]');if(!b)return;event.stopImmediatePropagation();toggleFavoriteSkill(+b.dataset.favoriteSkill);save();render();},true);
render();
