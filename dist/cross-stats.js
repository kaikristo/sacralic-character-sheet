/* Explicit requested cross-stat unlocks. Stat checks are dynamic, including equipment and manual bonuses. */
let crossDialog=null,crossResult='';
function crossRule(codes){return RULE_ENTRIES.find(e=>e.category==='Кросс-бонусы'&&e.threshold===21&&e.stats?.length===2&&codes.every(c=>e.stats.includes(c)));}
function crossActive(codes){const e=crossRule(codes);return !!e&&sourceConfig(e.id).enabled!==false&&codes.every(c=>statTotal(c)>=21);}
function isMindResistanceSkill(skill){return [skill?.[0],skill&&skillEffectName(skill)].some(name=>['стойкостьразума','псистойкость'].includes(effectNorm(name)));}
function crossChanceSpec(source,label,key){const id=source.id+'/'+key,a=state.effects.adjustments[id]||{};return {id,sourceId:source.id,source:source.title,url:source.url,label,op:'add',value:Number.isFinite(a.value)?a.value:10,enabled:a.enabled!==false,manual:Number.isFinite(a.value)};}
const beforeCrossApplicable=applicableEffects;
applicableEffects=function(target,context={}){const lines=beforeCrossApplicable(target,context),skill=context.skill;if(!skill||target!=='chance:'+skillIdentity(skill))return lines;
 if(context.mode!=='defense'&&(combatKey(skill)?.startsWith('Ближний бой')||/холодн.*оруж/i.test(skillEffectName(skill)))&&crossActive(['STR','INT']))lines.push(crossChanceSpec(crossRule(['STR','INT']),'STR 21 + INT 21: ближний бой','meleeChance'));
 if(isMindResistanceSkill(skill)&&crossActive(['INT','CON']))lines.push(crossChanceSpec(crossRule(['INT','CON']),'INT 21 + CON 21: стойкость разума','mindChance'));
 return lines;
};
psiResistance=function(){const skill=state.skills.find(isMindResistanceSkill);return skill?chance(skill):statTotal('INT');};
const CROSS_GAZE_ACTION={id:'charming-gaze',period:'day',limit:1};
function crossGazeRemaining(){const e=crossRule(['CHA','ACC']);return e?Math.max(0,1-abilityUses(e,CROSS_GAZE_ACTION)):0;}
function rerollIncomingZone(original,roll=randomDie(6)){
 if(!crossActive(['CON','RTC']))throw Error('Нужны CON 21 и RTC 21.');if(!Number.isInteger(original)||original<0||original>5||!Number.isInteger(roll)||roll<1||roll>6)throw Error('Укажите исходную зону и корректный d6.');
 const next=[4,5,1,0,2,3][roll-1];spendAction(1,'Переброс зоны попадания');const result={original,roll,zone:next,round:state.play.round};abilityState().crossZoneResult=result;
 crossResult='Переброс зоны: '+names[original]+' → d6 = '+roll+' → '+names[next]+' · 1 ОД';state.log.unshift(crossResult);state.log=state.log.slice(0,100);return result;
}
function useCharmingGaze(target,cha){
 if(!crossActive(['CHA','ACC']))throw Error('Нужны CHA 21 и ACC 21.');if(!Number.isFinite(cha)||cha<0||cha>=statTotal('CHA'))throw Error('CHA цели должна быть ниже вашей CHA ('+statTotal('CHA')+').');
 const source=crossRule(['CHA','ACC']);if(!crossGazeRemaining())throw Error('Очаровывающий взгляд уже использован в эти игровые сутки.');
 spendAction(0,'Очаровывающий взгляд');markAbilityUse(source,CROSS_GAZE_ACTION);aggressiveAbilityAction();
 crossResult='Очаровывающий взгляд: '+(String(target||'').trim()||'цель')+' теряет раунд без спасброска · атакующее воздействие на разум · 0 ОД';state.log.unshift(crossResult);state.log=state.log.slice(0,100);return crossResult;
}
function renderCrossAbilities(){
 const zoneActive=crossActive(['CON','RTC']),gazeActive=crossActive(['CHA','ACC']),passives=[['STR','INT','Ближний бой'],['INT','CON','Стойкость разума']].filter(([a,b])=>crossActive([a,b]));if(!zoneActive&&!gazeActive&&!passives.length)return '';
 return `<section class="cross-stat-abilities"><h3>Кросс-бонусы</h3>${passives.map(([a,b,label])=>`<details><summary>${esc(label)} (10%)</summary><p>${a} 21 + ${b} 21: абсолютный бонус к шансу. <a href="${crossRule([a,b]).url}" target="_blank" rel="noopener">Источник ↗</a></p></details>`).join('')}${zoneActive?`<article><b>Переброс зоны попадания</b><small>CON 21 · RTC 21</small><button data-cross-action="zone">Перебросить зону · 1 ОД</button><details><summary>Правило</summary><p>${esc(crossRule(['CON','RTC']).text)}</p><a href="${crossRule(['CON','RTC']).url}" target="_blank" rel="noopener">Источник ↗</a></details></article>`:''}${gazeActive?`<article><b>Очаровывающий взгляд</b><small>CHA 21 · ACC 21</small><button data-cross-action="gaze" ${crossGazeRemaining()?'':'disabled'}>Применить · 0 ОД · ${crossGazeRemaining()}/1</button><button data-ability="reset" data-period="day">Новые сутки</button><details><summary>Правило</summary><p>Один раз в сутки. Цель с меньшей CHA теряет раунд без спасброска. Атакующее воздействие на разум.</p><a href="${crossRule(['CHA','ACC']).url}" target="_blank" rel="noopener">Источник ↗</a></details></article>`:''}${crossResult?'<p class="cross-action-result" role="status">'+esc(crossResult)+'</p>':''}</section>`;
}
const beforeCrossConditions=renderCustomConditions,beforeCrossAbilityPanel=renderAbilityPanel,beforeCrossBodyMap=renderBodyMap;
renderCustomConditions=function(){return beforeCrossConditions()+renderCrossAbilities();};
renderAbilityPanel=function(){return beforeCrossAbilityPanel()+(page===5?'<section class="panel cross-ability-panel"><div class="section-heading"><h2>Кросс-способности</h2></div>'+renderCrossAbilities()+'</section>':'');};
renderBodyMap=function(){return beforeCrossBodyMap()+(crossActive(['CON','RTC'])?'<button class="zone-reroll-button" data-cross-action="zone">Переброс зоны · 1 ОД</button>':'');};
function renderCrossDialog(){if(!crossDialog)return '';const zoneMode=crossDialog.kind==='zone',result=crossDialog.result;
 return `<dialog id="cross-dialog" class="formula-dialog" aria-labelledby="cross-dialog-title"><div class="toolbar"><h2 id="cross-dialog-title">${zoneMode?'Переброс зоны попадания':'Очаровывающий взгляд'}</h2><button data-cross-action="close" aria-label="Закрыть кросс-способность">×</button></div>${zoneMode?`<label>Исходная зона<select id="cross-zone" ${result?'disabled':''}>${names.map((name,i)=>`<option value="${i}" ${i===crossDialog.original?'selected':''}>${name}</option>`).join('')}</select></label><p>Один переброс текущего входящего попадания. Уже нанесённый урон не перемещается.</p>${result?`<p class="cross-action-result">d6 = ${result.roll} · ${esc(names[result.zone])}</p><button data-cross-action="apply-zone">Указать урон в этой зоне</button>`:''}`:`<label>Имя цели<input id="cross-target" maxlength="160" placeholder="Цель"></label><label>CHA цели<input id="cross-target-cha" type="number" min="0" step="1"></label><p>Ваша CHA: ${statTotal('CHA')}. Цель с меньшей CHA теряет раунд без спасброска. Одно применение в игровые сутки.</p>`}<p id="cross-error" class="formula-error" role="status"></p><div class="dialog-actions"><button data-cross-action="close">Закрыть</button>${result?'':`<button data-cross-action="${zoneMode?'roll-zone':'use-gaze'}">${zoneMode?'Перебросить d6 · 1 ОД':'Применить · 0 ОД'}</button>`}</div></dialog>`;
}
function closeCrossDialog(){crossDialog=null;document.querySelector('#cross-dialog')?.remove();}
const beforeCrossRender=render;
render=function(){beforeCrossRender();if(libraryHome){crossDialog=null;crossResult='';return;}if(crossDialog){document.querySelector('#view').insertAdjacentHTML('beforeend',renderCrossDialog());document.querySelector('#cross-dialog').showModal();}};
document.addEventListener('click',event=>{const b=event.target.closest('[data-cross-action]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();const action=b.dataset.crossAction;
 if(action==='close')return closeCrossDialog();
 if(action==='zone'||action==='gaze'){crossDialog=action==='zone'?{kind:'zone',original:zone}:{kind:'gaze'};render();return;}
 try{if(action==='roll-zone'){if(crossDialog?.result)return;crossDialog.original=Number(document.querySelector('#cross-zone').value);crossDialog.result=rerollIncomingZone(crossDialog.original);save();render();}
 if(action==='apply-zone'){if(!crossDialog?.result)return;zone=crossDialog.result.zone;crossDialog=null;healthBoardOpen=true;damageOpen=true;render();}
 if(action==='use-gaze'){const raw=document.querySelector('#cross-target-cha').value.trim();if(!raw)throw Error('Укажите CHA цели.');useCharmingGaze(document.querySelector('#cross-target').value,Number(raw));closeCrossDialog();save();render();toast(crossResult);}
 }catch(error){const el=document.querySelector('#cross-error');if(el)el.textContent=error.message;else toast(error.message);}
},true);
document.addEventListener('cancel',event=>{if(event.target.id==='cross-dialog'){event.preventDefault();closeCrossDialog();}},true);
render();
