/* User-composed psi cards. Source texts stay in the catalog; characters store only choices. */
let psiCardDraft=null;
playPages.splice(playPages.findIndex(p=>p[1]===10)+1,0,['Карточки пси-способностей',11]);
const psiEntry=id=>PSI_CATALOG.find(e=>e.id===id);
function psiCardIndices(values,entry,level,field){return [...new Set(Array.isArray(values)?values:[])].filter(i=>Number.isInteger(i)&&i>=0&&(field==='notes'?i<entry.notes.length:i<entry.rows.length&&Number(entry.rows[i][1])<=level&&!!entry.rows[i][field==='descriptions'?5:6])).sort((a,b)=>a-b);}
function normalizePsiCard(card){
 const entry=psiEntry(card?.abilityId);if(!entry||!psiRanks(entry).some(r=>r.level===card.level))return null;
 return {id:typeof card.id==='string'&&card.id?card.id:crypto.randomUUID(),abilityId:entry.id,level:card.level,descriptions:psiCardIndices(card.descriptions,entry,card.level,'descriptions'),feats:psiCardIndices(card.feats,entry,card.level,'feats'),notes:psiCardIndices(card.notes,entry,card.level,'notes'),showAp:card.showAp===true,showEp:card.showEp===true,showType:card.showType===true,favorite:card.favorite===true};
}
function migratePsiCards(){
 const ids=new Set();state.play.psiCards=(Array.isArray(state.play.psiCards)?state.play.psiCards:[]).map(normalizePsiCard).filter(c=>c&&!ids.has(c.id)&&ids.add(c.id));
}
function newPsiCard(abilityId){
 const entry=psiEntry(abilityId);if(!entry)throw Error('Сначала выберите пси-способность.');
 const ranks=psiRanks(entry),skill=psiSkill(entry),level=ranks.filter(r=>r.level<=(skill?effectiveSkillLevel(skill):1)).at(-1)?.level||ranks[0].level;
 const card={id:crypto.randomUUID(),abilityId,level,descriptions:[],feats:[],notes:[],showAp:true,showEp:true,showType:true,favorite:false};defaultPsiDescriptions(card);return card;
}
function defaultPsiDescriptions(card){const e=psiEntry(card.abilityId),indices=e.rows.map((r,i)=>r[5]&&Number(r[1])<=card.level?i:-1).filter(i=>i>=0);card.descriptions=[...new Set([indices[0],indices.at(-1)].filter(i=>i!==undefined))];}
function savePsiCard(card){const clean=normalizePsiCard(card);if(!clean)throw Error('Выберите способность и её уровень.');const index=state.play.psiCards.findIndex(c=>c.id===clean.id);if(index<0)state.play.psiCards.push(clean);else state.play.psiCards[index]=clean;return clean;}
function psiCreateButton(id){return `<button class="psi-compose-button" data-psi-card-create="${esc(id)}">Создать карточку</button>`;}
function composedPsiCard(card,preview=false){
 const entry=psiEntry(card.abilityId),rank=psiRanks(entry).find(r=>r.level===card.level);
 return `<article class="composed-psi-card" data-psi-card-id="${esc(card.id)}"><div class="composed-psi-costs"><span>${card.showAp?'ОД <b>'+esc(rank.ap||'—')+'</b>':''}</span><span>${card.showType?esc(rank.type):''}</span><span>${card.showEp?'EP <b>'+esc(rank.ep||'—')+'</b>':''}</span></div><div class="composed-psi-title"><h3>${esc(entry.title)}</h3><small>ур. ${card.level}</small></div><div class="composed-psi-descriptions">${card.descriptions.map(i=>'<p class="rule-text">'+esc(entry.rows[i][5])+'</p>').join('')}</div>${card.notes.map(i=>'<p class="rule-text muted">'+esc(entry.notes[i])+'</p>').join('')}${card.feats.length?'<div class="composed-psi-feats">'+card.feats.map(i=>'<p class="rule-text">'+esc(entry.rows[i][6])+'</p>').join('')+'</div>':''}${preview?'':`<div class="composed-psi-controls"><button data-psi-card-favorite="${esc(card.id)}" aria-pressed="${card.favorite}" aria-label="Показывать в обзоре: ${esc(entry.title)}">${card.favorite?'★':'☆'} Обзор</button><button data-psi-card-edit="${esc(card.id)}" aria-label="Настроить карточку: ${esc(entry.title)}">⚙</button><button data-psi-card-delete="${esc(card.id)}" aria-label="Удалить карточку: ${esc(entry.title)}">×</button></div>`}</article>`;
}
function renderPsiCardsPage(){return `<section class="panel psi-composed-panel">${playHeading('ВАШИ КАРТОЧКИ','Карточки пси-способностей','<button data-psi-card-action="new">+ Карточка</button>')}<div class="psi-cards">${state.play.psiCards.length?state.play.psiCards.map(c=>composedPsiCard(c)).join(''):'<p class="empty-state">Создайте карточку из выбранной пси-способности. Отметьте ★, чтобы показать её в обзоре.</p>'}</div></section>`;}
function renderPsiFavorites(){const cards=state.play.psiCards?.filter(c=>c.favorite)||[];return cards.length?`<section class="panel psi-favorites-panel" data-ui-region="psi-cards"><div class="section-heading"><h2>Пси-карточки</h2><button data-page="11">Все карточки →</button></div><div class="psi-cards">${cards.map(c=>composedPsiCard(c)).join('')}</div></section>`:'';}
function psiCardFieldChoices(){
 const d=psiCardDraft,e=psiEntry(d.abilityId),ranks=psiRanks(e);
 const checks=(field,label,items)=>`<fieldset class="psi-card-checks"><legend>${label}</legend>${items.map(({index,text,level})=>`<label class="check-row"><input type="checkbox" data-psi-card-choice="${field}" value="${index}" ${d[field].includes(index)?'checked':''}><span>${level?'<b>Уровень '+level+'</b>':''}${esc(text)}</span></label>`).join('')||'<p class="muted">Нет дополнительных записей.</p>'}</fieldset>`;
 return `<div class="psi-card-meta-choices">${[['showAp','ОД'],['showType','Тип способности'],['showEp','EP']].map(([key,label])=>`<label class="check-row"><input type="checkbox" data-psi-card-flag="${key}" ${d[key]?'checked':''}>${label}</label>`).join('')}</div>${checks('descriptions','Описание',e.rows.flatMap((r,i)=>r[5]&&Number(r[1])<=d.level?[{index:i,text:r[5],level:ranks[i].level}]:[]))}${checks('feats','Фиты',e.rows.flatMap((r,i)=>r[6]&&Number(r[1])<=d.level?[{index:i,text:r[6]}]:[]))}${e.notes.length?checks('notes','Дополнительная информация',e.notes.map((text,index)=>({index,text}))):''}`;
}
function renderPsiCardEditor(){
 const d=psiCardDraft,entries=selectedPsiAbilities();if(!entries.some(e=>e.id===d.abilityId))entries.push(psiEntry(d.abilityId));
 return `<dialog id="psi-card-dialog" class="formula-dialog psi-card-dialog" aria-labelledby="psi-card-title"><div class="toolbar"><h2 id="psi-card-title">${state.play.psiCards.some(c=>c.id===d.id)?'Настроить пси-карточку':'Создать пси-карточку'}</h2><button data-psi-card-action="cancel" aria-label="Закрыть редактор карточки">×</button></div><div class="psi-card-builder"><div class="psi-card-settings"><div class="fields"><label>Способность<select id="psi-card-ability">${entries.map(e=>`<option value="${e.id}" ${e.id===d.abilityId?'selected':''}>${esc(e.title)} · ${esc(e.section)}</option>`).join('')}</select></label><label>Уровень способности<select id="psi-card-level">${psiRanks(psiEntry(d.abilityId)).map(r=>`<option value="${r.level}" ${r.level===d.level?'selected':''}>${r.level}</option>`).join('')}</select></label></div><div id="psi-card-fields">${psiCardFieldChoices()}</div></div><div class="psi-card-preview-wrap"><h3>Предпросмотр</h3><div id="psi-card-preview">${composedPsiCard(d,true)}</div></div></div><div class="dialog-actions"><button data-psi-card-action="cancel">Отмена</button><button data-psi-card-action="save">Сохранить карточку</button></div></dialog>`;
}
function openPsiCardEditor(id,editing=false){
 migratePsiCards();if(editing){const c=state.play.psiCards.find(c=>c.id===id);if(!c)return;psiCardDraft=structuredClone(c);}else{const e=selectedPsiAbilities().find(e=>e.id===id)||selectedPsiAbilities()[0];if(!e){toast('Сначала выберите пси-способности.');page=10;render();return;}psiCardDraft=newPsiCard(e.id);}render();
}
function closePsiCardEditor(){psiCardDraft=null;document.querySelector('#psi-card-dialog')?.close();render();}
function updatePsiCardPreview(){document.querySelector('#psi-card-preview').innerHTML=composedPsiCard(psiCardDraft,true);}
const beforePsiCardsSave=save,beforePsiCardsRender=render;
save=function(){migratePsiCards();beforePsiCardsSave();};
render=function(){migratePsiCards();beforePsiCardsRender();if(libraryHome){psiCardDraft=null;return;}if(psiCardDraft){document.querySelector('#view').insertAdjacentHTML('beforeend',renderPsiCardEditor());document.querySelector('#psi-card-dialog').showModal();}};
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-psi-card-action],[data-psi-card-create],[data-psi-card-edit],[data-psi-card-favorite],[data-psi-card-delete]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();const d=b.dataset;
 if(d.psiCardCreate!==undefined)return openPsiCardEditor(d.psiCardCreate);
 if(d.psiCardEdit!==undefined)return openPsiCardEditor(d.psiCardEdit,true);
 if(d.psiCardAction==='new')return openPsiCardEditor();
 if(d.psiCardAction==='cancel')return closePsiCardEditor();
 if(d.psiCardAction==='save'){savePsiCard(psiCardDraft);psiCardDraft=null;save();render();return;}
 const c=state.play.psiCards.find(c=>c.id===(d.psiCardFavorite||d.psiCardDelete));if(!c)return;
 if(d.psiCardFavorite)c.favorite=!c.favorite;else state.play.psiCards=state.play.psiCards.filter(x=>x.id!==c.id);save();render();
},true);
document.addEventListener('change',event=>{
 const el=event.target,d=el.dataset;if(!psiCardDraft||!el.closest('#psi-card-dialog'))return;
 if(el.id==='psi-card-ability'){const id=psiCardDraft.id,favorite=psiCardDraft.favorite;psiCardDraft={...newPsiCard(el.value),id,favorite};document.querySelector('#psi-card-level').innerHTML=psiRanks(psiEntry(el.value)).map(r=>`<option value="${r.level}" ${r.level===psiCardDraft.level?'selected':''}>${r.level}</option>`).join('');document.querySelector('#psi-card-fields').innerHTML=psiCardFieldChoices();}
 else if(el.id==='psi-card-level'){psiCardDraft.level=Number(el.value);psiCardDraft=normalizePsiCard(psiCardDraft);defaultPsiDescriptions(psiCardDraft);document.querySelector('#psi-card-fields').innerHTML=psiCardFieldChoices();}
 else if(d.psiCardChoice){const values=psiCardDraft[d.psiCardChoice],index=Number(el.value);psiCardDraft[d.psiCardChoice]=el.checked?[...new Set([...values,index])].sort((a,b)=>a-b):values.filter(i=>i!==index);}
 else if(d.psiCardFlag)psiCardDraft[d.psiCardFlag]=el.checked;
 else return;
 updatePsiCardPreview();
},true);
document.addEventListener('cancel',event=>{if(event.target.id==='psi-card-dialog'){event.preventDefault();closePsiCardEditor();}},true);
render();
