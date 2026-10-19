/* Psi selections reuse pinned rules, so they travel with character exports and cloud saves. */
function buildPsiCatalog(){
 const table=ruleTable('Пси-Навыки'),entries=[];let section='',current=null;
 table.rows.slice(1).forEach((row,index)=>{
  const cells=row.map(v=>v==null?'':String(v));
  if(cells.filter(Boolean).length===1&&cells[0]){section=cells[0];current=null;return;}
  if(/^\d+\s*\./.test(cells[0])){current={id:table.gid+'-'+(index+2),title:cells[0].replace(/^\d+\s*\.\s*/,''),section,rows:[],notes:[],url:ruleLink(table,index+2)};entries.push(current);}
  else if(current&&cells[0])current.notes.push(cells[0]);
  if(current&&cells.slice(1).some(Boolean))current.rows.push(cells);
 });
 return entries;
}
const PSI_CATALOG=buildPsiCatalog();
let psiPickerOpen=false,psiQuery='',psiDiscipline='Все';
playPages.splice(playPages.findIndex(p=>p[1]===6),0,['Пси-способности',10]);
function selectedPsiAbilities(){return PSI_CATALOG.filter(e=>state.play.pinned.includes(e.id));}
function togglePsiAbility(id){
 if(!PSI_CATALOG.some(e=>e.id===id))throw Error('Пси-способность не найдена.');
 if(state.play.pinned.includes(id))state.play.pinned=state.play.pinned.filter(x=>x!==id);else state.play.pinned.push(id);
}
function psiSkill(entry){return state.skills.find(s=>s[0].trim().toLocaleLowerCase('ru')===entry.section.trim().toLocaleLowerCase('ru'));}
function psiRanks(entry){
 let ep='',ap='',type='';return entry.rows.map(row=>{ep=row[2]||ep;ap=row[3]||ap;type=row[4]||type;return {level:Number(row[1]),ep,ap,type,effect:row[5]||'',extra:row[6]||''};});
}
function psiCard(entry){
 const skill=psiSkill(entry),level=skill?effectiveSkillLevel(skill):0,ranks=psiRanks(entry),available=ranks.filter(r=>r.level<=level),current=available.at(-1),first=ranks[0];
 return `<article class="psi-card"><div class="psi-card-heading"><div><small>${esc(entry.section)} · ${skill?'S '+level+' · '+chance(skill)+'%':'Навык не изучен'}</small><h3>${esc(entry.title)}</h3></div><button data-psi-remove="${entry.id}" aria-label="Убрать ${esc(entry.title)}">×</button></div><div class="psi-costs"><span>EP <b>${esc(current?.ep||first?.ep||'—')}</b></span><span>ОД <b>${esc(current?.ap||first?.ap||'—')}</b></span><span>${esc(current?.type||first?.type||'')}</span></div>${current?'':'<p class="psi-unavailable">Нужен уровень навыка '+esc(first?.level||1)+'</p>'}<p class="rule-text">${esc(current?.effect||first?.effect||'')}</p>${entry.notes.length?'<p class="muted">'+esc(entry.notes.join(' · '))+'</p>':''}<details><summary>Все уровни и улучшения</summary><div class="psi-ranks">${ranks.map(r=>`<section class="psi-rank ${r===current?'psi-current-rank':''}"><b>Уровень ${r.level} · EP ${esc(r.ep)} · ОД ${esc(r.ap)}</b><p class="rule-text">${esc(r.effect)}</p>${r.extra?'<p class="psi-upgrade">'+esc(r.extra)+'</p>':''}</section>`).join('')}</div><a href="${entry.url}" target="_blank" rel="noopener">Sacralic ↗</a></details></article>`;
}
function renderPsiPage(){const entries=selectedPsiAbilities(),energy=energyValues();return `<section class="panel psi-panel">${playHeading('EP '+currentEnergy()+' / '+energy.max,'Пси-способности','<button data-psi-action="open">+ Пси-способность</button>')}<div class="psi-cards">${entries.length?entries.map(psiCard).join(''):'<p class="empty-state">Выберите пси-способности из списка Sacralic.</p>'}</div></section>`;}
function filteredPsiAbilities(){return PSI_CATALOG.filter(e=>(psiDiscipline==='Все'||e.section===psiDiscipline)&&[e.title,e.section,...e.notes,...e.rows.flat()].join(' ').toLocaleLowerCase('ru').includes(psiQuery.toLocaleLowerCase('ru').trim()));}
function renderPsiChoices(){const entries=filteredPsiAbilities();return entries.length?entries.map(e=>`<article class="psi-choice"><div><small>${esc(e.section)} · с уровня ${esc(e.rows[0]?.[1]||1)}</small><b>${esc(e.title)}</b><p>${esc(e.rows[0]?.[5]||'')}</p></div><button data-psi-pick="${e.id}" aria-pressed="${state.play.pinned.includes(e.id)}">${state.play.pinned.includes(e.id)?'Выбрано ✓':'Выбрать'}</button></article>`).join(''):'<p class="empty-state">Ничего не найдено.</p>';}
function renderPsiPicker(){return `<dialog id="psi-dialog" class="formula-dialog psi-dialog" aria-labelledby="psi-title"><div class="toolbar"><h2 id="psi-title">Пси-способности Sacralic</h2><button data-psi-action="close" aria-label="Закрыть выбор пси-способностей">×</button></div><div class="psi-filters"><label>Поиск<input id="psi-search" type="search" value="${esc(psiQuery)}" placeholder="Название или эффект"></label><label>Дисциплина<select id="psi-discipline">${['Все',...new Set(PSI_CATALOG.map(e=>e.section))].map(s=>`<option ${s===psiDiscipline?'selected':''}>${esc(s)}</option>`).join('')}</select></label></div><div id="psi-choices">${renderPsiChoices()}</div><div class="dialog-actions"><button data-psi-action="close">Готово</button></div></dialog>`;}
const beforePsiRender=render;
render=function(){beforePsiRender();if(!libraryHome&&page===10&&psiPickerOpen){document.querySelector('#view').insertAdjacentHTML('beforeend',renderPsiPicker());document.querySelector('#psi-dialog').showModal();}};
function closePsiPicker(){psiPickerOpen=false;document.querySelector('#psi-dialog')?.close();render();}
document.addEventListener('click',event=>{const button=event.target.closest('[data-psi-action],[data-psi-pick],[data-psi-remove]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const d=button.dataset;if(d.psiAction==='open'){psiPickerOpen=true;psiQuery='';psiDiscipline='Все';render();}else if(d.psiAction==='close')closePsiPicker();else{togglePsiAbility(d.psiPick||d.psiRemove);save();if(d.psiPick){button.setAttribute('aria-pressed',String(state.play.pinned.includes(d.psiPick)));button.textContent=state.play.pinned.includes(d.psiPick)?'Выбрано ✓':'Выбрать';}else render();}},true);
document.addEventListener('input',event=>{if(event.target.id!=='psi-search')return;psiQuery=event.target.value;document.querySelector('#psi-choices').innerHTML=renderPsiChoices();});
document.addEventListener('change',event=>{if(event.target.id!=='psi-discipline')return;psiDiscipline=event.target.value;document.querySelector('#psi-choices').innerHTML=renderPsiChoices();});
document.addEventListener('cancel',event=>{if(event.target.id==='psi-dialog'){event.preventDefault();closePsiPicker();}},true);
render();
