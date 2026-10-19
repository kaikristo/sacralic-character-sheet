/* Pure tactical resolution. Imported sheet numbers are snapshots; battle state is independent. */
const TacticalCombat=(()=>{
 const moveNames=['Быстрый удар','Сильный удар','Оглушающий удар','Двойной удар','Сбить с ног','Проникающий удар','Шквал ударов','Мощный удар','Смертельный удар','Круговой удар','Защитная стойка','Атакующая стойка','Яростная стойка','Комбинация'];
 const zoneNames=['ГОЛОВА','ТЕЛО','ЛЕВАЯ РУКА','ПРАВАЯ РУКА','ЛЕВАЯ НОГА','ПРАВАЯ НОГА'];
 const zoneDice=[4,5,1,0,2,3]; // User's d6 convention: 4 = head.
 function n(v,min,max,label){if(!Number.isFinite(v)||v<min||v>max)throw Error('Некорректное значение: '+label);return v;}
 function int(v,min,max,label){n(v,min,max,label);if(!Number.isSafeInteger(v))throw Error('Требуется целое число: '+label);return v;}
 const clean=(v,max=100)=>typeof v==='string'?v.slice(0,max):'';
 const clamp=(v)=>Math.max(0,Math.min(100,v));
 function sanitize(input){
  const stats=Object.fromEntries(['STR','DEX','CON','RTC','ACC','INT','LCK'].map(k=>[k,n(input.stats?.[k]??0,0,10000,k)]));
  const moves=(input.moves??[]);if(!Array.isArray(moves)||moves.length>64)throw Error('Слишком много приёмов.');
  const zones=input.zones??Array.from({length:6},()=>({armor:input.armor??0,damage:0,tier:0}));if(!Array.isArray(zones)||zones.length!==6)throw Error('Нужно шесть зон попадания.');
  const max=int(input.opportunityMax??0,0,100,'заряды атаки по возможности');
  return {stats,moves:moves.map(m=>{if(!moveNames.includes(m.name))throw Error('Неизвестный приём.');return {name:m.name,attackIndex:int(m.attackIndex,0,7,'оружие приёма'),level:int(m.level,0,1000,'навык приёма'),cost:m.cost===null?null:int(m.cost,0,1000,'ОД приёма'),chance:m.chance===null?null:n(m.chance,0,10000,'шанс приёма'),blocked:clean(m.blocked,500),defense:clean(m.defense,40)};}),
   zones:zones.map(z=>({armor:n(z.armor??input.armor??0,0,10000,'броня зоны'),natural:n(z.natural??0,0,10000,'естественная броня'),damage:int(z.damage??0,0,100000000,'урон зоны'),tier:int(z.tier??0,0,3,'травма')})),
   dodge:n(input.dodge??0,0,10000,'уворот'),defenseLevel:int(input.defenseLevel??0,0,1000,'навык защиты'),shock:n(input.shock??stats.CON,0,10000,'стойкость'),painThresholdDisabled:input.painThresholdDisabled===true,shockUsed:input.shockUsed===true,shockFails:int(input.shockFails??0,0,3,'провалы стойкости'),heavyRegen:input.heavyRegen===true,
   unconscious:input.unconscious===true,dying:input.dying===true,dead:input.dead===true,stunnedUntil:int(input.stunnedUntil??0,0,1000000,'оглушение'),hasHead:input.hasHead!==false,
   stance:input.stance?{name:moveNames.includes(input.stance.name)&&/стойка$/.test(input.stance.name)?input.stance.name:'',level:int(input.stance.level,0,1000,'стойка'),until:int(input.stance.until,0,1000000,'длительность стойки')}:null,
   flurry:input.flurry===true,opportunityMax:max,opportunityLeft:int(input.opportunityLeft??max,0,100,'остаток зарядов'),opportunityTargets:Array.isArray(input.opportunityTargets)?input.opportunityTargets.filter(id=>typeof id==='string').slice(0,64):[],
   criticalGuards:Array.isArray(input.criticalGuards)?input.criticalGuards.filter(id=>typeof id==='string').slice(0,64):[],critImmune:input.critImmune===true,traumas:Array.isArray(input.traumas)?input.traumas.map(t=>clean(t,500)).slice(-24):[]};
 }
 function sanitizeAttack(a){return {melee:a.melee===true,level:int(a.level??0,0,1000,'навык атаки'),baseStat:n(a.baseStat??0,0,10000,'стат атаки'),criticalChance:n(a.criticalChance??0,0,10000,'критический шанс'),criticalPower:n(a.criticalPower??0,-100,100,'показатель крита'),criticalMultiplier:n(a.criticalMultiplier??0,0,100,'множитель крита'),hand:['left','right','both'].includes(a.hand)?a.hand:'right'};}
 function roll(sides,random){return 1+Math.floor(n(random(),0,.9999999999999999,'случайное число')*sides);}
 function diceDetails(expression,random=Math.random){
  const raw=String(expression).replace(/\s/g,'');if(!/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/i.test(raw))throw Error('Укажите урон в формате 1d100 + 20.');
  let total=0,count=0;const details=[];
  for(const term of raw.match(/[+-]?[^+-]+/g)){const sign=term[0]==='-'?-1:1,part=term.replace(/^[+-]/,''),m=part.match(/^(\d+)d(\d+)$/i);if(m){const amount=int(+m[1],1,100,'число кубиков'),sides=int(+m[2],2,10000,'грани');count+=amount;if(count>500)throw Error('Слишком много кубиков.');const values=Array.from({length:amount},()=>roll(sides,random));total+=sign*values.reduce((a,b)=>a+b,0);details.push((sign<0?'−':'')+part+' ['+values.join(', ')+']');}else{total+=sign*int(+part,0,10000000,'урон');details.push((sign<0?'−':'+')+part);}}
  return {total:Math.max(0,total),details:details.join(' ')};
 }
 function active(u,b){return u.stance&&u.stance.until>b.round?u.stance:null;}
 function canAct(u,b){return u.hp>0&&!u.dead&&!u.unconscious&&!u.dying&&(u.stunnedUntil||0)<=b.round;}
 function apMax(u,b){return active(u,b)?.name==='Защитная стойка'?Math.max(1,Math.floor(u.apMax/2)):u.apMax;}
 function speed(u,b,mode){const s=active(u,b),legs=u.zones?.slice(4)||[];if(legs.some(z=>z.tier>=2))return mode==='walk'?.5:0;if(legs.some(z=>z.tier>=1)&&mode!=='walk')return 0;let value=u[mode];if(legs.some(z=>z.tier>=1))value/=2;if(s?.name==='Защитная стойка'||s?.name==='Атакующая стойка')value/=2;if(s?.name==='Яростная стойка')value+=1;return value;}
 function penalty(u,attack){let p=0;if(u.zones?.[0].tier>=1)p+=10;if(u.zones?.[1].tier>=1)p+=10;for(const [idx,hand] of [[2,'left'],[3,'right']])if(u.zones?.[idx].tier>=1&&(attack.hand===hand||attack.hand==='both'))p+=20;return p;}
 function attackValues(u,a,b,move=null){const s=active(u,b);let cost=move?move.cost:a.cost,chance=move?move.chance:a.chance;if(u.flurry&&a.melee){if(cost!==null)cost=Math.max(1,cost-1);if(chance!==null)chance/=2;}if(chance!==null){if(s?.name==='Атакующая стойка')chance+=s.level*5;chance-=penalty(u,a);}return {...a,cost,chance,damageFactor:s?.name==='Яростная стойка'?1.5:1,criticalChance:a.criticalChance+(s?.name==='Яростная стойка'?s.level:0)};}
 function defenseValue(target,attacker,attack,b,special='стандарт'){
  const s=active(target,b),stats=target.stats||{},specialFormula=special&&special!=='стандарт';let base=target.posture==='prone'?stats.DEX:target.dodge,pure=stats.DEX,suppression=Math.max(0,(attack.level||0)-(target.defenseLevel||0))*5;
  if(specialFormula){if(special==='CONx3'){base=stats.CON*3;pure=stats.CON;}else if(special==='CONx2'){base=stats.CON*2;pure=stats.CON;}else if(special==='STR+AGL'){base=stats.STR+stats.DEX;pure=base;}else throw Error('Неизвестная защита приёма.');suppression=0;}
  if(s?.name==='Защитная стойка')base+=s.level*5;if(s?.name==='Атакующая стойка')base/=2;
  const impossible=!canAct(target,b)||s?.name==='Яростная стойка';return {chance:impossible?0:clamp(Math.max(pure,base-suppression)),base,pure,suppression,impossible,label:specialFormula?special:'уворот'};
 }
 function shockCheck(u,chance,lines,random,reason){
  if(u.painThresholdDisabled&&!u.shockUsed){u.shockUsed=true;lines.push(u.name+': '+reason+' — УСПЕХ автоматически: фит «Отключение болевого порога» (первый бросок в бою).');return true;}
  const d=roll(100,random),ok=d<=clamp(chance);lines.push(u.name+': '+reason+', d100 = '+d+' ('+chance+'%) — '+(ok?'УСПЕХ':'НЕУСПЕХ')+'.');return ok;
 }
 function wound(u,zone,damage,lines,random){
  const z=u.zones[zone],old=z.tier;z.damage+=damage;const q=Math.ceil(u.hpMax/4),third=Math.ceil(u.hpMax/3),half=Math.ceil(u.hpMax/2);z.tier=z.damage>=half?3:z.damage>=third?2:z.damage>=q?1:0;if(z.tier<=old)return;
  const fraction=['','1/4','1/3','1/2'][z.tier],prefix=u.name+' получает травму: '+zoneNames[zone]+' · '+fraction+' максимальных HP ('+z.damage+'/'+u.hpMax+').';let effect='';
  if(z.tier===1){effect=zone===0?'Все действия −10 п.п.':zone===1?'Физические действия −10 п.п.':zone<4?'Действия этой рукой −20 п.п.':'Шаг ×0,5; бег и прыжок недоступны.';if(!shockCheck(u,u.shock,lines,random,'стойкость от болевого шока'))u.unconscious=true;}
  else if(z.tier===2){effect=zone===0?'При смерти.':zone===1?'Тяжёлое ранение корпуса.':zone<4?'Рукой нельзя пользоваться.':'Нога не действует; только ползком 0,5 клетки / ОД.';if(zone===0)u.dying=true;if(zone===1&&!shockCheck(u,2*u.stats.CON,lines,random,'стойкость 2 × CON')){u.unconscious=true;u.dying=true;}}
  else{effect=zone<2&&!u.heavyRegen?'Немедленная смерть без броска.':'Потеря части тела; при смерти и без сознания.';if(zone<2&&!u.heavyRegen){u.dead=true;u.hp=0;}else{u.dying=true;u.unconscious=true;}}
  const message=prefix+' '+effect;u.traumas.push(message);u.traumas=u.traumas.slice(-24);lines.push(message);
 }
 function resolve(b,unit,target,baseAttack,random,api,options={}){
  const move=options.move||null,a=attackValues(unit,baseAttack,b,move),lines=[],title=move?.name||a.name;
  if(!target||target.hp<=0||target.dead||target.teamId===unit.teamId)throw Error('Выберите живого противника.');
  if(api.distance(unit,target)>a.range)throw Error('Цель вне дальности.');if(!api.lineOfSight(b,unit,target))throw Error('Линия огня перекрыта.');
  if(a.melee&&[2,3].some((idx)=>unit.zones[idx].tier>=2&&(a.hand===(idx===2?'left':'right')||a.hand==='both')))throw Error('Нельзя пользоваться повреждённой рукой.');
  diceDetails(a.damage,()=>0);const chance=clamp(a.chance-(api.tile(b,target.x,target.y)==='c'&&!a.melee?20:0)),d=roll(100,random),hit=d<=chance,critical=hit&&d<=a.criticalChance&&d<=a.baseStat;
  if(!options.free){if(unit.ap<a.cost)throw Error('Недостаточно ОД.');unit.ap-=a.cost;}if(a.ammo!==null){a.ammo-=a.ammoCost;baseAttack.ammo=a.ammo;}
  lines.push(unit.name+' атакует '+target.name+' · '+title+': d100 = '+d+' — '+(hit?'УСПЕХ':'НЕУСПЕХ (промах)')+' ('+chance+'%)'+(critical?' · КРИТИЧЕСКИЙ УСПЕХ':'')+'. '+(options.free?(options.opportunity?'Атака по возможности, 0 ОД.':'ОД за приём уже списаны.'):a.cost+' ОД.')+(a.ammo!==null?' Боезапас: '+a.ammo+'.':''));
  if(!hit)return {lines,hit:false};
  let power=0;
  if(critical){const die=roll(4,random);power=target.critImmune?0:Math.max(0,Math.min(4,die+a.criticalPower));lines.push('Показатель крита: d4 = '+die+'; с бонусами '+power+(target.critImmune?' (иммунитет цели к критам)':'')+'. Защитный бросок не делается.');}
  else{
   const defense=defenseValue(target,unit,a,b,move?.defense),guard=target.criticalGuards.includes(unit.id);
   if(guard&&!defense.impossible){lines.push(target.name+': защита автоматически успешна — критическая защита от этого противника уже сработала в раунде.');return {lines,hit:false};}
   const save=defense.impossible?null:roll(100,random),saved=save!==null&&save<=defense.chance;
   lines.push(target.name+' пробует защититься ('+defense.label+'): '+(save===null?'бросок невозможен':'d100 = '+save)+' ('+defense.chance+'%; база '+defense.base+', подавление −'+defense.suppression+', чистая защита '+defense.pure+') — '+(saved?'УСПЕХ':'НЕУСПЕХ')+'.');
   if(saved){if(save<=target.stats.LCK/2&&save<=defense.pure){target.criticalGuards.push(unit.id);lines.push('Критическая защита: остальные защиты от '+unit.name+' в этом раунде успешны.');}return {lines,hit:false};}
  }
  const rollZone=options.zone!==undefined?null:roll(6,random),zone=options.zone??zoneDice[rollZone-1];int(zone,0,5,'зона попадания');lines.push(unit.name+' кидает зону попадания: '+(rollZone===null?'прицельно':'d6 = '+rollZone)+' — '+zoneNames[zone]+'.');
  const rolled=diceDetails(a.damage,random),factor=a.damageFactor*(move?.name==='Проникающий удар'?.5:1)*(power===4?2:power===3?1.5:1)*(critical?1+a.criticalMultiplier:1),raw=move?.name==='Смертельный удар'?target.hp:Math.ceil(rolled.total*factor),z=target.zones[zone];let armor=z.armor;
  if(move?.name==='Сильный удар'||options.armorIgnore===.5)armor=z.natural+Math.max(0,armor-z.natural)/2;if(move?.name==='Мощный удар'||options.armorIgnore===1)armor=z.natural;
  const bb=a.bb*(power===1?1.5:power>=2?2:1),absorption=power===4?0:clamp((armor-bb)*10),damage=options.skipDamage?0:Math.ceil(raw*(100-absorption)/100);
  lines.push(unit.name+' бросает урон '+a.damage+': '+rolled.details+' = '+rolled.total+(factor!==1?' × '+factor:'')+'. Итого '+raw+'; ББ '+bb+', броня '+armor+' ('+zoneNames[zone]+'). Урон после брони: '+damage+' = округление вверх('+raw+' × '+((100-absorption)/100)+').');
  target.hp=Math.max(0,target.hp-damage);lines.push(target.name+': HP '+target.hp+' / '+target.hpMax+'.');if(damage>0)wound(target,zone,damage,lines,random);
  if(move?.name==='Оглушающий удар'&&target.hasHead&&!target.dead){if(active(target,b)?.name==='Яростная стойка')lines.push(target.name+': иммунитет к оглушению — Яростная стойка.');else{target.stunnedUntil=Math.max(target.stunnedUntil,b.round+move.level);lines.push(target.name+' оглушён на '+move.level+' раундов (до раунда '+target.stunnedUntil+').');}}
  if(move?.name==='Сбить с ног'&&active(target,b)?.name!=='Яростная стойка'){target.posture='prone';lines.push(target.name+' сбит с ног. Подъём: 4 ОД.');}
  return {lines,hit:true,damage,zone};
 }
 function nextRound(b,random){const lines=[];for(const u of b.units){u.criticalGuards=[];u.flurry=false;if(u.stance&&u.stance.until<=b.round){lines.push(u.name+': '+u.stance.name+' закончилась.');u.stance=null;}if(u.stunnedUntil&&u.stunnedUntil<=b.round){lines.push(u.name+': оглушение закончилось.');u.stunnedUntil=0;}if(u.dying&&!u.dead&&!shockCheck(u,u.shock,lines,random,'стойкость при смерти')){u.shockFails++;if(u.shockFails>=3){if(u.painThresholdDisabled){u.dying=false;u.unconscious=true;lines.push(u.name+': без сознания вместо смерти от шока — Отключение болевого порога.');}else{u.dead=true;u.hp=0;lines.push(u.name+': три провала стойкости — смерть.');}}}u.ap=canAct(u,b)?apMax(u,b):0;}return lines;}
 return {moveNames,zoneNames,zoneDice,sanitize,sanitizeAttack,diceDetails,roll,active,canAct,apMax,speed,attackValues,defenseValue,resolve,nextRound};
})();
if(typeof module!=='undefined')module.exports=TacticalCombat;
