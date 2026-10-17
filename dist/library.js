/* Character selection and portraits. All persistent writes are queued snapshots. */
let characterStore=new CharacterStore();
let libraryReady=false,libraryHome=true,activeCharacterId=null,characterRecords=[],portraitUrls=new Map(),libraryModal=null,libraryBusy=false,libraryTrash=false,persistQueue=Promise.resolve(),libraryFailure='';
const beforeLibrarySave=save,beforeLibraryRender=render;
const movementDefaults={walkFormula:'WALKBASE',runFormula:'RUNBASE',jumpFormula:'2 * RUN + DEX / 10',walkBonus:0,runBonus:0,jumpBonus:0};
function migrateMovement(){if(!state.play.movement||typeof state.play.movement!=='object'||Array.isArray(state.play.movement))state.play.movement={};for(const [key,value] of Object.entries(movementDefaults)){const old=state.play.movement[key];if(typeof old!==typeof value||typeof value==='number'&&!Number.isFinite(old))state.play.movement[key]=value;}}
function movementValues(config=state.play.movement){
 const vars=Object.fromEntries(state.stats.map(s=>[s[1],statTotal(s[1])]));Object.assign(vars,{WALKBASE:state.play.walk,RUNBASE:state.play.run,LVL:state.info.level,AGL:statTotal('DEX'),RCT:statTotal('RTC')});
 try{const walk=calculateFormula(config.walkFormula,vars)+config.walkBonus;vars.WALK=walk;const run=calculateFormula(config.runFormula,vars)+config.runBonus;vars.RUN=run;const jump=Math.floor(calculateFormula(config.jumpFormula,vars)+config.jumpBonus);if([walk,run,jump].some(n=>!Number.isFinite(n)||n<0))throw Error('Скорость и прыжок должны быть неотрицательными.');return {walk,run,jump,error:''};}catch(error){return {walk:null,run:null,jump:null,error:error.message};}
}
function renderMovementMetrics(){const m=movementValues(),ap=state.play.ap;return `<section class="movement-panel"><div class="section-heading"><h3>ДВИЖЕНИЕ</h3><button data-library="movement" aria-label="Настроить формулы движения">⚙ Формулы</button></div>${m.error?`<p class="formula-error">${esc(m.error)}</p>`:`<div class="play-summary movement-metrics">${metric('Шаг',m.walk,'клеток / 1 ОД')}${metric('Бег',m.run,'клеток / 1 ОД')}${metric('Прыжок',m.jump,'клеток / 2 ОД')}</div><p class="help-copy">На оставшиеся ${ap} ОД: шаг ${Math.round(ap*m.walk*100)/100} клеток · бег ${Math.round(ap*m.run*100)/100} клеток · ${Math.floor(ap/2)} прыжков (${Math.floor(ap/2)*m.jump} клеток).</p>`}<details><summary>Формулы и ограничения</summary><p class="help-copy">Шаг: ${esc(state.play.movement.walkFormula)} (${state.play.movement.walkBonus}); бег: ${esc(state.play.movement.runFormula)} (${state.play.movement.runBonus}); прыжок: ${esc(state.play.movement.jumpFormula)} (${state.play.movement.jumpBonus}), округление вниз. WALKBASE / RUNBASE — значения из параметров боя. Выбранные расовые модификаторы применяются автоматически. Травмы, броня и общие условия учитываются вручную.</p></details></section>`;}
function renderSummaryFeats(){const feats=state.play.pinned.map(id=>RULE_ENTRIES.find(e=>e.id===id)).filter(e=>e&&['Простые фиты','Эпик'].includes(e.category));return `<section class="summary-feats"><div class="section-heading"><h3>ФИТЫ</h3><button data-library="feats">+ Выбрать</button></div>${feats.length?feats.map(e=>`<details><summary>${esc(e.title)} <small>${e.category==='Эпик'?'эпический':'простой'}</small></summary><p>${esc(e.text)}</p></details>`).join(''):'<p class="help-copy">Выберите свои фиты в справочнике звёздочкой — они появятся здесь.</p>'}</section>`;}
function resetCharacterUi(){page=0;zone=0;filter='Все';formulaOpen=-1;skillCreateOpen=false;damageOpen=false;skillCatalogOpen=false;itemOpen=false;itemEdit=-1;statEdit=-1;levelOpen=false;hpOpen=false;traumaOpen=false;scaleOpen=false;combatInfo=-1;playDialog=null;rollResult=null;referenceQuery='';referenceCategory='Все';for(const key of Object.keys(playDraft))playDraft[key]=key==='delta'?'10':key==='action-cost'?'1':key==='roll-mode'?'normal':key==='armor-damage'?'100':key.includes('name')||key==='journal-text'?'':'0';}
function prepareCharacter(data){state=migrateCharacter(validateCharacterData(data));migrateProgression();migrateAllocation();migratePlay();migrateUi();migrateMovement();applyUiScales();syncMaxHp();}
function createBlankCharacter(name,race,player){
 const data=structuredClone(initial);Object.assign(data.info,{name:name.trim()||'Новый персонаж',race:race.trim()||'Человек',player:player.trim(),level:1,height:0,weight:0,mutation:0,money:0,hp:48,maxhp:48,notes:'',xp:0,freeStats:0,freeSkills:3,hpFormula:'(2 + lvl) * CON * модификатор',hpModifier:2});
 data.stats.forEach((s,i)=>{s[2]=[10,10,8,8,6,6,4,4][i];s[3]=0;});data.skills=[];data.items=[];data.zones=Array.from({length:6},()=>({armor:0,damage:0,note:''}));data.log=[];return data;
}
function storageFailure(error){libraryFailure=error?.message||'Не удалось записать библиотеку';const saved=document.querySelector('#saved');if(saved)saved.textContent='⚠ Не сохранено в библиотеке';toast('Ошибка хранилища: '+libraryFailure+'. Экспортируйте JSON.');}
save=function(){
 if(!libraryReady||libraryHome)return;
 migrateMovement();if(!characterStore.cloudTracking)beforeLibrarySave();else syncMaxHp();const old=characterRecords.find(r=>r.id===activeCharacterId);if(!old)return;
 const record={...old,data:structuredClone(state),updatedAt:new Date().toISOString()};characterRecords=characterRecords.map(r=>r.id===record.id?record:r);
 document.querySelector('#saved').textContent='Сохранение…';
 persistQueue=persistQueue.catch(()=>{}).then(()=>characterStore.put(record)).then(()=>{libraryFailure='';document.querySelector('#saved').textContent='✓ Сохранено в библиотеке';});persistQueue.catch(storageFailure);
};
function portraitMarkup(data,css=''){const url=portraitUrls.get(data.info.portraitId);return url?`<img class="${css}" src="${url}" alt="Портрет: ${esc(data.info.name)}">`:`<span class="portrait-placeholder ${css}" aria-hidden="true">${esc((data.info.name.trim()||'?').slice(0,1).toUpperCase())}</span>`;}
function renderCharacterLibrary(){
 const records=characterRecords.filter(r=>libraryTrash?!!r.deletedAt:!r.deletedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 return `<section class="character-library"><div class="library-heading"><div><div class="tag">SACRALIC / ВАША КАМПАНИЯ</div><h1>${libraryTrash?'Корзина':'Персонажи'}</h1><p>Выберите персонажа или создайте новое личное дело.</p></div><div class="play-shortcuts"><button data-library="import">↑ Импорт JSON</button><button data-library="export-all">↓ Вся библиотека</button><button data-library="trash">${libraryTrash?'← Персонажи':'Корзина'}</button></div></div>${libraryFailure?`<p class="danger-copy">${esc(libraryFailure)}</p>`:''}<div class="character-cards">${records.map(r=>`<article class="character-card"><button class="character-open" data-library="${libraryTrash?'restore':'open'}" data-id="${r.id}" aria-label="${libraryTrash?'Восстановить':'Открыть'} ${esc(r.data.info.name)}"><div class="character-cover">${portraitMarkup(r.data)}</div><div class="character-card-info"><small>${esc(r.data.info.race)} · уровень ${r.data.info.level}</small><h2>${esc(r.data.info.name)}</h2><span>${r.data.info.hp} / ${r.data.info.maxhp} HP${r.data.info.player?' · '+esc(r.data.info.player):''}</span></div></button><div class="character-card-actions"><small>${libraryTrash?'Восстановление по нажатию':'Обновлён '+new Date(r.updatedAt).toLocaleDateString('ru-RU')}</small>${libraryTrash?'':`<button data-library="archive" data-id="${r.id}" aria-label="В корзину: ${esc(r.data.info.name)}">В корзину</button>`}</div></article>`).join('')}${libraryTrash?'':`<button class="character-card new-character-card" data-library="new" aria-label="Создать нового персонажа"><span>+</span><h2>Новый персонаж</h2><small>Создать личное дело</small></button>`}</div><p class="library-storage-note">Персонажи и портреты хранятся в этом браузере (IndexedDB). JSON содержит данные и изображения для переноса на другое устройство.</p></section>`;
}
function renderLibraryDialog(){
 if(!libraryModal)return '';let title='',body='';
 if(libraryModal==='new'){title='Новый персонаж';body=`<label>Имя персонажа<input id="new-character-name" maxlength="160" placeholder="Имя героя" autofocus></label><label>Раса<input id="new-character-race" value="Человек" list="race-options"></label><datalist id="race-options">${RULE_ENTRIES.filter(e=>e.category==='Расы').map(e=>`<option value="${esc(e.title)}">`).join('')}</datalist><label>Имя игрока<input id="new-character-player" maxlength="160"></label><p class="help-copy">1 уровень, 3 свободных очка навыков. Стартовый набор характеристик: 10, 10, 8, 8, 6, 6, 4, 4. Портрет можно добавить после создания.</p>`;}
 if(libraryModal==='portrait'){title='Портрет персонажа';body=`<div class="portrait-editor-preview">${portraitMarkup(state)}</div><button data-library="upload-portrait">Загрузить изображение</button>${state.info.portraitId?'<button data-library="remove-portrait">Убрать портрет</button>':''}<p class="help-copy">PNG, JPG, WebP или GIF до 10 МБ. Портрет сохраняется вместе с персонажем и включается в JSON.</p>`;}
 if(libraryModal==='movement'){title='Формулы движения';const m=state.play.movement;body=`<div class="movement-editor">${[['walk','Шаг'],['run','Бег'],['jump','Прыжок']].map(([key,label])=>`<label>${label} · формула<input id="movement-${key}" value="${esc(m[key+'Formula'])}" maxlength="500"></label><label>Бонус ${label.toLowerCase()}<input id="movement-${key}-bonus" type="number" value="${m[key+'Bonus']}"></label>`).join('')}</div><p class="help-copy">Переменные: STR, DEX (AGL), CON, RTC, ACC, INT, LCK, CHA, LVL, WALKBASE, RUNBASE. В формуле бега доступен WALK; в прыжке — WALK и RUN. Прыжок округляется вниз, стоит 2 ОД. Бонус добавляется после формулы.</p>`;}
 return `<dialog id="library-dialog" class="formula-dialog" aria-labelledby="library-dialog-title"><div class="toolbar"><h2 id="library-dialog-title">${title}</h2><button data-library="close-modal" aria-label="Закрыть окно библиотеки">×</button></div>${body}<p id="library-dialog-error" class="formula-error" role="status"></p><div class="dialog-actions"><button data-library="close-modal">Отмена</button>${libraryModal==='portrait'?'':`<button data-library="${libraryModal==='new'?'create':'save-movement'}">${libraryModal==='new'?'Создать персонажа':'Применить'}</button>`}</div></dialog>`;
}
render=function(){
 document.body.dataset.screen=libraryHome?'library':'character';
 if(libraryHome){document.documentElement.style.setProperty('--ui-scale-global','1');document.querySelector('#view').innerHTML=(libraryReady?renderCharacterLibrary():'<section class="panel"><h2>Открываем библиотеку…</h2></section>')+renderLibraryDialog();}
 else{
  migrateMovement();beforeLibraryRender();
  const intro=document.querySelector('.intro'),portrait=document.querySelector('.character-portrait-button');if(portrait)portrait.innerHTML=portraitMarkup(state)+'<span>Портрет</span>';else if(intro)intro.insertAdjacentHTML('afterbegin',`<button class="character-portrait-button" data-library="portrait" aria-label="Изменить портрет персонажа">${portraitMarkup(state)}<span>Портрет</span></button>`);
  if(page===0){document.querySelector('.overview-tactics')?.insertAdjacentHTML('beforeend',renderSummaryFeats());}
  if(page===4){document.querySelector('.action-panel')?.insertAdjacentHTML('beforeend',renderMovementMetrics());}
  document.querySelector('#view').insertAdjacentHTML('beforeend',renderLibraryDialog());
 }
 if(libraryModal)document.querySelector('#library-dialog').showModal();
};
async function refreshPortraitUrls(images){for(const url of portraitUrls.values())URL.revokeObjectURL(url);portraitUrls=new Map(images.map(i=>[i.id,URL.createObjectURL(i.blob)]));}
async function openCharacter(id){
 if(!libraryHome){save();await persistQueue;}
 const record=await characterStore.get(id);if(!record||record.deletedAt)throw Error('Персонаж не найден.');
 prepareCharacter(record.data);activeCharacterId=id;libraryHome=false;libraryModal=null;resetCharacterUi();save();render();window.scrollTo(0,0);
}
async function showLibrary(){if(!libraryHome){save();await persistQueue;}characterRecords=await characterStore.list();libraryHome=true;libraryModal=null;render();window.scrollTo(0,0);}
async function createCharacter(){const name=document.querySelector('#new-character-name').value.trim();if(!name)throw Error('Укажите имя персонажа.');const data=createBlankCharacter(name,document.querySelector('#new-character-race').value,document.querySelector('#new-character-player').value);const now=new Date().toISOString(),record={id:crypto.randomUUID(),createdAt:now,updatedAt:now,data};await characterStore.put(record);characterRecords.push(record);await openCharacter(record.id);}
async function installPortrait(file){
 if(!file||!PORTRAIT_TYPES.includes(file.type)||file.size>10*1024*1024)throw Error('Выберите PNG, JPG, WebP или GIF до 10 МБ.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>80e6){bitmap.close();throw Error('Изображение слишком большое.');}
 const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));if(!blob)throw Error('Не удалось обработать изображение.');
 const id=crypto.randomUUID(),record=characterRecords.find(r=>r.id===activeCharacterId),data=structuredClone(state);data.info.portraitId=id;
 await persistQueue;await characterStore.commit([{...record,data,updatedAt:new Date().toISOString()}],[{id,name:file.name,blob}]);state.info.portraitId=id;portraitUrls.set(id,URL.createObjectURL(blob));save();await persistQueue;libraryModal=null;render();toast('Портрет сохранён');
}
async function exportCharacters(all){if(!libraryHome){save();await persistQueue;}const records=all?(await characterStore.list()).filter(r=>!r.deletedAt):characterRecords.filter(r=>r.id===activeCharacterId);if(!records.length)throw Error('Нет персонажей для экспорта.');const json=await serializeLibrary(records,await characterStore.images(),all?'library':'character');const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=all?'sacralic-library.json':'sacralic-character.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importCharacters(file){if(!file)return;if(file.size>64*1024*1024)throw Error('Файл превышает 64 МБ.');const imported=deserializeLibrary(await file.text());await persistQueue;await characterStore.commit(imported.records,imported.images);characterRecords=await characterStore.list();await refreshPortraitUrls(await characterStore.images());libraryHome=true;libraryModal=null;render();toast('Импортировано персонажей: '+imported.records.length+'. Существующие записи сохранены.');}
function saveMovementEditor(){const candidate={};for(const key of ['walk','run','jump']){candidate[key+'Formula']=document.querySelector('#movement-'+key).value;candidate[key+'Bonus']=Number(document.querySelector('#movement-'+key+'-bonus').value);if(!Number.isFinite(candidate[key+'Bonus']))throw Error('Некорректный бонус.');}const result=movementValues(candidate);if(result.error)throw Error(result.error);state.play.movement=candidate;libraryModal=null;save();render();}
document.addEventListener('cancel',event=>{if(event.target.id==='library-dialog')libraryModal=null;},true);
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;const action=button.dataset.library||({export:'export',import:'import'})[button.id];if(!action)return;event.stopImmediatePropagation();if(libraryBusy)return;
 try{
  if(!libraryReady)throw Error('Хранилище пока недоступно.');
  switch(action){
   case 'home':await showLibrary();return;
   case 'open':libraryBusy=true;await openCharacter(button.dataset.id);return;
   case 'new':libraryModal='new';break;
   case 'create':libraryBusy=true;await createCharacter();return;
   case 'close-modal':libraryModal=null;break;
   case 'portrait':libraryModal='portrait';break;
   case 'upload-portrait':document.querySelector('#portrait-file').click();return;
   case 'remove-portrait':delete state.info.portraitId;libraryModal=null;save();break;
   case 'movement':libraryModal='movement';break;
   case 'save-movement':saveMovementEditor();return;
   case 'feats':page=6;referenceCategory='Простые фиты';referenceQuery='';referenceLimit=30;break;
   case 'import':document.querySelector('#library-import').click();return;
   case 'export':libraryBusy=true;await exportCharacters(false);return;
   case 'export-all':libraryBusy=true;await exportCharacters(true);return;
   case 'trash':libraryTrash=!libraryTrash;break;
   case 'archive':case 'restore':{const record=characterRecords.find(r=>r.id===button.dataset.id);if(!record)return;if(action==='archive')record.deletedAt=new Date().toISOString();else delete record.deletedAt;await characterStore.put(record);break;}
  }
  render();
 }catch(error){const field=document.querySelector('#library-dialog-error');if(field)field.textContent=error.message;else toast(error.message);}finally{libraryBusy=false;}
},true);
document.addEventListener('change',async event=>{if(!['portrait-file','library-import'].includes(event.target.id))return;event.stopImmediatePropagation();const input=event.target,file=input.files[0];if(!file)return;libraryBusy=true;try{if(input.id==='portrait-file')await installPortrait(file);else await importCharacters(file);}catch(error){toast(error.message);}finally{input.value='';libraryBusy=false;}},true);
document.querySelector('header>div:last-child').insertAdjacentHTML('afterbegin','<button data-library="home" class="library-back">← Персонажи</button>');
document.body.insertAdjacentHTML('beforeend','<input id="portrait-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><input id="library-import" type="file" accept="application/json,.json" hidden>');
async function initializeLibrary(){
 try{await characterStore.open();const migrated=await characterStore.getMeta('legacy-imported');if(!migrated){const now=new Date().toISOString();await characterStore.commit([{id:crypto.randomUUID(),createdAt:now,updatedAt:now,data:structuredClone(state)}],[],[{key:'legacy-imported',value:true}]);}characterRecords=await characterStore.list();await refreshPortraitUrls(await characterStore.images());libraryReady=true;render();}
 catch(error){libraryFailure=error.message;document.querySelector('#view').innerHTML=`<section class="panel"><h2>Не удалось открыть хранилище</h2><p>${esc(error.message)}</p><p>Разрешите локальное хранилище браузера и перезагрузите страницу. Старое сохранение dossier-v1 остаётся на устройстве.</p><button id="legacy-download">Скачать старое сохранение</button></section>`;document.querySelector('#legacy-download').addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='character-recovery.json';a.click();});}
}
render();const libraryInitialization=initializeLibrary();
