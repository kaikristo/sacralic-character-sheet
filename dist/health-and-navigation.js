/* Overview gestures share the outer pager; only vertical handle movement reorders skills. */
let skillPageGesture=null,suppressSkillPageClickUntil=0;
function swipePageIndex(start,delta,count,width){const threshold=Math.max(30,Math.min(60,width*.12));return Math.max(0,Math.min(count-1,start+(Math.abs(delta)>=threshold?(delta<0?1:-1):0)));}
function finishSkillPageGesture(cancel=false){const g=skillPageGesture;skillPageGesture=null;if(!g||g.axis!=='horizontal')return;const index=cancel?g.index:swipePageIndex(g.index,g.delta,g.grid.children.length,g.grid.getBoundingClientRect().width);g.grid.style.removeProperty('scroll-snap-type');g.grid.scrollTo({left:index*(g.grid.clientWidth+8),behavior:'smooth'});mobileOverviewSlide=index;packedFocusLabel=g.grid.children[index]?.querySelector('.overview-slide')?.dataset.slideLabel||'';suppressSkillPageClickUntil=Date.now()+500;}
document.addEventListener('pointerdown',event=>{if(!window.matchMedia('(max-width:700px)').matches||event.isPrimary===false)return;const area=event.target.closest('.overview-deck .skill-table-scroll'),grid=area?.closest('.overview-deck');if(!grid)return;skillPageGesture={id:event.pointerId,grid,area,x:event.clientX,y:event.clientY,index:Math.round(grid.scrollLeft/(grid.clientWidth+8)),scroll:grid.scrollLeft,delta:0,axis:null};},true);
document.addEventListener('pointermove',event=>{const g=skillPageGesture;if(!g||event.pointerId!==g.id)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;
 if(!g.axis){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2){g.axis='horizontal';clearSkillDrag();g.area.setPointerCapture?.(g.id);g.grid.style.scrollSnapType='none';}else if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.2)g.axis='vertical';}
 if(g.axis!=='horizontal')return;g.delta=dx;const scale=g.grid.getBoundingClientRect().width/g.grid.clientWidth||1;g.grid.scrollLeft=g.scroll-dx/scale;event.preventDefault();event.stopImmediatePropagation();
},{capture:true,passive:false});
document.addEventListener('pointerup',event=>{if(!skillPageGesture||event.pointerId!==skillPageGesture.id)return;const horizontal=skillPageGesture.axis==='horizontal';finishSkillPageGesture();if(horizontal){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('pointercancel',()=>finishSkillPageGesture(true),true);
document.addEventListener('click',event=>{if(Date.now()<suppressSkillPageClickUntil&&event.target.closest('.overview-deck .skill-table-scroll')){event.preventDefault();event.stopImmediatePropagation();}},true);

/* The health board uses the same hit zones, trauma records and HP editors on every tab. */
let healthBoardOpen=false;
function renderHeaderHealth(){return `<button class="header-health" data-health-board="open" aria-label="Здоровье и зоны попадания"><small>HP</small><strong>${state.info.hp.toLocaleString('ru')}</strong><span>/ ${state.info.maxhp.toLocaleString('ru')}</span></button>`;}
function renderHealthBoard(){return `<dialog id="health-board-dialog" class="formula-dialog health-board-dialog" aria-labelledby="health-board-title"><div class="toolbar"><h2 id="health-board-title">Зоны попадания</h2><button data-health-board="close" aria-label="Закрыть зоны попадания">×</button></div><div data-ui-region="body">${renderBodyMap()}${renderTraumas()}</div></dialog>`;}
function closeHealthBoard(){healthBoardOpen=false;document.querySelector('#health-board-dialog')?.remove();}
const beforeHealthHeader=renderHeader,beforeHealthRender=render;
renderHeader=function(){beforeHealthHeader();const current=document.querySelector('.header-health');if(current)current.outerHTML=renderHeaderHealth();else document.querySelector('.level-button')?.insertAdjacentHTML('beforebegin',renderHeaderHealth());};
render=function(){const scroll=document.querySelector('#health-board-dialog')?.scrollTop||0;beforeHealthRender();if(libraryHome){healthBoardOpen=false;return;}if(!healthBoardOpen)return;
 // Earlier page renderers may show an editor before replacing the tab content. Reopen it above the board.
 const children=[['damage-dialog',damageOpen,renderDamageDialog],['trauma-dialog',traumaOpen,renderTraumaDialog],['hp-dialog',hpOpen,renderHpDialog],['wound-dialog',!!woundDialog,renderWoundDialog]];
 for(const [id,active] of children)if(active){const dialog=document.querySelector('#'+id);if(dialog?.open)dialog.close();}
 document.querySelector('#view').insertAdjacentHTML('beforeend',renderHealthBoard());const board=document.querySelector('#health-board-dialog');board.showModal();board.scrollTop=scroll;
 board.querySelectorAll('svg [data-zone]').forEach(el=>{el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','Попадание: '+names[Number(el.dataset.zone)]);});
 for(const [id,active,renderer] of children)if(active){if(!document.querySelector('#'+id))document.querySelector('#view').insertAdjacentHTML('beforeend',renderer());document.querySelector('#'+id).showModal();}
};
document.addEventListener('click',event=>{const b=event.target.closest('[data-health-board]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();if(b.dataset.healthBoard==='close')closeHealthBoard();else{healthBoardOpen=true;render();}},true);
document.addEventListener('cancel',event=>{if(event.target.id==='health-board-dialog'){event.preventDefault();closeHealthBoard();}},true);
render();
