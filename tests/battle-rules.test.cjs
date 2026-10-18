// Optional integration test; run against the local Firestore emulator, never the live project.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),modules=path.join(root,'.openai','battle-rules','node_modules');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(path.join(modules,'@firebase/rules-unit-testing'));
const sdk=require(path.join(modules,'firebase/firestore'));
const {doc,collection,getDoc,getDocs,setDoc,updateDoc,serverTimestamp}=sdk;
global.TacticalBattle=require('../dist/battle-core.js');
const {BattleRoomClient}=require('../dist/battle-online.js');
Object.defineProperty(navigator,'onLine',{value:true,configurable:true});
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-sacralic-battles',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync(path.join(root,'firestore.rules'),'utf8')}});
 const clients=[];
 try{
  await env.clearFirestore();const host=env.authenticatedContext('host').firestore(),alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore(),code='ABCDEFGH';
  const room=db=>doc(db,'battleRooms',code),member=(db,uid)=>doc(db,'battleRooms',code,'members',uid),request=(db,id)=>doc(db,'battleRooms',code,'commands',id);
  const roomData={version:1,ownerUid:'host',phase:'lobby',revision:1,stateJson:'{}',createdAt:serverTimestamp(),hostSeenAt:serverTimestamp()};
  await assertFails(setDoc(room(guest),roomData));await assertSucceeds(setDoc(room(host),roomData));await assertFails(getDoc(room(guest)));await assertFails(getDocs(collection(alice,'battleRooms')));await assertSucceeds(getDoc(room(alice)));
  const membership=name=>({displayName:name,teamName:name+' team',joinedAt:serverTimestamp()});await assertFails(setDoc(member(alice,'bob'),membership('forged')));await assertSucceeds(setDoc(member(alice,'alice'),membership('Alice')));await assertSucceeds(setDoc(member(bob,'bob'),membership('Bob')));await assertSucceeds(setDoc(member(host,'host'),membership('Host')));
  await assertSucceeds(getDocs(collection(alice,'battleRooms',code,'members')));await assertFails(updateDoc(room(alice),{stateJson:'forged',revision:2,hostSeenAt:serverTimestamp()}));await assertFails(updateDoc(room(bob),{hostSeenAt:serverTimestamp()}));await assertFails(updateDoc(room(host),{ownerUid:'alice',hostSeenAt:serverTimestamp()}));
  const command=(uid,kind='move')=>({uid,kind,payloadJson:'{}',status:'pending',createdAt:serverTimestamp()});await assertFails(setDoc(request(alice,'spoof'),command('bob')));await assertFails(setDoc(request(alice,'gm'),command('alice','hp')));await assertSucceeds(setDoc(request(alice,'move1'),command('alice')));await assertFails(getDoc(request(bob,'move1')));await assertSucceeds(getDoc(request(host,'move1')));
  await assertFails(updateDoc(request(alice,'move1'),{status:'applied',result:'cheat',resolvedAt:serverTimestamp()}));await assertSucceeds(updateDoc(request(host,'move1'),{status:'applied',result:'ok',resolvedAt:serverTimestamp()}));await assertFails(setDoc(request(alice,'move1'),command('alice')));await assertFails(updateDoc(request(host,'move1'),{status:'rejected',result:'replay',resolvedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(room(host),{stateJson:'{"round":1}',phase:'battle',revision:2,hostSeenAt:serverTimestamp()}));await assertFails(updateDoc(room(host),{revision:1,hostSeenAt:serverTimestamp()}));await assertFails(setDoc(member(env.authenticatedContext('late').firestore(),'late'),membership('Late')));
  const char=doc(alice,'users','alice','characters','hero');await assertSucceeds(setDoc(char,{version:1,revision:1,json:'{}',updatedAt:serverTimestamp()}));await assertFails(getDoc(doc(bob,'users','alice','characters','hero')));await assertFails(getDoc(doc(host,'users','alice','characters','hero')));assert.equal((await getDoc(char)).exists(),true);
  console.log('Passed Firestore emulator: authenticated invites, no room enumeration, self-only membership, host-only state/HP/receipts, immutable player requests, no replay, lobby join lock and private character libraries.');
  const states={},results={},errors=[];
  const makeClient=(uid,db)=>{const client=new BattleRoomClient({uid,db,fs:sdk,displayName:uid,onState:state=>states[uid]=state,onResult:(status,result)=>results[uid]={status,result},onStatus:(message,error)=>{if(error)errors.push(message);}});clients.push(client);return client;};
  const waitFor=async predicate=>{const end=Date.now()+20000;while(!predicate()){if(Date.now()>end)throw Error('Room synchronization timeout: '+errors.join('; '));await new Promise(resolve=>setTimeout(resolve,50));}};
  const hostClient=makeClient('host',host),playerClient=makeClient('alice',alice),roomCode=await hostClient.create('Host team','arena');
  await playerClient.join(roomCode,'Alice team');await waitFor(()=>states.alice?.teams.length===2&&states.host?.teams.length===2);
  const fighter=(name,reaction)=>({name,hpMax:100,hp:100,apMax:10,walk:1,run:2,jump:3,jumpCost:2,reaction,armor:0,attacks:[{name:'Test shot',cost:4,chance:100,damage:'10',bb:0,range:100,ammo:5,ammoCost:1}]});
  const send=async(client,kind,payload={})=>{delete results[client.uid];await client.submit(kind,payload);await waitFor(()=>results[client.uid]);return results[client.uid];};
  assert.equal((await send(hostClient,'addUnit',{teamId:states.host.teams[0].id,unit:fighter('Host fighter',20)})).status,'applied');
  assert.equal((await send(playerClient,'addUnit',{teamId:states.alice.teams.find(t=>t.ownerUid==='alice').id,unit:fighter('Alice fighter',10)})).status,'applied');
  await waitFor(()=>states.host.units.length===2);assert.equal((await send(hostClient,'start')).status,'applied');await waitFor(()=>states.alice.phase==='battle');
  const hostUnit=states.host.units.find(u=>u.name==='Host fighter'),aliceUnit=states.host.units.find(u=>u.name==='Alice fighter');
  assert.equal((await send(playerClient,'move',{unitId:hostUnit.id,x:3,y:3,mode:'walk'})).status,'rejected');
  assert.equal((await send(hostClient,'attack',{unitId:hostUnit.id,targetId:aliceUnit.id,attackIndex:0})).status,'applied');
  await waitFor(()=>states.alice.units.find(u=>u.id===aliceUnit.id).hp===90);assert.equal(states.alice.units.find(u=>u.id===hostUnit.id).ap,6);assert.equal(states.alice.units.find(u=>u.id===hostUnit.id).attacks[0].ammo,4);
  assert.equal((await send(hostClient,'endTurn')).status,'applied');await waitFor(()=>TacticalBattle.activeTeam(states.alice).ownerUid==='alice');
  assert.equal((await send(playerClient,'move',{unitId:aliceUnit.id,x:12,y:9,mode:'walk'})).status,'applied');await waitFor(()=>states.host.units.find(u=>u.id===aliceUnit.id).ap===9);
  assert.deepEqual(states.host.units,states.alice.units);
  console.log('Passed Firestore integration: two real SDK clients create/join, receive separate teams, import fighters, reject foreign control, synchronize attacks/AP/ammo and complete player turns.');
 }finally{clients.forEach(client=>client.disconnect());await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
