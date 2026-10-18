/* Players send immutable requests. Only the host may commit the authoritative room state. */
class BattleRoomClient{
 constructor(options){Object.assign(this,options);this.unsub=[];this.code=null;this.generation=0;this.queue=Promise.resolve();this.queued=new Set();this.heartbeat=0;}
 static code(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(8));return [...bytes].map(n=>alphabet[n%32]).join('');}
 static parse(doc){if(doc?.version!==1||typeof doc.stateJson!=='string'||doc.stateJson.length>350000||!Number.isSafeInteger(doc.revision)||doc.revision<1||typeof doc.ownerUid!=='string')throw Error('Неподдерживаемая комната.');return TacticalBattle.validate(JSON.parse(doc.stateJson));}
 ref(...parts){return this.fs.doc(this.db,'battleRooms',this.code,...parts);}
 guard(generation){if(generation!==this.generation||!this.code)throw Error('room-disconnected');}
 disconnect(){this.generation++;for(const off of this.unsub)off();this.unsub=[];clearInterval(this.heartbeat);this.code=null;this.queued.clear();this.queue=Promise.resolve();}
 async create(teamName,location){
  const code=BattleRoomClient.code(),f=this.fs,ref=f.doc(this.db,'battleRooms',code),state=TacticalBattle.create(this.uid,teamName,location);
  await f.runTransaction(this.db,async tx=>{if((await tx.get(ref)).exists())throw Error('Код занят. Повторите создание комнаты.');tx.set(ref,{version:1,ownerUid:this.uid,phase:'lobby',revision:1,stateJson:JSON.stringify(state),createdAt:f.serverTimestamp(),hostSeenAt:f.serverTimestamp()});});
  await this.join(code,teamName);return code;
 }
 async join(value,teamName){
  const code=String(value).toUpperCase().replace(/[\s-]/g,'');if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))throw Error('Введите 8-значный код комнаты.');
  this.disconnect();this.code=code;const generation=this.generation,f=this.fs,room=await f.getDoc(this.ref());this.guard(generation);
  if(!room.exists())throw Error('Комната не найдена.');const data=room.data(),state=BattleRoomClient.parse(data),member=this.ref('members',this.uid),existing=await f.getDoc(member);this.guard(generation);
  if(!existing.exists()){if(state.phase!=='lobby')throw Error('Бой уже начался. Новые команды добавляются в лобби.');if(state.teams.length>=8)throw Error('В комнате уже 8 команд.');await f.setDoc(member,{displayName:String(this.displayName||'Игрок').slice(0,50),teamName:String(teamName||'Моя команда').trim().slice(0,50)||'Моя команда',joinedAt:f.serverTimestamp()});this.guard(generation);}
  this.ownerUid=data.ownerUid;
  this.unsub.push(f.onSnapshot(this.ref(),snapshot=>{if(generation!==this.generation)return;try{if(!snapshot.exists())throw Error('Комната больше недоступна.');const doc=snapshot.data();this.onState?.(BattleRoomClient.parse(doc),doc,code);if(doc.ownerUid===this.uid)this.startHeartbeat(generation);}catch(error){this.onStatus?.(error.message,true);}},error=>{if(generation===this.generation)this.onStatus?.(this.message(error),true);}));
  this.unsub.push(f.onSnapshot(f.collection(this.db,'battleRooms',code,'members'),snapshot=>{if(generation!==this.generation)return;const members=snapshot.docs.map(d=>({uid:d.id,...d.data()}));this.onMembers?.(members);if(this.ownerUid===this.uid)for(const m of members)this.enqueue('member:'+m.uid,()=>this.admit(m,generation));},error=>{if(generation===this.generation)this.onStatus?.(this.message(error),true);}));
  if(this.ownerUid===this.uid)this.unsub.push(f.onSnapshot(f.query(f.collection(this.db,'battleRooms',code,'commands'),f.where('status','==','pending'),f.limit(50)),snapshot=>{if(generation!==this.generation)return;for(const request of [...snapshot.docs].sort((a,b)=>(a.data().createdAt?.toMillis?.()||0)-(b.data().createdAt?.toMillis?.()||0)))this.enqueue(request.id,()=>this.process(request.id,generation));},error=>{if(generation===this.generation)this.onStatus?.(this.message(error),true);}));
  this.onStatus?.('Подключено');return code;
 }
 message(error){return error.code==='permission-denied'?'Опубликуйте обновлённый firestore.rules в Firebase: в нём добавлены комнаты боя.':error.message||'Нет связи с комнатой.';}
 enqueue(id,job){if(this.queued.has(id))return;this.queued.add(id);const generation=this.generation;this.queue=this.queue.catch(()=>{}).then(()=>{this.guard(generation);return job();}).catch(error=>{if(generation===this.generation)this.onStatus?.(this.message(error),true);}).finally(()=>this.queued.delete(id));}
 startHeartbeat(generation){if(this.heartbeat)return;const beat=()=>{if(generation===this.generation&&navigator.onLine)this.fs.updateDoc(this.ref(),{hostSeenAt:this.fs.serverTimestamp()}).catch(()=>{});};beat();this.heartbeat=setInterval(beat,15000);}
 async admit(member,generation){
  await this.fs.runTransaction(this.db,async tx=>{this.guard(generation);const ref=this.ref(),snapshot=await tx.get(ref);this.guard(generation);const doc=snapshot.data(),state=BattleRoomClient.parse(doc);if(doc.ownerUid!==this.uid||state.phase!=='lobby'||state.teams.some(t=>t.ownerUid===member.uid))return;
   const next=TacticalBattle.apply(state,{kind:'team',payload:{uid:member.uid,name:member.teamName||member.displayName}},this.uid,this.uid);tx.update(ref,{stateJson:JSON.stringify(next),revision:doc.revision+1,phase:next.phase,hostSeenAt:this.fs.serverTimestamp()});
  });
 }
 async submit(kind,payload){
  if(!this.code)throw Error('Сначала подключитесь к комнате.');if(!navigator.onLine)throw Error('Нет сети. Дождитесь подключения к комнате.');
  const generation=this.generation,id=crypto.randomUUID(),ref=this.ref('commands',id),json=JSON.stringify(payload);if(json.length>20000)throw Error('Слишком большой запрос.');
  await this.fs.setDoc(ref,{uid:this.uid,kind,payloadJson:json,status:'pending',createdAt:this.fs.serverTimestamp()});this.guard(generation);
  const off=this.fs.onSnapshot(ref,snapshot=>{if(generation!==this.generation||!snapshot.exists())return;const data=snapshot.data();if(data.status==='pending')return;off();this.onResult?.(data.status,data.result||'');},error=>{if(generation===this.generation)this.onResult?.('rejected',this.message(error));});this.unsub.push(off);return id;
 }
 async process(id,generation){
  const f=this.fs;await f.runTransaction(this.db,async tx=>{
   this.guard(generation);const roomRef=this.ref(),commandRef=this.ref('commands',id),room=await tx.get(roomRef),request=await tx.get(commandRef);this.guard(generation);
   if(!request.exists()||request.data().status!=='pending')return;const doc=room.data();if(doc.ownerUid!==this.uid)throw Error('Только ведущий подтверждает действия.');const command=request.data(),member=await tx.get(this.ref('members',command.uid));this.guard(generation);
   try{
    if(!member.exists())throw Error('Участник не состоит в комнате.');const state=BattleRoomClient.parse(doc),payload=JSON.parse(command.payloadJson),next=TacticalBattle.apply(state,{kind:command.kind,payload},command.uid,this.uid,()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296),json=JSON.stringify(next);
    if(new TextEncoder().encode(json).length>350000)throw Error('Комната достигла предела размера.');
    tx.update(roomRef,{stateJson:json,revision:doc.revision+1,phase:next.phase,hostSeenAt:f.serverTimestamp()});tx.update(commandRef,{status:'applied',result:next.log[0]||'Готово',resolvedAt:f.serverTimestamp()});
   }catch(error){tx.update(commandRef,{status:'rejected',result:String(error.message||'Действие отклонено.').slice(0,240),resolvedAt:f.serverTimestamp()});}
  });
 }
}
if(typeof module!=='undefined')module.exports={BattleRoomClient};
