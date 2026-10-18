/* Deterministic battle rules. Online commands are applied by the room host. */
const TacticalBattle=(()=>{
 const colors=['#82c9ac','#e7897e','#dfbf78','#8eb8e8','#c499db','#d79fca','#a2be74','#82cbd0'];
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
  u.hp=integer(input.hp??u.hpMax,0,u.hpMax,'HP');u.ap=integer(input.ap??u.apMax,0,u.apMax,'текущие ОД');u.posture=input.posture==='prone'?'prone':'standing';
  if(!Array.isArray(input.attacks)||input.attacks.length>8)throw Error('У бойца должно быть не более 8 атак.');
  u.attacks=input.attacks.map(a=>({name:text(a.name,80),cost:integer(a.cost,1,100,'ОД атаки'),chance:number(a.chance,0,1000,'шанс'),damage:text(a.damage,120),bb:number(a.bb??0,0,10000,'ББ'),range:number(a.range,1,10000,'дальность'),ammo:a.ammo===null||a.ammo===undefined?null:integer(a.ammo,-1000000,1000000,'боезапас'),ammoCost:integer(a.ammoCost??0,0,1000,'расход патронов')}));return u;
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
  if(mode==='jump'){if(distance(unit,{x,y})>unit.jump||!lineOfSight(b,unit,{x,y}))throw Error('Прыжок слишком далеко или перекрыт стеной.');return {cost:unit.jumpCost,path:[{x,y}],steps:distance(unit,{x,y})};}
  if(!['walk','run'].includes(mode))throw Error('Выберите способ движения.');if(mode==='run'&&unit.posture==='prone')throw Error('Для бега сначала встаньте.');
  const {dist,prev}=paths(b,unit),end=y*b.map.w+x,steps=dist.get(end);if(steps===undefined)throw Error('Нет доступного пути.');const path=[];let at=end;while(prev.has(at)){path.unshift({x:at%b.map.w,y:Math.floor(at/b.map.w)});at=prev.get(at);}return {cost:Math.max(1,Math.ceil(steps/unit[mode])),steps,path};
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
 function remember(b,ids){b.history.push({units:b.units.filter(u=>ids.includes(u.id)).map(u=>structuredClone(u)),phase:b.phase,round:b.round,turnIndex:b.turnIndex,winner:b.winner});b.history=b.history.slice(-12);}
 function livingTeams(b){return b.teams.filter(t=>b.units.some(u=>u.teamId===t.id&&u.hp>0));}
 function apply(source,command,uid,ownerUid,random=Math.random){
  validate(source);const b=structuredClone(source),p=command.payload||{},host=uid===ownerUid;
  if(!host&&!b.teams.some(t=>t.ownerUid===uid))throw Error('Ведущий ещё не добавил вашу команду.');
  const requireHost=()=>{if(!host)throw Error('Действие доступно только ведущему.');},lobby=()=>{if(b.phase!=='lobby')throw Error('Изменять состав и карту можно до начала боя.');};
  if(command.kind==='team'){requireHost();lobby();if(b.teams.length>=8)throw Error('Максимум 8 команд.');if(p.uid&&b.teams.some(t=>t.ownerUid===p.uid))return b;b.teams.push({id:crypto.randomUUID(),ownerUid:p.uid?text(p.uid,180):ownerUid,name:text(p.name,50),color:colors[b.teams.length]});b.history=[];addLog(b,'Добавлена команда «'+p.name+'».');return b;}
  if(command.kind==='location'){requireHost();lobby();b.map=mapFor(p.key);for(const u of b.units){u.x=-1;u.y=-1;}for(const u of b.units)Object.assign(u,spawn(b,u.teamId));b.history=[];return b;}
  if(command.kind==='terrain'){requireHost();lobby();integer(p.x,0,b.map.w-1,'X');integer(p.y,0,b.map.h-1,'Y');if(!['.','#','~','c'].includes(p.tile)||p.tile==='#'&&occupied(b,p.x,p.y))throw Error('Нельзя изменить занятую клетку.');const index=p.y*b.map.w+p.x;b.map.tiles=b.map.tiles.slice(0,index)+p.tile+b.map.tiles.slice(index+1);b.history=[];return b;}
  if(command.kind==='addUnit'){lobby();const team=b.teams.find(t=>t.id===p.teamId);if(!team||!host&&team.ownerUid!==uid)throw Error('Выберите свою команду.');if(b.units.filter(u=>u.teamId===team.id).length>=8)throw Error('Максимум 8 бойцов в команде.');const u={...sanitizeUnit(p.unit),id:crypto.randomUUID(),teamId:team.id,...spawn(b,team.id)};b.units.push(u);b.history=[];addLog(b,u.name+' присоединился к «'+team.name+'».');return b;}
  if(command.kind==='start'){requireHost();lobby();const teams=livingTeams(b);if(teams.length<2)throw Error('Нужно минимум две команды с бойцами.');teams.sort((a,c)=>Math.max(...b.units.filter(u=>u.teamId===c.id).map(u=>u.reaction))-Math.max(...b.units.filter(u=>u.teamId===a.id).map(u=>u.reaction)));b.order=teams.map(t=>t.id);b.turnIndex=0;b.round=1;b.phase='battle';b.units.forEach(u=>u.ap=u.hp>0?u.apMax:0);b.history=[];addLog(b,'Бой начался. Ход команды «'+activeTeam(b).name+'».');return b;}
  if(command.kind==='pause'){requireHost();if(!['battle','paused'].includes(b.phase))throw Error('Бой ещё не идёт.');b.phase=b.phase==='battle'?'paused':'battle';return b;}
  if(command.kind==='undo'){requireHost();const h=b.history.pop();if(!h)throw Error('Нет действий для отмены.');for(const old of h.units){const index=b.units.findIndex(u=>u.id===old.id);if(index>=0)b.units[index]=old;}Object.assign(b,{phase:h.phase,round:h.round,turnIndex:h.turnIndex,winner:h.winner});addLog(b,'Ведущий отменил последнее действие.');return b;}
  if(command.kind==='hp'){requireHost();const target=b.units.find(u=>u.id===p.unitId);if(!target)throw Error('Боец не найден.');remember(b,[target.id]);target.hp=integer(p.value,0,target.hpMax,'HP');addLog(b,'Ведущий: '+target.name+' → '+target.hp+' HP.');return b;}
  const unit=b.units.find(u=>u.id===p.unitId);
  if(command.kind==='removeUnit'){lobby();if(!unit||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к бойцу.');b.units=b.units.filter(u=>u.id!==unit.id);b.history=[];return b;}
  if(command.kind==='deploy'){lobby();if(!unit||!owns(b,uid,unit,ownerUid))throw Error('Нет доступа к бойцу.');integer(p.x,0,b.map.w-1,'X');integer(p.y,0,b.map.h-1,'Y');if(tile(b,p.x,p.y)==='#'||occupied(b,p.x,p.y,unit.id))throw Error('Клетка занята или непроходима.');unit.x=p.x;unit.y=p.y;return b;}
  if(b.phase!=='battle')throw Error(b.phase==='paused'?'Бой на паузе.':'Сначала начните бой.');const team=activeTeam(b);
  if(!team||!host&&team.ownerUid!==uid)throw Error('Сейчас ход другой команды.');
  if(command.kind==='endTurn'){remember(b,b.units.map(u=>u.id));const living=livingTeams(b);if(living.length<=1){b.phase='finished';b.winner=living[0]?.id||null;return b;}let next=b.turnIndex;do{next++;if(next>=b.order.length){next=0;b.round++;b.units.forEach(u=>u.ap=u.hp>0?u.apMax:0);}}while(!living.some(t=>t.id===b.order[next]));b.turnIndex=next;addLog(b,'Раунд '+b.round+'. Ход команды «'+activeTeam(b).name+'».');return b;}
  if(!unit||unit.teamId!==team.id||!owns(b,uid,unit,ownerUid)||unit.hp<=0)throw Error('Выберите доступного бойца текущей команды.');
  if(command.kind==='move'){const move=movement(b,unit,p.x,p.y,p.mode);if(move.cost>unit.ap)throw Error('Недостаточно ОД: нужно '+move.cost+'.');remember(b,[unit.id]);Object.assign(unit,{x:p.x,y:p.y,ap:unit.ap-move.cost});addLog(b,unit.name+': '+(p.mode==='run'?'бег':p.mode==='jump'?'прыжок':'шаг')+' → '+(p.x+1)+':'+(p.y+1)+' · '+move.cost+' ОД.');return b;}
  if(command.kind==='attack'){
   const target=b.units.find(u=>u.id===p.targetId),attack=unit.attacks[integer(p.attackIndex,0,7,'атака')];if(!target||target.hp<=0||target.teamId===unit.teamId||!attack)throw Error('Выберите противника и атаку.');if(attack.cost>unit.ap)throw Error('Недостаточно ОД.');if(distance(unit,target)>attack.range)throw Error('Цель вне дальности.');if(!lineOfSight(b,unit,target))throw Error('Линия огня перекрыта.');
   dice(attack.damage,()=>0);remember(b,[unit.id,target.id]);unit.ap-=attack.cost;if(attack.ammo!==null)attack.ammo-=attack.ammoCost;
   const roll=1+Math.floor(number(random(),0,.9999999999999999,'бросок')*100),chance=Math.max(0,Math.min(100,attack.chance-(tile(b,target.x,target.y)==='c'?20:0))),hit=roll<=chance;let damage=0;
   if(hit){const raw=dice(attack.damage,random),absorption=Math.max(0,Math.min(100,(target.armor-attack.bb)*10));damage=Math.ceil(raw*(100-absorption)/100);target.hp=Math.max(0,target.hp-damage);}
   addLog(b,unit.name+' → '+target.name+' · '+attack.name+': d100 '+roll+'/'+chance+' · '+(hit?damage+' урона':'промах')+' · '+attack.cost+' ОД.');
   const living=livingTeams(b);if(living.length<=1){b.phase='finished';b.winner=living[0]?.id||null;addLog(b,living[0]?'Победа команды «'+living[0].name+'».':'Бой завершён без победителя.');}return b;
  }
  if(command.kind==='action'){const actions={stand:{cost:4,name:'Встать',posture:'standing'},prone:{cost:1,name:'Лечь',posture:'prone'}},action=actions[p.action];if(!action)throw Error('Неизвестное действие.');if(unit.ap<action.cost)throw Error('Недостаточно ОД.');remember(b,[unit.id]);unit.ap-=action.cost;unit.posture=action.posture;addLog(b,unit.name+': '+action.name+' · '+action.cost+' ОД.');return b;}
  throw Error('Неизвестная команда.');
 }
 return {colors,locations,create,validate,sanitizeUnit,tile,occupied,distance,paths,movement,lineOfSight,dice,activeTeam,owns,apply};
})();
if(typeof module!=='undefined')module.exports=TacticalBattle;
