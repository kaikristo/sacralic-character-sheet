/* Account-scoped sync. Revisions, not device clocks, protect concurrent edits. */
function cloudRecordContent(record){return JSON.stringify({data:record.data,deletedAt:record.deletedAt||null});}
function validateCloudRecord(json,id){
 if(typeof json!=='string'||new TextEncoder().encode(json).length>700000)throw Error('Слишком большой или повреждённый персонаж в облаке.');
 const record=JSON.parse(json);
 if(record.id!==id||!/^[-\w]{1,180}$/.test(id)||!Number.isFinite(Date.parse(record.createdAt))||!Number.isFinite(Date.parse(record.updatedAt))||record.deletedAt&&!Number.isFinite(Date.parse(record.deletedAt)))throw Error('Повреждена облачная запись персонажа.');
 record.data=validateCharacterData(record.data);return record;
}
function cloudImageParts(dataUrl){
 if(typeof dataUrl!=='string'||dataUrl.length>4000000)throw Error('Портрет слишком большой для облака (максимум 4 МБ). Локальная копия сохранена.');
 const parts=[];for(let i=0;i<dataUrl.length;i+=150000)parts.push(dataUrl.slice(i,i+150000));return parts;
}
class CloudSyncEngine{
 constructor(options){Object.assign(this,options);this.running=false;}
 check(){if(!this.isCurrent())throw Error('cloud-session-changed');}
 async sync(){
  if(this.running)return;this.running=true;let deferred=false;
  try{
   this.check();const remote=await this.remote.listRecords();this.check();
   const locals=await this.store.list(),all=new Set([...locals.map(r=>r.id),...remote.keys()]);
   for(const id of all){
    this.check();const {local,dirty,base}=await this.store.cloudSnapshot(id),entry=remote.get(id);
    const cloud=entry?validateCloudRecord(entry.json,id):null;
    if(entry&&entry.revision<base){deferred=true;continue;}
    if(cloud&&local&&cloudRecordContent(local)===cloudRecordContent(cloud)){await this.store.ackCloud(id,dirty,entry.revision);continue;}
    if(cloud&&(!local||entry.revision!==base)){
     if(this.isEditing(id)){deferred=true;continue;}
     const images=[],imageId=cloud.data.info.portraitId;if(imageId&&!await this.store.image(imageId))images.push(await this.remote.getImage(imageId));this.check();
     const conflict=local&&dirty?{...structuredClone(local),id:crypto.randomUUID(),updatedAt:new Date().toISOString()}:null;
     if(conflict)conflict.data.info.name+=' (копия с этого устройства)';
     const applied=await this.store.applyCloudRecord(cloud,images,dirty,entry.revision,conflict);this.check();if(!applied){deferred=true;continue;}
     if(conflict){this.onConflict?.(conflict);deferred=true;}
     continue;
    }
    if(local&&(!cloud||dirty)){
     const json=JSON.stringify(local);validateCloudRecord(json,id);
     const imageId=local.data.info.portraitId;if(imageId){const image=await this.store.image(imageId);if(!image)throw Error('Портрет не найден на устройстве.');await this.remote.putImage(image);}this.check();
     try{const revision=await this.remote.writeRecord(id,json,base);this.check();await this.store.ackCloud(id,dirty,revision);}
     catch(error){if(error.code==='cloud-conflict'){deferred=true;continue;}throw error;}
    }
   }
   this.check();let pending=false;for(const record of await this.store.list())if((await this.store.getMeta('cloud-dirty:'+record.id))?.value)pending=true;return {deferred,pending};
  }finally{this.running=false;}
 }
}
if(typeof module!=='undefined')module.exports={CloudSyncEngine,cloudRecordContent,validateCloudRecord,cloudImageParts};
