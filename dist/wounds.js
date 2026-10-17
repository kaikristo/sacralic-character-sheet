/* Compact injury board and layout packing. Damage counters have separate meanings. */
let woundDialog=null,woundHelp=new Map(),packedFocusLabel='',layoutFrame=0;
function totalCharacterDamage(){return Math.max(0,state.info.maxhp-state.info.hp);}
function distributedDamage(){return Number.isSafeInteger(state.info.distributedDamage)&&state.info.distributedDamage>=0?state.info.distributedDamage:0;}
function setDistributedDamage(value){if(!Number.isSafeInteger(value)||value<0)throw Error('Распределённый урон: целое число от 0.');state.info.distributedDamage=value;}
function setCurrentHealth(value){if(!Number.isSafeInteger(value)||value<0||value>state.info.maxhp)throw Error('Укажите целые HP от 0 до '+state.info.maxhp+'.');state.info.hp=value;}
function renderBodyHealth(){return `<div class="body-health" aria-label="Здоровье персонажа"><span>HP</span><button data-wound="current-hp" aria-label="Изменить текущие HP">${state.info.hp.toLocaleString('ru')}</button><span>/</span><button data-openhp aria-label="Изменить формулу максимальных HP">${state.info.maxhp.toLocaleString('ru')}</button><button class="info-dot" data-wound="body-info" aria-label="Справка по здоровью и урону">i</button></div><progress class="body-hp-progress" value="${state.info.hp}" max="${state.info.maxhp||1}" aria-label="Здоровье персонажа"></progress>`;}
renderBodyMap=function(){return `${renderBodyHealth()}<div class="wound-board"><aside class="damage-counters"><div><small>Общий урон</small><strong aria-label="Общий урон">${totalCharacterDamage()}</strong></div><label>Распред. урон<input type="number" min="0" step="1" inputmode="numeric" data-distributed-damage aria-label="Распределённый урон" value="${distributedDamage()}"></label>${state.hitHistory?.length?'<button data-undohit aria-label="Отменить последнее попадание">↶</button>':''}</aside><div class="wound-figure">${renderReferenceBodyMap()}<button class="add-figure-trauma" data-newtrauma>+ Травма</button></div></div>`;};
renderZoneStatus=function(){return '';};
renderTraumas=function(){return state.traumas.length?`<section class="compact-traumas" aria-label="Травмы">${state.traumas.map((t,i)=>`<article><div><b>${esc(t.name)}</b><small>${names[t.zone]}</small>${t.penalty?`<p>${esc(t.penalty)}</p>`:''}</div><button data-edittrauma="${i}" aria-label="Изменить травму: ${esc(t.name)}">⚙</button></article>`).join('')}</section>`:'';};
renderDamageDialog=function(){if(!damageOpen)return '';return `<dialog id="damage-dialog" class="formula-dialog" aria-labelledby="damage-heading"><div class="toolbar"><h2 id="damage-heading">${names[zone]}</h2><button data-closedamage aria-label="Закрыть ввод урона">×</button></div><div class="fields"><label>Урон после брони<input id="hit-damage" aria-label="Урон попадания" type="number" min="1" step="1" inputmode="numeric" autofocus></label><label>Броня зоны<input data-wound-armor type="number" min="0" value="${state.zones[zone].armor}"></label></div><label class="check-row"><input id="hit-heavy-regen" type="checkbox" ${state.info.heavyRegen?'checked':''}>Регенерация тяжёлых повреждений</label><div id="hit-error" class="formula-error" role="status"></div><div class="dialog-actions"><button class="info-dot" data-wound="hit-info" aria-label="Как учитывается урон">i</button><button data-closedamage>Отмена</button><button data-applyhit>Нанести урон</button></div></dialog>`;};
updateHitPreview=function(){};
function renderTraumaSuggestion(index){const injury=injuryFor(index,state.zones[index].damage);return `<div id="trauma-suggestion"><details ${injury.tier?'open':''}><summary>Предполагаемая травма · ${esc(names[index])}</summary>${renderInjury(index,state.zones[index].damage)}${injury.tier?'<button data-wound="use-suggestion">Выбрать эту травму</button>':''}</details></div>`;}
const beforeWoundTraumaDialog=renderTraumaDialog;
renderTraumaDialog=function(){const html=beforeWoundTraumaDialog();return traumaOpen&&traumaEdit<0?html.replace('<label>Готовая травма',renderTraumaSuggestion(zone)+'<label>Готовая травма'):html;};
function renderWoundDialog(){if(!woundDialog)return '';const current=woundDialog.kind==='hp';return `<dialog id="wound-dialog" class="formula-dialog" aria-labelledby="wound-dialog-title"><div class="toolbar"><h2 id="wound-dialog-title">${current?'Текущие HP':esc(woundDialog.title)}</h2><button data-wound="close" aria-label="Закрыть подробности">×</button></div>${current?`<label>Текущие HP<input id="wound-current-hp" type="number" min="0" max="${state.info.maxhp}" step="1" inputmode="numeric" value="${state.info.hp}" autofocus></label>`:woundDialog.html}<p id="wound-dialog-error" class="formula-error" role="status"></p>${current?'<div class="dialog-actions"><button data-wound="close">Отмена</button><button data-wound="save-hp">Сохранить HP</button></div>':''}</dialog>`;}
function collectPanelHelp(){
 woundHelp=new Map();let i=0;
 for(const p of document.querySelectorAll('#view .help-copy, #view .point-cost-note, #view .formula-hint')){
  if(p.closest('dialog')||p.closest('.bonus-breakdown')||p.closest('.attack-card details'))continue;
  const panel=p.closest('.panel, .overview-tactics, .summary-feats, .movement-panel');if(!panel)continue;
  let key=panel.dataset.woundHelp;if(!key){key=String(i++);panel.dataset.woundHelp=key;}
  woundHelp.set(key,(woundHelp.get(key)||'')+p.outerHTML);p.remove();
 }
 for(const panel of document.querySelectorAll('[data-wound-help]')){const head=panel.querySelector('.section-heading,.play-heading');if(head&&!head.querySelector('[data-wound="panel-info"]'))head.insertAdjacentHTML('beforeend',`<button class="info-dot" data-wound="panel-info" data-help-key="${panel.dataset.woundHelp}" aria-label="Подсказки: ${esc(panel.querySelector('h2,h3')?.textContent.replace(/[▾▸]/g,'').trim()||'панель')}">i</button>`);}
}
function packColumns(heights,capacity,gap=8){const columns=[];for(let i=0;i<heights.length;i++){let c=columns.find(x=>x.used+(x.items.length?gap:0)+heights[i]<=capacity+.5);if(!c){c={items:[],used:0};columns.push(c);}c.used+=(c.items.length?gap:0)+heights[i];c.items.push(i);}return columns;}
function packMobileOverview(focus){
 const grid=document.querySelector('.overview-deck');if(!grid)return;
 const cards=[...grid.querySelectorAll(':scope > .overview-slide, :scope > .overview-page > .overview-slide')];if(!cards.length)return;cards.forEach((c,i)=>c.dataset.packOrder??=String(i));cards.sort((a,b)=>Number(a.dataset.packOrder)-Number(b.dataset.packOrder));
 const scrollPositions=new Map(cards.map(c=>[c,c.scrollTop]));
 const focusCard=focus?.closest?.('.overview-slide'),label=focusCard?.dataset.slideLabel||packedFocusLabel;
 const width=grid.clientWidth,height=Math.max(280,innerHeight-grid.getBoundingClientRect().top-8);grid.style.height=height+'px';
 for(const card of cards){grid.append(card);card.style.width=width+'px';card.style.maxHeight=height+'px';card.style.height='auto';card.style.alignSelf='start';card.classList.add('packed-card');if(card.classList.contains('left-sheet')&&!card.querySelector('.skills-panel')?.classList.contains('panel-collapsed'))card.style.height=height+'px';}
 for(const old of grid.querySelectorAll(':scope > .overview-page'))old.remove();
 const heights=cards.map(c=>Math.min(height,Math.ceil(c.getBoundingClientRect().height))),columns=packColumns(heights,height);
 for(const col of columns){const wrapper=document.createElement('div');wrapper.className='overview-page';for(const i of col.items){cards[i].style.height=heights[i]+'px';wrapper.append(cards[i]);}grid.append(wrapper);}
 const nav=document.querySelector('.overview-deck-nav'),selected=Math.max(0,columns.findIndex(c=>c.items.some(i=>cards[i].dataset.slideLabel===label)));mobileOverviewSlide=selected;
 if(nav){nav.innerHTML=columns.map((c,i)=>`<button data-tabletop="slide" data-slide="${i}" aria-label="Панель ${c.items.map(n=>cards[n].dataset.slideLabel).join(', ')}" aria-pressed="${i===selected}">${i+1}</button>`).join('');}
 grid.scrollLeft=(width+8)*selected;
 for(const card of cards)card.scrollTop=scrollPositions.get(card)||0;
 if(!grid.dataset.packedScroll){grid.dataset.packedScroll='true';grid.addEventListener('scroll',()=>{const i=Math.round(grid.scrollLeft/(grid.clientWidth+8)),p=grid.children[i];packedFocusLabel=p?.querySelector('.overview-slide')?.dataset.slideLabel||packedFocusLabel;},{passive:true});}
}
function masonryPanels(grid){
 const children=[...grid.children];for(const col of children.filter(e=>e.classList.contains('play-column'))){for(const child of [...col.children])grid.append(child);col.remove();}
 const cards=[...grid.children].filter(c=>c.classList.contains('panel'));if(!cards.length)return;
 grid.classList.add('compact-masonry');const width=grid.clientWidth,columns=width>=1050?3:width>=620?2:1,gap=12,cardWidth=(width-gap*(columns-1))/columns,heights=Array(columns).fill(0);
 for(const card of cards){card.style.position='absolute';card.style.width=cardWidth+'px';card.style.maxHeight='';card.style.height='auto';const col=heights.indexOf(Math.min(...heights));card.style.left=col*(cardWidth+gap)+'px';card.style.top=heights[col]+'px';heights[col]+=card.getBoundingClientRect().height+gap;}
 grid.style.height=Math.max(...heights)-gap+'px';
}
function refreshPanelLayout(focus){if(libraryHome)return;if(window.matchMedia('(max-width:700px)').matches&&page===0){packMobileOverview(focus);return;}for(const grid of document.querySelectorAll('#view>.grid, #view .play-grid'))masonryPanels(grid);}
const beforeWoundRender=render;
render=function(){beforeWoundRender();if(libraryHome)return;collectPanelHelp();requestAnimationFrame(()=>refreshPanelLayout());if(woundDialog){document.querySelector('#view').insertAdjacentHTML('beforeend',renderWoundDialog());document.querySelector('#wound-dialog').showModal();}};
document.addEventListener('change',event=>{
 if(event.target.matches('[data-distributed-damage]')){event.stopImmediatePropagation();try{setDistributedDamage(Number(event.target.value));save();}catch(e){toast(e.message);event.target.value=distributedDamage();}return;}
 if(event.target.matches('[data-wound-armor]')){const value=Number(event.target.value);if(Number.isFinite(value)&&value>=0){state.zones[zone].armor=value;save();}return;}
 if(event.target.id==='trauma-zone'&&traumaOpen&&traumaEdit<0){const el=document.querySelector('#trauma-suggestion');if(el)el.outerHTML=renderTraumaSuggestion(Number(event.target.value));}
},true);
document.addEventListener('cancel',event=>{if(event.target.id==='wound-dialog'){woundDialog=null;event.target.remove();}},true);
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-wound]');if(!b)return;event.stopImmediatePropagation();const action=b.dataset.wound;
 if(action==='save-hp'){try{setCurrentHealth(Number(document.querySelector('#wound-current-hp').value));woundDialog=null;save();render();}catch(e){document.querySelector('#wound-dialog-error').textContent=e.message;}return;}
 if(action==='close'){woundDialog=null;document.querySelector('#wound-dialog')?.remove();return;}
 if(action==='current-hp')woundDialog={kind:'hp'};
 if(action==='panel-info')woundDialog={kind:'help',title:'Подсказки',html:woundHelp.get(b.dataset.helpKey)||''};
 if(action==='body-info')woundDialog={kind:'help',title:'Здоровье и урон',html:'<p>Нажмите текущие HP, чтобы изменить их, или максимальные — чтобы открыть формулу.</p><p>Общий урон = максимальные HP − текущие HP. Распределённый урон — отдельный ручной счётчик: он не изменяет HP и урон зон.</p><p>Числа на фигуре — урон конкретной зоны. Его изменение корректирует HP. Для нового попадания нажмите часть тела. Травма добавляется отдельной кнопкой.</p>'};
 if(action==='hit-info')woundDialog={kind:'help',title:'Попадание',html:'<p>Введите урон после учёта брони: он прибавится к урону выбранной зоны и вычтется из HP. Возможные травмы открываются через «+ Травма».</p>'};
 if(action==='use-suggestion'){const i=Number(document.querySelector('#trauma-zone').value),injury=injuryFor(i,state.zones[i].damage);document.querySelector('#trauma-name').value=injury.title;document.querySelector('#trauma-penalty').value=injury.text+' '+injury.check;return;}
 if(woundDialog){document.querySelector('#view').insertAdjacentHTML('beforeend',renderWoundDialog());document.querySelector('#wound-dialog').showModal();}
},true);
document.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS'&&!event.target.closest('dialog')){cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>refreshPanelLayout(event.target));}},true);
window.addEventListener?.('resize',()=>{cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>refreshPanelLayout());});
render();

// Reuse the native cancel lifecycle so a dismissed dialog stays closed after rendering.
let backdropPress=null;
function isDialogBackdrop(event){const dialog=event.target;if(dialog?.tagName!=='DIALOG'||!dialog.open)return false;const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;}
function dismissDialogBackdrop(dialog){const cancel=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(cancel)&&dialog.open)dialog.close();}
document.addEventListener('pointerdown',event=>{backdropPress=isDialogBackdrop(event)?event.target:null;},true);
document.addEventListener('pointercancel',()=>{backdropPress=null;},true);
document.addEventListener('click',event=>{const dialog=backdropPress;backdropPress=null;if(dialog&&event.target===dialog&&isDialogBackdrop(event)){event.preventDefault();event.stopImmediatePropagation();dismissDialogBackdrop(dialog);}},true);
