const assert=require('node:assert/strict'),B=require('../dist/battle-core.js');
global.TacticalBattle=B;
const {BattleRoomClient}=require('../dist/battle-online.js');
const fighter=(name='Fighter')=>({name,hpMax:100,hp:100,apMax:10,walk:1,run:2,jump:4,jumpCost:2,reaction:15,armor:2,attacks:[{name:'Shot',cost:4,chance:50,damage:'1d6 + 10',bb:1,range:8,ammo:0,ammoCost:1}]});
const cmd=(b,kind,payload={},uid='host',random=()=>0)=>B.apply(b,{kind,payload},uid,'host',random);
function setup(){let b=B.create('host','Alpha','arena');b=cmd(b,'team',{uid:'bob',name:'Bravo'});b=cmd(b,'addUnit',{teamId:b.teams[0].id,unit:fighter('Alice')});b=cmd(b,'addUnit',{teamId:b.teams[1].id,unit:{...fighter('Bob'),reaction:10}},'bob');b=cmd(b,'deploy',{unitId:b.units[0].id,x:1,y:1});b=cmd(b,'deploy',{unitId:b.units[1].id,x:5,y:1},'bob');return b;}
let lobby=setup(),b=cmd(lobby,'start'),a=b.units[0],target=b.units[1];assert.equal(B.activeTeam(b).name,'Alpha');
let priority=setup();priority.units[1].firstTurn=true;assert.equal(B.activeTeam(cmd(priority,'start')).ownerUid,'bob');priority.units[0].firstTurn=true;assert.equal(B.activeTeam(cmd(priority,'start')).ownerUid,'host');
assert.throws(()=>cmd(lobby,'location',{key:'forest'},'bob'),/ведущему/);assert.throws(()=>cmd(lobby,'addUnit',{teamId:lobby.teams[0].id,unit:fighter()},'bob'),/свою/);assert.throws(()=>cmd(lobby,'deploy',{unitId:lobby.units[0].id,x:3,y:3},'bob'),/доступа/);
assert.throws(()=>cmd(b,'move',{unitId:a.id,x:2,y:1,mode:'walk'},'bob'),/другой/);
let moved=cmd(b,'move',{unitId:a.id,x:2,y:2,mode:'walk'});assert.equal(moved.units[0].ap,9);assert.equal(b.units[0].x,1,'input state is immutable');moved=cmd(moved,'undo');assert.equal(moved.units[0].x,1);assert.equal(moved.units[0].ap,10);
assert.equal(B.movement(b,a,3,1,'run').cost,1);assert.throws(()=>cmd(b,'move',{unitId:a.id,x:13,y:8,mode:'walk'}),/Недостаточно/);
let walls=cmd(lobby,'terrain',{x:2,y:1,tile:'#'});walls=cmd(walls,'terrain',{x:1,y:2,tile:'#'});const route=B.movement(walls,walls.units[0],2,2,'walk');assert.ok(route.steps>1,'diagonal corner cutting is forbidden');assert.equal(B.lineOfSight(walls,walls.units[0],{x:2,y:2}),false);assert.throws(()=>B.movement(walls,walls.units[0],2,1,'jump'),/непроходима/);
let rough=cmd(lobby,'terrain',{x:2,y:1,tile:'~'});assert.equal(B.movement(rough,rough.units[0],2,1,'walk').cost,2);
let covered=cmd(lobby,'terrain',{x:5,y:1,tile:'c'});covered=cmd(covered,'start');const missed=cmd(covered,'attack',{unitId:a.id,targetId:target.id,attackIndex:0},'host',()=>.4);assert.equal(missed.units[0].ap,6);assert.equal(missed.units[0].attacks[0].ammo,-1);assert.equal(missed.units[1].hp,100);assert.match(missed.log[0],/промах/);
const hit=cmd(b,'attack',{unitId:a.id,targetId:target.id,attackIndex:0});assert.equal(hit.units[1].hp,90);assert.equal(hit.units[0].ap,6);const undone=cmd(hit,'undo');assert.equal(undone.units[1].hp,100);assert.equal(undone.units[0].attacks[0].ammo,0);
let blocked=cmd(lobby,'terrain',{x:3,y:1,tile:'#'});blocked=cmd(blocked,'start');assert.throws(()=>cmd(blocked,'attack',{unitId:a.id,targetId:target.id,attackIndex:0}),/перекрыта/);
let prone=cmd(b,'action',{unitId:a.id,action:'prone'});assert.equal(prone.units[0].ap,9);assert.throws(()=>cmd(prone,'move',{unitId:a.id,x:2,y:1,mode:'run'}),/встаньте/);
let next=cmd(hit,'endTurn');assert.equal(B.activeTeam(next).ownerUid,'bob');assert.throws(()=>cmd(next,'move',{unitId:a.id,x:2,y:2,mode:'walk'},'bob'),/доступного/);next=cmd(next,'endTurn',{},'bob');assert.equal(next.round,2);assert.equal(next.units[0].ap,10);
assert.throws(()=>cmd(cmd(b,'pause'),'move',{unitId:a.id,x:2,y:2,mode:'walk'}),/паузе/);
let lethal=structuredClone(b);lethal.units[1].hp=1;lethal=cmd(lethal,'attack',{unitId:a.id,targetId:target.id,attackIndex:0});assert.equal(lethal.phase,'finished');assert.equal(lethal.winner,lethal.teams[0].id);lethal=cmd(lethal,'undo');assert.equal(lethal.phase,'battle');assert.equal(lethal.units[1].hp,1);
assert.equal(B.dice('2d6 + 10 - 1',()=>0),11);assert.throws(()=>B.dice('alert(1)'));assert.throws(()=>B.dice('999d100'));assert.throws(()=>B.sanitizeUnit({...fighter(),apMax:-1}));assert.throws(()=>B.validate({...b,map:{...b.map,tiles:'bad'}}));
const maps=Object.keys(B.locations);for(const key of maps){const map=B.create('host','Team',key);B.validate(map);assert.equal(map.map.tiles.length,map.map.w*map.map.h);}
const unsafe=structuredClone(b);unsafe.units[0].id='" onclick="alert(1)';assert.throws(()=>B.validate(unsafe),/ID/);assert.throws(()=>B.validate({...b,map:{...b.map,key:'" onclick="alert(1)'}}),/локация/);

// Cosmetic commands reuse the owner-validated action channel, with no AP cost.
assert.equal(B.sanitizeUnit(fighter()).spriteId,null);assert.equal(B.sanitizeUnit(fighter()).facing,0);assert.equal(B.sprites.length,8);
for(const sprite of B.sprites)assert.equal(B.sanitizeUnit({...fighter(),spriteId:sprite.id,facing:7}).spriteId,sprite.id);
assert.throws(()=>B.sanitizeUnit({...fighter(),spriteId:'https://bad.example/token.png'}),/спрайт/);assert.throws(()=>B.sanitizeUnit({...fighter(),facing:8}),/направление/);
let styled=cmd(b,'action',{action:'appearance',unitId:target.id,spriteId:'mercenary-8',facing:4},'bob');assert.equal(styled.units[1].spriteId,'mercenary-8');assert.equal(styled.units[1].facing,4);assert.equal(styled.units[1].ap,10);assert.equal(b.units[1].spriteId,null);
assert.throws(()=>cmd(b,'action',{action:'appearance',unitId:a.id,spriteId:'mercenary-2'},'bob'),/доступа/);
assert.throws(()=>cmd(b,'action',{action:'appearance',unitId:a.id,spriteId:'bad'}),/спрайт/);
assert.equal(cmd(styled,'undo').units[1].spriteId,null);assert.equal(cmd(lobby,'action',{action:'appearance',unitId:a.id,spriteId:'mercenary-1'}).phase,'lobby');
for(const [x,y,facing] of [[1,2,0],[0,2,1],[0,1,2],[0,0,3],[1,0,4],[2,0,5],[2,1,6],[2,2,7]]){const result=cmd(b,'move',{unitId:a.id,x,y,mode:'walk'});assert.equal(result.units[0].facing,facing);}
assert.equal(cmd(b,'attack',{unitId:a.id,targetId:target.id,attackIndex:0}).units[0].facing,6);
console.log('Passed: all eight sprites, legacy defaults, validated appearance updates, own-team permissions, no AP charge, all eight facing directions and undo.');

// Host protocol: a command receipt and the battle revision commit together; duplicate delivery is harmless.
const docs=new Map(),roomId='ABCDEFGH',roomPath='battleRooms/'+roomId,requestPath=roomPath+'/commands/request';
const snapshot=ref=>({exists:()=>docs.has(ref.path),data:()=>structuredClone(docs.get(ref.path))});
const fs={doc:(db,...parts)=>({path:parts.map(p=>typeof p==='string'?p:p.path).join('/')}),serverTimestamp:()=>123,runTransaction:async(db,fn)=>{const writes=[];await fn({get:async ref=>snapshot(ref),update:(ref,value)=>writes.push([ref,{...docs.get(ref.path),...value}])});writes.forEach(([ref,value])=>docs.set(ref.path,value));}};
(async()=>{
 docs.set(roomPath,{version:1,ownerUid:'host',phase:'battle',revision:1,stateJson:JSON.stringify(b)});docs.set(roomPath+'/members/host',{displayName:'Host'});docs.set(roomPath+'/members/bob',{displayName:'Bob'});docs.set(requestPath,{uid:'host',kind:'attack',payloadJson:JSON.stringify({unitId:a.id,targetId:target.id,attackIndex:0}),status:'pending'});
 const client=new BattleRoomClient({uid:'host',db:{},fs});client.code=roomId;await client.process('request',0);assert.equal(docs.get(requestPath).status,'applied');assert.equal(docs.get(roomPath).revision,2);const applied=docs.get(roomPath).stateJson;await client.process('request',0);assert.equal(docs.get(roomPath).stateJson,applied,'replayed request must not spend AP twice');
 docs.set(requestPath,{uid:'bob',kind:'move',payloadJson:JSON.stringify({unitId:a.id,x:3,y:3,mode:'walk'}),status:'pending'});await client.process('request',0);assert.equal(docs.get(requestPath).status,'rejected');assert.equal(docs.get(roomPath).revision,2);
 docs.set(requestPath,{uid:'intruder',kind:'endTurn',payloadJson:'{}',status:'pending'});await client.process('request',0);assert.equal(docs.get(requestPath).status,'rejected');
 client.disconnect();await assert.rejects(()=>client.process('request',0),/disconnected/);
 console.log('Passed: team ownership, lobby/start/turn permissions, pathfinding and corners, terrain, AP, LOS/cover, armor, signed ammo, undo, round refresh, victory, dice limits and idempotent host processing.');
})().catch(error=>{console.error(error);process.exitCode=1;});
