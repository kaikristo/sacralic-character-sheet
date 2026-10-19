/* Permanent racial bases, weapon attacks and a mobile overview deck. */
function syncRacialBase(){
 const source=selectedEffectSources().find(s=>s.category==='Расы'),model=source?effectsForSource(source):null;
 const effects=(model?.effects||[]).filter(e=>e.target.startsWith('stat:')&&e.op==='add'&&/^Расовый модификатор/.test(e.label));
 const desired=Object.fromEntries(effects.map(e=>[e.target.split(':')[1],model.cfg.enabled===false||state.effects.adjustments[e.id]?.enabled===false?0:Number(state.effects.adjustments[e.id]?.value??e.value)]));
 const old=state.effects.racialBase;
 if(old&&old.sourceId===(source?.id||'')&&JSON.stringify(old.requested)===JSON.stringify(desired))return;
 const applied={};
 for(const s of state.stats){const raw=s[2]-(old?.applied?.[s[1]]||0),next=desired[s[1]]===undefined?raw:Math.max(1,raw+desired[s[1]]);s[2]=next;applied[s[1]]=next-raw;}
 state.effects.racialBase={sourceId:source?.id||'',name:source?.title||'',requested:desired,applied,ids:effects.map(e=>e.id)};
}
const beforeTabletopMigrate=migrateEffects;
migrateEffects=function(){beforeTabletopMigrate();syncRacialBase();};
const beforeTabletopApplicable=applicableEffects;
applicableEffects=function(target,context={}){return beforeTabletopApplicable(target,context).map(e=>state.effects.racialBase?.ids?.includes(e.id)&&state.effects.racialBase.requested[e.target.split(':')[1]]!==0?{...e,enabled:false,baked:true}:e);};
// Racial changes are already included in the purchased/base value; equipment and feats remain separate.
renderStat=function(stat,index){return beforeCapsRenderStat(stat,index);};
const beforeTabletopStatDialog=renderStatDialog;
renderStatDialog=function(){if(statEdit<0)return '';const s=state.stats[statEdit],cap=statCap(s[1]),race=state.effects.racialBase,delta=race?.requested?.[s[1]];return beforeTabletopStatDialog().replace('<label>Базовое значение',`<p class="stat-cap-detail">Максимум: <b>${cap===null?'без ограничений':cap}</b> · итог: <b>${statTotal(s[1])}</b>.</p>${delta?`<p class="help-copy">${esc(race.name)}: расовый модификатор ${delta>0?'+':''}${delta} уже включён в базовое значение.</p>`:''}<button data-tabletop="stat-sources">Источники и ручной максимум →</button><label>Базовое значение`);};
const beforeTabletopBreakdown=renderTargetBreakdown;
renderTargetBreakdown=function(target){const delta=state.effects.racialBase?.requested?.[target.split(':')[1]];return beforeTabletopBreakdown(target)+(target.startsWith('stat:')&&delta?`<p class="help-copy">${esc(state.effects.racialBase.name)} (${delta}): уже включено в базу, повторно не прибавляется.</p>`:'');};

function weaponRule(item){for(const name of ['Огнестрельное/Дальнего боя','Метательное']){const t=ruleTable(name),row=t?.rows.find(r=>effectNorm(r[0])===effectNorm(item.name));if(row)return {row,table:t};}return null;}
function selectedWeaponSkill(item){const value=item.details?.skill;if(!value)return null;return state.skills.find(s=>skillIdentity(s)===value||s[6]===value||s[0]===value)||null;}
function weaponSkillKey(item){
 const d=item.details||{},rule=weaponRule(item),type=String(d.type||rule?.row[2]||d.skill||'').toLowerCase().replace(/ё/g,'е');
 const selected=selectedWeaponSkill(item);if(selected)return combatKey(selected);if(d.skill)return Object.keys(COMBAT_TABLE).find(k=>effectNorm(k)===effectNorm(d.skill));
 if(/снайпер/.test(type))return 'Стрельба(снайпер)';if(/тяжел/.test(type))return 'Стрельба(тяжелое)';if(/автомат/.test(type))return 'Стрельба(автоматическое)';if(/энерг/.test(type))return 'Стрельба(энергия)';if(/легк|лёгк/.test(type))return 'Стрельба(легкое)';if(/метат/.test(type))return 'Метание';if(/силов/.test(type))return 'Ближний бой силовой стиль';if(/ловк/.test(type))return 'Ближний бой ловкий стиль';if(/ближн|холодн|меч|нож|кулак/.test(type))return state.skills.map(combatKey).find(k=>k?.startsWith('Ближний бой'))||'Ближний бой силовой стиль';
 return Object.keys(COMBAT_TABLE).find(k=>effectNorm(k)===effectNorm(d.skill||''));
}
function weaponSkillChoices(){
 const learned=state.skills.map(skill=>({value:skillIdentity(skill),label:skill[0],skill,group:skill[2]==='Боевые'?'Боевые навыки':'Другие навыки'}));
 const unlearned=Object.keys(COMBAT_TABLE).filter(key=>!state.skills.some(s=>combatKey(s)===key)).map(key=>({value:key,label:key+' · не изучен',group:'Другие боевые навыки'}));return [...learned,...unlearned];
}
function weaponSkillOptions(details={}){
 const selected=selectedWeaponSkill({details}),value=selected?skillIdentity(selected):details.skill||'',choices=weaponSkillChoices();
 return `<option value="" ${!value?'selected':''}>Автоматически по типу оружия</option>${['Боевые навыки','Другие навыки','Другие боевые навыки'].map(group=>{const rows=choices.filter(c=>c.group===group);return rows.length?`<optgroup label="${group}">${rows.map(c=>`<option value="${esc(c.value)}" ${c.value===value?'selected':''}>${esc(c.label)}</option>`).join('')}</optgroup>`:'';}).join('')}${value&&!choices.some(c=>c.value===value)?`<option selected value="${esc(value)}">Недоступный навык: ${esc(value)}</option>`:''}`;
}
function setWeaponSkill(index,value){const item=state.items[index];if(item?.category!=='Оружие')throw Error('Выберите оружие.');if(value&&!weaponSkillChoices().some(c=>c.value===value))throw Error('Выберите навык из списка.');item.details??={};if(value)item.details.skill=value;else delete item.details.skill;}
function renderWeaponSkillControl(item,index){const a=attackNumbers(item);return `<label class="weapon-skill-control"><span>Навык атаки</span><select data-weapon-skill="${index}" aria-label="Навык оружия ${esc(item.name)}">${weaponSkillOptions(item.details)}</select><strong aria-label="Шанс оружия ${esc(item.name)}">${a.chance===null?'—':a.chance+'%'}</strong></label>`;}
const beforeWeaponSkillDetails=renderItemDetails;
renderItemDetails=function(category,details={}){const original=beforeWeaponSkillDetails(category,details);if(category!=='Оружие')return original;return original.replace(/<label>Навык оружия<input data-itemdetail="skill"[^>]*><\/label>/,`<label class="weapon-skill-editor">Навык оружия<select data-itemdetail="skill" aria-label="Навык оружия">${weaponSkillOptions(details)}</select><output id="weapon-skill-preview" aria-live="polite"></output></label>`);};
function updateWeaponSkillPreview(){const dialog=document.querySelector('#item-dialog'),output=dialog?.querySelector('#weapon-skill-preview');if(!output)return;try{const details=Object.fromEntries([...dialog.querySelectorAll('[data-itemdetail]')].map(e=>[e.dataset.itemdetail,e.value])),item={...(itemEdit>=0?state.items[itemEdit]:{}),name:dialog.querySelector('#item-name').value,category:'Оружие',details},a=attackNumbers(item);output.textContent=(a.skill?.[0]||a.key||'Выберите навык')+' · '+(a.chance===null?'шанс не определён':a.chance+'%')+' · навык '+a.level+(a.damage?' · урон '+a.damage:'');}catch(error){output.textContent=error.message;}}
document.addEventListener('change',event=>{const select=event.target.closest('[data-weapon-skill]');if(select){event.stopImmediatePropagation();try{setWeaponSkill(Number(select.dataset.weaponSkill),select.value);save();render();}catch(error){toast(error.message);}return;}if(event.target.closest('#item-dialog')&&(event.target.dataset.itemdetail!==undefined||event.target.id==='item-name'))updateWeaponSkillPreview();},true);
document.addEventListener('input',event=>{if(event.target.closest('#item-dialog')&&event.target.dataset.itemdetail!==undefined)updateWeaponSkillPreview();},true);
function activeAttackSource(title){const source=selectedEffectSources().find(s=>s.title===title);return source&&sourceConfig(source.id).enabled!==false?source:null;}
function attackNumbers(item){
 const d=item.details||{},rule=weaponRule(item),r=rule?.row||[],key=weaponSkillKey(item),skill=selectedWeaponSkill(item)||(key?state.skills.find(s=>combatKey(s)===key):null),level=skill?effectiveSkillLevel(skill):0,row=COMBAT_TABLE[key]?.[Math.min(10,level)],shooting=!!key?.startsWith('Стрельба');
 const rawDamage=String(d.damage||r[3]||''),masteryMatch=String(d.mastery||rawDamage).match(/(?:MST\s*:?)?\s*(\d+)\s*[:/]\s*(\d+)/i),baseDamage=rawDamage.replace(/[,;]?\s*MST\s*:?\s*\d+\s*[:/]\s*\d+/ig,'').trim();
 const mastery=masteryMatch?Math.max(0,level-Number(masteryMatch[1])+1)*Number(masteryMatch[2]):0;
 const costMatch=String(d.actionCost||r[4]||'').match(/(\d+)\s*(?:о\.?\s*д|од)/i),baseCost=d.actionCost!==undefined&&d.actionCost!==''?(Number.isFinite(Number(d.actionCost))?Number(d.actionCost):costMatch?Number(costMatch[1]):null):costMatch?Number(costMatch[1]):null;
 let cost=baseCost,notes=[],skillDice=Number(String(row?.damage||'').match(/([+-]?\d+)d/)?.[1]||0),bbBase=null;
 if(row&&skill){for(const f of cumulativeCombatFeatures(skill||[key,level,'Боевые']))if(/од на (выстрел|удар|метание)/.test(f.text)){const delta=Number(f.text.match(/[+-]?\d+/)?.[0]||0);if(cost!==null)cost+=delta;notes.push(`${f.text} · ${key}, ур. ${f.level}`);}}
 if(shooting&&activeAttackSource('Быстрый стрелок')){if(cost!==null)cost-=1;notes.push('Быстрый стрелок: −1 ОД, минимум 3; прицельный выстрел недоступен');}
 if(shooting&&activeAttackSource('Меткий стрелок')){if(cost!==null)cost+=1;notes.push('Меткий стрелок: +1 ОД');}
 if(shooting&&/очеред/i.test(d.attackMode||'')&&activeAttackSource('Автоматчик')){if(cost!==null)cost-=1;notes.push('Автоматчик: −1 ОД за очередь');}
 if(key?.includes('силовой')&&activeAttackSource('Разрушитель')&&/двуруч/i.test(d.type||item.notes||'')){if(cost!==null)cost-=1;const src=activeAttackSource('Разрушитель');skillDice+=Math.floor((sourceConfig(src.id).level||state.info.level)/20);notes.push('Разрушитель: −1 ОД и дайсы за уровень класса');}
 if(Number.isFinite(Number(d.actionCostBonus))&&d.actionCostBonus!==''){if(cost!==null)cost+=Number(d.actionCostBonus);if(Number(d.actionCostBonus))notes.push(`Ручная поправка ОД: ${d.actionCostBonus}`);}
 if(cost!==null)cost=Math.max(shooting?3:1,Math.floor(cost));
 try{bbBase=calculateFormula(String(d.armorPen||r[5]||'0'),{});}catch{}
 const bb=bbBase===null?null:bbBase+Number(row?.armorPen||0)+Number(d.armorPenBonus||0),die=Number(baseDamage.match(/d(\d+)/i)?.[1]||100);
 const damage=[baseDamage||'не указан',skillDice?`${skillDice>0?'+':'−'} ${Math.abs(skillDice)}d${die}`:'',mastery?`+ ${mastery}`:'',Number(d.damageBonus||0)?`${Number(d.damageBonus)>0?'+':'−'} ${Math.abs(Number(d.damageBonus))}`:''].filter(Boolean).join(' ');
 return {key,skill,level,row,shooting,cost,baseCost,notes,damage,baseDamage,skillDice,mastery,masteryMatch,bb,bbBase,range:d.range||r[7]||(key?.startsWith('Ближний бой')?1:'—'),chance:skill?chance(skill):key?statTotal(key==='Стрельба(энергия)'?'INT':key.startsWith('Стрельба')?'ACC':key.includes('силовой')?'STR':'DEX'):null,type:d.type||r[2]||key||'Тип не указан'};
}
function renderAvailableAttacks(){const weapons=state.items.map((item,index)=>({item,index})).filter(x=>x.item.category==='Оружие'&&x.item.equipped);return `<section class="panel available-attacks" data-ui-region="attacks"><div class="section-heading"><h2>Доступные атаки</h2><button data-page="2">Оружие →</button></div>${weapons.map(({item,index})=>{const a=attackNumbers(item);return `<article class="attack-card"><div class="section-heading"><b>${a.shooting?'Выстрел':'Атака'} · ${esc(item.name)}</b><button data-edititem="${index}" aria-label="Настройки атаки ${esc(item.name)}">⚙</button></div><small>${esc(a.skill?.[0]||a.key||'Навык не выбран')} · уровень ${a.level}</small>${a.chance!==null?`<div class="attack-chance" aria-label="Шанс попадания ${esc(item.name)}"><strong>${a.chance}%</strong><span>попадание</span></div>`:''}<div class="attack-values">${metric('ОД',a.cost??'Укажите')}${metric('Урон',a.damage)}${metric('ББ',a.bb??item.details.armorPen??'—')}${metric('Дальность',a.range)}${typeof attackAmmo==='function'&&attackAmmo(item).cost?metric('Боезапас',attackAmmo(item).current+(attackAmmo(item).max!==null?' / '+attackAmmo(item).max:''),'−'+attackAmmo(item).cost+' за атаку'):''}</div><details><summary>Как рассчитано</summary><p>ОД: база ${a.baseCost??'не указана'}. ${a.notes.map(esc).join('; ')||'Без поправок.'}</p><p>Урон: ${esc(a.baseDamage)}; за навык ${a.skillDice}d; мастерство ${a.mastery}${a.masteryMatch?' · начиная с ур. '+a.masteryMatch[1]+', '+a.masteryMatch[2]+' за уровень':''}.</p><p>ББ: ${a.bbBase??'не указана'} + ${Number(a.row?.armorPen||0)} за навык${Number(item.details.armorPenBonus||0)?' + '+item.details.armorPenBonus+' вручную':''}.</p>${!a.key?'<p>Укажите тип оружия или связанный навык в настройках предмета.</p>':''}</details>${page===0?'':`<button data-tabletop="attack" data-weapon="${index}" ${a.cost===null||state.play.ap<a.cost?'disabled':''}>Выполнить · ${a.cost??'?'} ОД</button>`}</article>`;}).join('')||'<p class="help-copy">Наденьте оружие в инвентаре. Здесь появятся атаки с расчётом по его типу и вашему навыку.</p>'}</section>`;}
itemFields['Оружие'].push(['type','Тип оружия'],['attackMode','Режим атаки'],['mastery','Мастерство MST X/Y (например 5/50)'],['rangeBonus','Бонус радиуса ближнего боя'],['actionCostBonus','Ручная поправка стоимости ОД'],['damageBonus','Ручная прибавка урона'],['armorPenBonus','Ручная прибавка ББ']);
const beforeTabletopAddItem=addReferenceItem;
addReferenceItem=function(id){beforeTabletopAddItem(id);const item=state.items.at(-1),r=weaponRule(item)?.row;if(item?.category==='Оружие'&&r){item.details.type=r[2]||'';item.details.mastery=String(r[3]).match(/MST\s*:?\s*(\d+\s*[:/]\s*\d+)/i)?.[1]||'';const cost=String(r[4]).match(/(\d+)\s*о\.?\s*д/i);if(cost)item.details.actionCost=cost[1];}};

let mobileOverviewSlide=0;
function setupOverviewDeck(){
 const grid=document.querySelector('#view>.grid');if(!grid)return;
 const left=grid.querySelector('.left-sheet');if(!left)return;
 const attacks=document.createElement('div');attacks.innerHTML=renderAvailableAttacks();grid.append(attacks.firstElementChild);
 if(!window.matchMedia('(max-width:700px)').matches)return;
 const summary=grid.querySelector('.overview-tactics'),feats=grid.querySelector('.summary-feats'),body=grid.querySelector('[data-ui-region="body"]'),status=grid.querySelector('[data-ui-region="status"]'),attack=grid.querySelector('.available-attacks');
 for(const [panel,label] of [[left,'Характеристики и навыки'],[attack,'Атаки'],[summary,'Общая информация'],[feats,'Фиты'],[body,'Зоны попадания'],[status,'HP и заметки']])if(panel){grid.append(panel);panel.classList.add('overview-slide');panel.dataset.slideLabel=label;if(!panel.classList.contains('panel'))panel.classList.add('panel');}
 grid.classList.add('overview-deck');
 const nav=document.createElement('div');nav.className='overview-deck-nav';nav.setAttribute('aria-label','Панели обзора');nav.innerHTML=[...grid.children].map((p,i)=>`<button data-tabletop="slide" data-slide="${i}" aria-label="Панель ${p.dataset.slideLabel}" aria-pressed="${i===mobileOverviewSlide}">${i+1}</button>`).join('')+'<span>Свайп ← →</span>';grid.before(nav);
 const table=left.querySelector('.skill-list');if(table){const wrap=document.createElement('div');wrap.className='skill-table-scroll';table.before(wrap);wrap.append(table);}
 grid.addEventListener('scroll',()=>{const index=Math.round(grid.scrollLeft/(grid.clientWidth+8));if(index!==mobileOverviewSlide){mobileOverviewSlide=index;nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}},{passive:true});
 requestAnimationFrame(()=>{grid.style.height=Math.max(280,innerHeight-grid.getBoundingClientRect().top-8)+'px';grid.scrollLeft=(grid.clientWidth+8)*mobileOverviewSlide;});
}
const beforeTabletopRender=render;
render=function(){migrateEffects();document.body.dataset.sheetPage=page===0&&!libraryHome?'overview':'other';beforeTabletopRender();if(libraryHome)return;if(page===0){setupOverviewDeck();const attacks=document.querySelector('.available-attacks');if(attacks&&!attacks.querySelector('.panel-collapse-toggle')){const h=attacks.querySelector('h2');const hidden=!!state.ui.collapsed?.['0:attacks:0'];h.innerHTML='<button class="panel-collapse-toggle" data-tabletop="attack-collapse" aria-expanded="'+!hidden+'">Доступные атаки '+(hidden?'▸':'▾')+'</button>';attacks.classList.toggle('panel-collapsed',hidden);for(const child of [...attacks.children])if(!child.contains(h))child.hidden=hidden;}}
 if(!document.querySelector('.mobile-xp-toggle'))document.querySelector('#progression').insertAdjacentHTML('beforebegin','<button class="mobile-xp-toggle" data-tabletop="xp-toggle">Опыт и развитие ▾</button>');
};
document.addEventListener('click',event=>{const b=event.target.closest('[data-tabletop]');if(!b)return;event.stopImmediatePropagation();try{switch(b.dataset.tabletop){
 case 'stat-sources':statEdit=-1;page=8;render();return;
 case 'xp-toggle':document.body.classList.toggle('mobile-xp-open');{const grid=document.querySelector('.overview-deck');if(grid)grid.style.height=Math.max(280,innerHeight-grid.getBoundingClientRect().top-8)+'px';}return;
 case 'slide':{const grid=document.querySelector('.overview-deck');mobileOverviewSlide=+b.dataset.slide;grid.scrollTo({left:(grid.clientWidth+8)*mobileOverviewSlide,behavior:'instant'});return;}
 case 'attack-collapse':{const panel=b.closest('.available-attacks'),open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));for(const child of [...panel.children])if(!child.contains(b))child.hidden=open;state.ui.collapsed['0:attacks:0']=open;panel.classList.toggle('panel-collapsed',open);b.textContent='Доступные атаки '+(open?'▸':'▾');save();if(typeof refreshPanelLayout==='function')requestAnimationFrame(()=>refreshPanelLayout(panel));return;}
 case 'attack':{const item=state.items[+b.dataset.weapon],a=attackNumbers(item);if(a.cost===null)throw Error('Укажите стоимость атаки.');if(typeof performWeaponAttack==='function')performWeaponAttack(+b.dataset.weapon);else spendAction(a.cost,'Атака: '+item.name);save();render();return;}
 }}catch(error){toast(error.message);}},true);
window.matchMedia('(max-width:700px)').addEventListener?.('change',()=>render());
migrateEffects();syncMaxHp();render();
