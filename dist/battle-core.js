/* Deterministic battle rules. Online commands are applied by the room host. */
const TacticalBattle=(()=>{
 const C=typeof TacticalCombat!=='undefined'?TacticalCombat:require('./battle-combat.js');
 const colors=['#82c9ac','#e7897e','#dfbf78','#8eb8e8','#c499db','#d79fca','#a2be74','#82cbd0'];
 const sprites=['Разведчик','Снайпер','Штурмовик','Оперативник','Пси-стрелок','Пулемётчик','Боец с молотом','Мечник'].map((name,i)=>({id:'mercenary-'+(i+1),name}));
 function appearance(input){const spriteId=input.spriteId??null;if(spriteId!==null&&!sprites.some(s=>s.id===spriteId))throw Error('Неизвестный спрайт.');return {spriteId,facing:integer(input.facing??0,0,7,'направление')};}
 function facingTo(a,b){return (Math.round(Math.atan2(a.x-b.x,b.y-a.y)*4/Math.PI)+8)%8;}
 const locations={
  ruins:{name:'Заброшенный квартал',w:14,h:10,rows:['..............','...###...##...','...#.......c..','...#...~~.....','.......~~.....','..cc..........','.....###..#...','..~..#....#...','..~.......#...','..............']},
  forest:{name:'Лесная переправа',w:14,h:10,rows:['..............','..#...~~..#...','......~~......','..c#..~~..#...','......~~......','..............','...#..~~.c....','......~~...#..','..#...~~......','..............']},
  warehouse:{name:'Склад',w:14,h:10,rows:['..............','..###...###...','..###...###...','..............','....cc........','........cc....','..............','..###...###...','..###...###...','..............']},
  arena:{name:'Открытая арена',w:14,h:10,rows:Array(10).fill('..............')}
 };
 function number(value,min,max,label){if(!Number.isFinite(value)||value<min||value>max)throw Error('Некорректное значение: '+label);return value;}
 function integer(value,min,max,label){number(value,min,max,label);if(!Number.isSafeInteger(value))throw Error('Требуется целое число: '+label);return value;}
 function text(value,max=100){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Укажите название (до '+max+' символов).');return value.trim();}
 function mapFor(key){const m=locations[key];if(!m)throw Error('Выберите локацию.');return {key,name:m.name,w:m.w,h:m.h,tiles:m.rows.join('')};}
 function create(ownerUid,teamName='Команда ведущего',location='ruins'){return {version:1,phase:'lobby',round:1,turnIndex:0,order:[],teams:[{id:crypto.randomUUID(),ownerUid,name:text(teamName,50),color:colors[0]}],units:[],map:mapFor(location),log:[],history:[],winner:null};}
 function validate(b){
  if(!b||b.version!==1||!['lobby','battle','paused','finished'].includes(b.phase)||!Array.isArray(b.teams)||b.teams.length>8||!Array.isArray(b.units)||b.units.length>64||!Array.isArray(b.order)||!Array.isArray(b.log)||!Array.isArray(b.history))throw Error('Повреждены данные сражения.');
  integer(b.map?.w,6,24,'ширина');integer(b.map?.h,6,24,'высота');if(typeof b.map.tiles!=='string'||b.map.tiles.length!==b.map.w*b.map.h||/[^.#~c]/.test(b.map.tiles))throw Error('Повреждена карта.');
  integer(b.round,1,100000,'раунд');integer(b.turnIndex,0,8,'ход');
  if(!Object.hasOwn(locations,b.map.key))throw Error('Неизвестная локация.');
  for(const entry of [...b.teams,...b.units])if(typeof entry.id!=='string'||!/^[A-Za-z0-9_-]{1,180}$/.test(entry.id))throw Error('Некорректный ID участника.');
  if(new Set(b.teams.map(t=>t.id)).size!==b.teams.length||new Set(b.units.map(u=>u.id)).size!==b.units.length)throw Error('Повторяющиеся участники.');
  for(const t of b.teams){text(t.id,180);text(t.ownerUid,180);text(t.name,50);if(!colors.includes(t.color))throw Error('Неизвестный цвет команды.');}
  for(const u of b.units){sanitizeUnit(u);integer(u.x,0,b.map.w-1,'X');integer(u.y,0,b.map.h-1,'Y');if(!b.teams.some(t=>t.id===u.teamId))throw Error('Нет команды бойца.');}
  if(b.order.some(id=>!b.teams.some(t=>t.id===id))||b.history.length>12||b.log.length>60)throw Error('Повреждён порядок боя.');return b;
 }
 function sanitizeUnit(input){
  const u={name:text(input.name,80),hpMax:integer(input.hpMax,1,10000000,'максимальные HP'),apMax:integer(input.apMax,1,100,'ОД'),walk:number(input.walk,.1,50,'шаг'),run:number(input.run,.1,100,'бег'),jump:number(input.jump,0,100,'прыжок'),jumpCost:integer(input.jumpCost??2,1,100,'ОД прыжка'),reaction:number(input.reaction,0,10000,'реакция'),armor:number(input.armor??0,0,10000,'броня'),sourceId:typeof input.sourceId==='string'?input.sourceId.slice(0,180):'',attacks:[]};
  Object.assign(u,appearance(input));u.hp=integer(input.hp??u.hpMax,0,u.hpMax,'HP');u.ap=integer(input.ap??u.apMax,0,u.apMax,'текущие ОД');u.posture=input.posture==='prone'?'prone':'standing';u.firstTurn=input.firstTurn===true;
  if(!Array.isArray(input.attacks)||input.attacks.length>8)throw Error('У бойца должно быть не более 8 атак.');
  u.attacks=input.attacks.map(a=>({name:text(a.name,80),cost:integer(a.cost,1,100,'ОД атаки'),chance:number(a.chance,0,1000,'шанс'),damage:text(a.damage,120),bb:number(a.bb??0,0,10000,'ББ'),range:number(a.range,1,10000,'дальность'),...C.sanitizeAttack(a),ammo:a.ammo===null||a.ammo===undefined?null:integer(a.ammo,-1000000,1000000,'боезапас'),ammoCost:integer(a.ammoCost??0,0,1000,'расход патронов')}));Object.assign(u,C.sanitize(input));return u;
 }
 function tile(b,x,y){return x<0||y<0||x>=b.map.w||y>=b.map.h?'#':b.map.tiles[y*b.map.w+x];}
 function occupied(b,x,y,except){return b.units.some(u=>u.id!==except&&u.x===x&&u.y===y);}
 function distance(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));}
 function paths(b,unit){
  const start=unit.y*b.map.w+unit.x,dist=new Map([[start,0]]),prev=new Map(),queue=[start];
  while(queue.length){queue.sort((a,c)=>dist.get(a)-dist.get(c));const at=queue.shift(),x=at%b.map.w,y=Math.floor(at/b.map.w);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(tile(b,nx,ny)==='#'||occupied(b,nx,ny,unit.id)||dx&&dy&&(tile(b,x+dx,y)==='#'||tile(b,x,y+dy)==='#'))continue;const key=ny*b.map.w+nx,cost=dist.get(at)+(tile(b,nx,ny)==='~'?2:1);if(cost<(dist.get(key)??Infinity)){dist.set(key,cost);prev.set(key,at);queue.push(key);}}
  }return {dist,prev};
 }
 function movement(b,unit,x,y,mode='walk'){
  integer(x,0,b.map.w-1,'X');integer(y,0,b.map.h-1,'Y');if(occupied(b,x,y,unit.id)||tile(b,x,y)==='#')throw Error('Клетка занята или непроходима.');
  if(unit.x===x&&unit.y===y)throw Error('Выберите другую клетку.');
  if(!C.canAct(unit,b)&&b.phase!=='lobby')throw Error('Боец не может действовать.');if(C.speed(unit,b,mode)<=0)throw Error('Этот способ движения недоступен из-за травмы.');
  if(mode==='jump'){if(distance(unit,{x,y})>C.speed(unit,b,'jump')||!lineOfSight(b,unit,{x,y}))throw Error('Прыжок слишком далеко или перекрыт стеной.');return {cost:unit.jumpCost,path:[{x,y}],steps:distance(unit,{x,y})};}
  if(!['walk','run'].includes(mode))throw Error('Выберите способ движения.');if(mode==='run'&&unit.posture==='prone')throw Error('Для бега сначала встаньте.');
  const {dist,prev}=paths(b,unit),end=y*b.map.w+x,steps=dist.get(end);if(steps===undefined)throw Error('Нет доступного пути.');const path=[];let at=end;while(prev.has(at)){path.unshift({x:at%b.map.w,y:Math.floor(at/b.map.w)});at=prev.get(at);}return {cost:Math.max(1,Math.ceil(steps/Math.max(.01,C.speed(unit,b,mode)))),steps,path};
 }
 function lineOfSight(b,a,c){let x=a.x,y=a.y,dx=Math.abs(c.x-x),dy=Math.abs(c.y-y),sx=x<c.x?1:-1,sy=y<c.y?1:-1,err=dx-dy;while(x!==c.x||y!==c.y){const twice=2*err,oldX=x,oldY=y;if(twice>-dy){err-=dy;x+=sx;}if(twice<dx){err+=dx;y+=sy;}if(tile(b,x,y)==='#'||x!==oldX&&y!==oldY&&tile(b,x,oldY)==='#'&&tile(b,oldX,y)==='#')return false;}return true;}
 function dice(expression,random=Math.random){
  const value=String(expression).replace(/\s/g,'');if(!/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/i.test(value))throw Error('Укажите урон в формате 1d100 + 20.');
  let total=0,count=0;for(const term of value.match(/[+-]?[^+-]+/g)){const sign=term[0]==='-'?-1:1,part=term.replace(/^[+-]/,''),match=part.match(/^(\d+)d(\d+)$/i);if(match){const n=integer(+match[1],1,100,'число кубиков'),sides=integer(+match[2],2,10000,'грани');count+=n;if(count>500)throw Error('Слишком много кубиков.');for(let i=0;i<n;i++)total+=sign*(1+Math.floor(number(random(),0,.9999999999999999,'случайное число')*sides));}else total+=sign*integer(+part,0,10000000,'урон');}return Math.max(0,total);
 }
 function activeTeam(b){return b.teams.find(t=>t.id===b.order[b.turnIndex]);}
 function owns(b,uid,unit,ownerUid){return uid===ownerUid||b.teams.find(t=>t.id===unit.teamId)?.ownerUid===uid;}
 function spawn(b,teamId){const index=b.teams.findIndex(t=>t.id===teamId),points=[];for(let y=0;y<b.map.h;y++)for(let x=0;x<b.map.w;x++)if(tile(b,x,y)!=='#'&&!occupied(b,x,y))points.push({x,y});points.sort((a,c)=>{const corner=index%4,score=p=>corner===0?p.x+p.y:corner===1?b.map.w-1-p.x+b.map.h-1-p.y:corner===2?b.map.w-1-p.x+p.y:p.x+b.map.h-1-p.y;return score(a)-score(c);});if(!points.length)throw Error('На карте нет свободного места.');return points[0];}
 function addLog(b,message){b.log.unshift(message);b.log=b.log.slice(0,60);}
 function remember(b,ids){b.history.push({units:b.units.filter(u=>ids.includes(u.id)).map(u=>structuredClone(u)),phase:b.phase,round:b.round,turnIndex:b.turnIndex,winner:b.winner,pendingMove:structuredClone(b.pendingMove||null),reactions:structuredClone(b.reactions||[])});b.history=b.history.slice(-12);}
 function livingTeams(b){return b.teams.filter(t=>b.units.some(u=>u.teamId===t.id&&u.hp>0&&!u.dead));}
 function finish(b){const living=livingTeams(b);if(living.length<=1){b.phase='finished';b.winner=living[0]?.id||null;b.pendingMove=null;b.reactions=[];addLog(b,living[0]?'Победа команды «'+living[0].name+'».':'Бой завершён без победителя.');}}
 function strike(b,unit,target,attack,random,options={}){const result=C.resolve(b,unit,target,attack,random,{distance,lineOfSight,tile},options);unit.facing=facingTo(unit,target);addLog(b,result.lines.join('\n'));return result;}
 function threats(b,mover,checked=[]){
  return b.units.flatMap(u=>{if(u.teamId===mover.teamId||!C.canAct(u,b)||u.opportunityLeft<=0||u.opportunityTargets.includes(mover.id)||checked.includes(u.id))return [];const index=u.attacks.findIndex(a=>a.melee&&distance(u,mover)<=a.range&&lineOfSight(b,u,mover));return index<0?[]:[{id:b.pendingMove.id+':'+u.id+':'+mover.id,unitId:u.id,targetId:mover.id,attackIndex:index}];});
 }
 function advanceMove(b){
  const pending=b.pendingMove;if(!pending)return;const mover=b.units.find(u=>u.id===pending.unitId);
  if(!mover||!C.canAct(mover,b)){b.pendingMove=null;b.reactions=[];return;}
  while(true){const reactions=threats(b,mover,pending.checked);if(reactions.length){b.reactions=reactions;addLog(b,'Движение '+mover.name+' остановлено: атака по возможности. Ожидается решение '+reactions.map(r=>b.units.find(u=>u.id===r.unitId).name).join(', ')+'.');return;}
   if(!pending.path.length){b.pendingMove=null;b.reactions=[];return;}const point=pending.path.shift();mover.facing=facingTo(mover,point);Object.assign(mover,point);
  }
 }
 function resolveOpportunity(b,p,uid,ownerUid,random){
  const reaction=b.reactions.find(r=>r.id===p.reactionId),unit=reaction&&b.units.find(u=>u.id===reaction.unitId),target=reaction&&b.units.find(u=>u.id===reaction.targetId);
  if(!b.pendingMove||!unit||!target||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к этой атаке по возможности.');
  if(!C.canAct(unit,b)||unit.opportunityLeft<=0||unit.opportunityTargets.includes(target.id))throw Error('Нет доступного заряда или эта цель уже атакована в этом ходу.');
  remember(b,b.units.map(u=>u.id));b.pendingMove.checked.push(unit.id);b.reactions=b.reactions.filter(r=>r.id!==reaction.id);
  if(p.action==='opportunity'){unit.opportunityLeft--;unit.opportunityTargets.push(target.id);strike(b,unit,target,unit.attacks[reaction.attackIndex],random,{free:true,opportunity:true});addLog(b,unit.name+': заряд атаки по возможности потрачен, осталось '+unit.opportunityLeft+' / '+unit.opportunityMax+'.');finish(b);}
  else addLog(b,unit.name+' пропускает атаку по возможности по '+target.name+'. Заряд сохранён.');
  if(b.pendingMove&&!b.reactions.length)advanceMove(b);
 }
 function executeMove(b,unit,p,host,random){
  const move=unit.moves[integer(p.moveIndex,0,63,'приём')];if(!move)throw Error('Этот приём не выбран у бойца.');if(move.blocked&&!(host&&p.override))throw Error('Требования: '+move.blocked);
  if(C.active(unit,b)?.name==='Защитная стойка')throw Error('В защитной стойке нельзя использовать приёмы.');
  const weapon=unit.attacks[move.attackIndex];if(!weapon?.melee)throw Error('Приёму нужно оружие ближнего боя.');
  if(/стойка$/.test(move.name)){
   if(unit.ap<move.cost)throw Error('Недостаточно ОД.');remember(b,b.units.map(u=>u.id));unit.ap-=move.cost;const duration=C.roll(6,random);unit.stance={name:move.name,level:move.level,until:b.round+duration};if(move.name==='Защитная стойка')unit.ap=Math.min(unit.ap,C.apMax(unit,b));
   addLog(b,unit.name+' применяет «'+move.name+'»: '+move.cost+' ОД, d6 = '+duration+' раундов (до раунда '+unit.stance.until+'). '+(move.name==='Атакующая стойка'?'Атаки и приёмы +'+move.level*5+' п.п.; защита и движение ×0,5.':move.name==='Защитная стойка'?'Защита +'+move.level*5+' п.п.; ОД и движение ×0,5.':'Урон ×1,5; движение +1; крит +'+move.level+' п.п.; защита невозможна; иммунитет к оглушению.'));return;
  }
  let pair=[move],cost=C.attackValues(unit,weapon,b,move).cost;
  if(move.name==='Комбинация'){if(!Array.isArray(p.combo)||p.combo.length!==2||p.combo[0]===p.combo[1])throw Error('Выберите два разных приёма для комбинации.');pair=p.combo.map(i=>unit.moves[integer(i,0,63,'приём комбинации')]);if(pair.some(m=>!m||m.attackIndex!==move.attackIndex||/стойка$/.test(m.name)||m.name==='Комбинация'||m.blocked&&!(host&&p.override)))throw Error('Нужны два доступных приёма для того же оружия.');cost=integer(p.comboCost,0,100,'ОД комбинации, согласованные с ведущим');}
  if(unit.ap<cost)throw Error('Недостаточно ОД: нужно '+cost+'.');
  const targetIds=Array.isArray(p.targetIds)?p.targetIds:[p.targetId];if(!targetIds.length||new Set(targetIds).size!==targetIds.length)throw Error('Выберите разные цели.');
  const multi=pair.some(m=>m.name==='Круговой удар')?64:pair.some(m=>m.name==='Двойной удар')?2:1;if(targetIds.length>multi)throw Error('Слишком много целей для приёма.');
  const targets=targetIds.map(id=>b.units.find(u=>u.id===id));for(const target of targets){if(!target||target.teamId===unit.teamId||target.hp<=0||distance(unit,target)>weapon.range||!lineOfSight(b,unit,target))throw Error('Цель недоступна или вне радиуса оружия.');if(pair.some(m=>m.name==='Оглушающий удар')&&!target.hasHead)throw Error('У цели нет головы.');}
  remember(b,b.units.map(u=>u.id));unit.ap-=cost;addLog(b,unit.name+' применяет «'+move.name+'» · '+cost+' ОД.');
  for(const target of targets){let damaged=false;for(const part of pair){const zone=part.name==='Оглушающий удар'?0:part.name==='Сбить с ног'?4:part.name==='Смертельный удар'?(p.zone??1):undefined;const result=strike(b,unit,target,weapon,random,{move:part,free:true,zone,skipDamage:damaged,armorIgnore:pair.some(m=>m.name==='Мощный удар')?1:pair.some(m=>m.name==='Сильный удар')?.5:0});if(result.damage>0)damaged=true;if(part.name==='Шквал ударов')unit.flurry=true;if(target.hp<=0)break;}}
 }
 function apply(source,command,uid,ownerUid,random=Math.random){
  validate(source);const b=structuredClone(source);b.units=b.units.map(u=>({...u,...sanitizeUnit(u)}));b.reactions??=[];const p=command.payload||{},host=uid===ownerUid;
  if(!host&&!b.teams.some(t=>t.ownerUid===uid))throw Error('Ведущий ещё не добавил вашу команду.');
  const requireHost=()=>{if(!host)throw Error('Действие доступно только ведущему.');},lobby=()=>{if(b.phase!=='lobby')throw Error('Изменять состав и карту можно до начала боя.');};
  if(command.kind==='team'){requireHost();lobby();if(b.teams.length>=8)throw Error('Максимум 8 команд.');if(p.uid&&b.teams.some(t=>t.ownerUid===p.uid))return b;b.teams.push({id:crypto.randomUUID(),ownerUid:p.uid?text(p.uid,180):ownerUid,name:text(p.name,50),color:colors[b.teams.length]});b.history=[];addLog(b,'Добавлена команда «'+p.name+'».');return b;}
  if(command.kind==='location'){requireHost();lobby();b.map=mapFor(p.key);for(const u of b.units){u.x=-1;u.y=-1;}for(const u of b.units)Object.assign(u,spawn(b,u.teamId));b.history=[];return b;}
  if(command.kind==='terrain'){requireHost();lobby();integer(p.x,0,b.map.w-1,'X');integer(p.y,0,b.map.h-1,'Y');if(!['.','#','~','c'].includes(p.tile)||p.tile==='#'&&occupied(b,p.x,p.y))throw Error('Нельзя изменить занятую клетку.');const index=p.y*b.map.w+p.x;b.map.tiles=b.map.tiles.slice(0,index)+p.tile+b.map.tiles.slice(index+1);b.history=[];return b;}
  if(command.kind==='addUnit'){lobby();const team=b.teams.find(t=>t.id===p.teamId);if(!team||!host&&team.ownerUid!==uid)throw Error('Выберите свою команду.');if(b.units.filter(u=>u.teamId===team.id).length>=8)throw Error('Максимум 8 бойцов в команде.');const u={...sanitizeUnit(p.unit),id:crypto.randomUUID(),teamId:team.id,...spawn(b,team.id)};b.units.push(u);b.history=[];addLog(b,u.name+' присоединился к «'+team.name+'».');return b;}
  if(command.kind==='start'){requireHost();lobby();const teams=livingTeams(b);if(teams.length<2)throw Error('Нужно минимум две команды с бойцами.');const priority=t=>b.units.some(u=>u.teamId===t.id&&u.hp>0&&u.firstTurn),reaction=t=>Math.max(...b.units.filter(u=>u.teamId===t.id&&u.hp>0&&(!priority(t)||u.firstTurn)).map(u=>u.reaction));teams.sort((a,c)=>Number(priority(c))-Number(priority(a))||reaction(c)-reaction(a));b.order=teams.map(t=>t.id);b.turnIndex=0;b.round=1;b.phase='battle';b.pendingMove=null;b.reactions=[];b.units.forEach(u=>{u.stance=null;u.flurry=false;u.shockUsed=false;u.criticalGuards=[];u.opportunityLeft=u.opportunityMax;u.opportunityTargets=[];u.ap=C.canAct(u,b)?u.apMax:0;});b.history=[];addLog(b,'Бой начался. Ход команды «'+activeTeam(b).name+'».');return b;}
  if(command.kind==='pause'){requireHost();if(!['battle','paused'].includes(b.phase))throw Error('Бой ещё не идёт.');b.phase=b.phase==='battle'?'paused':'battle';return b;}
  if(command.kind==='undo'){requireHost();const h=b.history.pop();if(!h)throw Error('Нет действий для отмены.');for(const old of h.units){const index=b.units.findIndex(u=>u.id===old.id);if(index>=0)b.units[index]=old;}Object.assign(b,{phase:h.phase,round:h.round,turnIndex:h.turnIndex,winner:h.winner,pendingMove:h.pendingMove||null,reactions:h.reactions||[]});addLog(b,'Ведущий отменил последнее действие.');return b;}
  if(command.kind==='hp'){requireHost();const target=b.units.find(u=>u.id===p.unitId);if(!target)throw Error('Боец не найден.');remember(b,[target.id]);target.hp=integer(p.value,0,target.hpMax,'HP');addLog(b,'Ведущий: '+target.name+' → '+target.hp+' HP.');return b;}
  const unit=b.units.find(u=>u.id===p.unitId);
  if(command.kind==='action'&&p.action==='refreshSheet'){
   if(!['lobby','paused'].includes(b.phase)||b.pendingMove)throw Error('Обновлять лист можно при расстановке или на паузе без ожидающих атак.');
   if(!unit||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к бойцу.');const fresh=sanitizeUnit(p.unit);if(!unit.sourceId||fresh.sourceId!==unit.sourceId)throw Error('Выберите исходный лист этого бойца.');
   remember(b,b.units.map(u=>u.id));const old=structuredClone(unit),damage=old.hpMax-old.hp;Object.assign(unit,fresh,{hp:Math.max(0,fresh.hpMax-damage),ap:Math.min(old.ap,fresh.apMax)});
   for(const key of ['stance','flurry','shockUsed','shockFails','unconscious','dying','dead','stunnedUntil','opportunityTargets','criticalGuards','traumas'])unit[key]=old[key];
   unit.opportunityLeft=old.opportunityMax?Math.min(old.opportunityLeft,unit.opportunityMax):unit.opportunityMax;
   unit.zones.forEach((z,i)=>{z.damage=old.zones[i].damage;z.tier=old.zones[i].tier;});for(const a of unit.attacks){const previous=old.attacks.find(x=>x.name===a.name);if(previous&&a.ammo!==null)a.ammo=previous.ammo;}
   addLog(b,unit.name+': параметры, оружие и выбранные приёмы обновлены из листа; боевые HP, ОД, боезапас и травмы сохранены.');return b;
  }
  if(command.kind==='action'&&p.action==='appearance'){if(!unit||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к бойцу.');const next=appearance(p);remember(b,[unit.id]);Object.assign(unit,next);return b;}
  if(command.kind==='removeUnit'){lobby();if(!unit||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к бойцу.');b.units=b.units.filter(u=>u.id!==unit.id);b.history=[];return b;}
  if(command.kind==='deploy'){lobby();if(!unit||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к бойцу.');integer(p.x,0,b.map.w-1,'X');integer(p.y,0,b.map.h-1,'Y');if(tile(b,p.x,p.y)==='#'||occupied(b,p.x,p.y,unit.id))throw Error('Клетка занята или непроходима.');unit.x=p.x;unit.y=p.y;return b;}
  if(b.phase!=='battle')throw Error(b.phase==='paused'?'Бой на паузе.':'Сначала начните бой.');const team=activeTeam(b);
  if(command.kind==='action'&&['opportunity','skipOpportunity'].includes(p.action)){resolveOpportunity(b,p,uid,ownerUid,random);return b;}
  if(!team||!host&&team.ownerUid!==uid)throw Error('Сейчас ход другой команды.');
  if(b.pendingMove)throw Error('Сначала разрешите атаки по возможности.');
  if(command.kind==='endTurn'){remember(b,b.units.map(u=>u.id));const living=livingTeams(b);if(living.length<=1){b.phase='finished';b.winner=living[0]?.id||null;return b;}let next=b.turnIndex;do{next++;if(next>=b.order.length){next=0;b.round++;const roundLines=C.nextRound(b,random);if(roundLines.length)addLog(b,roundLines.join('\n'));}}while(!living.some(t=>t.id===b.order[next]));b.turnIndex=next;b.units.forEach(u=>{u.opportunityTargets=[];if(u.teamId===activeTeam(b).id)u.opportunityLeft=u.opportunityMax;});addLog(b,'Раунд '+b.round+'. Ход команды «'+activeTeam(b).name+'».');return b;}
  if(!unit||unit.teamId!==team.id||!owns(b,uid,unit,ownerUid)||!C.canAct(unit,b))throw Error('Выберите доступного бойца текущей команды.');
  if(command.kind==='move'){
   const move=movement(b,unit,p.x,p.y,p.mode);if(move.cost>unit.ap)throw Error('Недостаточно ОД: нужно '+move.cost+'.');remember(b,b.units.map(u=>u.id));unit.ap-=move.cost;unit.flurry=false;
   b.pendingMove={id:crypto.randomUUID(),unitId:unit.id,path:move.path,checked:[],mode:p.mode,cost:move.cost};addLog(b,unit.name+': '+(p.mode==='run'?'бег':p.mode==='jump'?'прыжок':'шаг')+' → '+(p.x+1)+':'+(p.y+1)+' · '+move.cost+' ОД.');advanceMove(b);return b;
  }
  if(command.kind==='attack'){
   const attack=unit.attacks[integer(p.attackIndex,0,7,'атака')];if(!attack)throw Error('Выберите атаку.');const target=b.units.find(u=>u.id===p.targetId);remember(b,b.units.map(u=>u.id));strike(b,unit,target,attack,random);finish(b);return b;
  }
  if(command.kind==='action'&&p.action==='moveSkill'){executeMove(b,unit,p,host,random);finish(b);return b;}
  if(command.kind==='action'){const actions={stand:{cost:4,name:'Встать',posture:'standing'},prone:{cost:1,name:'Лечь',posture:'prone'}},action=actions[p.action];if(!action)throw Error('Неизвестное действие.');if(unit.ap<action.cost)throw Error('Недостаточно ОД.');remember(b,[unit.id]);unit.ap-=action.cost;unit.posture=action.posture;addLog(b,unit.name+': '+action.name+' · '+action.cost+' ОД.');return b;}
  throw Error('Неизвестная команда.');
 }
 return {combat:C,colors,sprites,locations,create,validate,sanitizeUnit,tile,occupied,distance,paths,movement,lineOfSight,dice,activeTeam,owns,apply};
})();
if(typeof module!=='undefined')module.exports=TacticalBattle;
