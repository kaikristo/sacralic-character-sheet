/* Versioned local library; portraits are stored as binary blobs, not in localStorage. */
const LIBRARY_FORMAT='sacralic-character-library';
const LIBRARY_VERSION=1;
const PORTRAIT_TYPES=['image/png','image/jpeg','image/webp','image/gif'];
class CharacterStore {
 constructor(name='sacralic-library'){this.name=name;this.db=null;}
 async open(){
  if(this.db)return this;
  this.db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(this.name,1);
   request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('characters',{keyPath:'id'});db.createObjectStore('images',{keyPath:'id'});db.createObjectStore('meta',{keyPath:'key'});};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Закройте другие вкладки приложения и повторите.'));
  });
  this.db.onversionchange=()=>{this.db.close();this.db=null;};return this;
 }
 transaction(stores,mode,action){return new Promise((resolve,reject)=>{const tx=this.db.transaction(stores,mode);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Ошибка хранилища'));tx.onabort=()=>reject(tx.error||Error('Запись отменена'));try{result=action(tx);}catch(error){tx.abort();reject(error);}});}
 read(store,key){return new Promise((resolve,reject)=>{const tx=this.db.transaction(store,'readonly'),request=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 list(){return this.read('characters');}
 get(id){return this.read('characters',id);}
 put(record){return this.transaction(['characters'],'readwrite',tx=>{tx.objectStore('characters').put(record);});}
 getMeta(key){return this.read('meta',key);}
 putMeta(key,value){return this.transaction(['meta'],'readwrite',tx=>{tx.objectStore('meta').put({key,value});});}
 images(){return this.read('images');}
 image(id){return this.read('images',id);}
 commit(records,images=[],meta=[]){return this.transaction(['characters','images','meta'],'readwrite',tx=>{for(const image of images)tx.objectStore('images').put(image);for(const record of records)tx.objectStore('characters').put(record);for(const item of meta)tx.objectStore('meta').put(item);});}
}
function validateCharacterData(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Нет данных персонажа.');
 const d=JSON.parse(JSON.stringify(input));
 if(!d.info||typeof d.info.name!=='string'||!Array.isArray(d.stats)||d.stats.length!==8||!Array.isArray(d.skills)||!Array.isArray(d.items)||!Array.isArray(d.zones)||d.zones.length!==6)throw Error('Неверная структура персонажа.');
 const codes=['STR','DEX','CON','RTC','ACC','INT','LCK','CHA'];
 if(!codes.every(code=>d.stats.filter(s=>Array.isArray(s)&&s[1]===code&&Number.isSafeInteger(s[2])&&s[2]>=0&&(s[3]===undefined||Number.isFinite(s[3])&&s[3]>=0)).length===1))throw Error('Некорректные характеристики.');
 for(const key of ['hp','maxhp','level','height','weight','money','mutation'])if(!Number.isFinite(d.info[key])||d.info[key]<0)throw Error('Некорректное поле: '+key);
 if(!Number.isSafeInteger(d.info.level)||d.info.level<1)throw Error('Некорректный уровень.');
 if(!d.skills.every(s=>Array.isArray(s)&&s.length>=3&&s.length<=8&&typeof s[0]==='string'&&Number.isSafeInteger(s[1])&&s[1]>=1&&(s[4]===undefined||typeof s[4]==='string'&&s[4].length<=500)))throw Error('Некорректные навыки.');
 if(!d.zones.every(z=>z&&Number.isFinite(z.armor)&&z.armor>=0&&Number.isSafeInteger(z.damage)&&z.damage>=0))throw Error('Некорректные зоны.');
 if(!d.items.every(item=>Array.isArray(item)?item.length===4&&typeof item[0]==='string'&&Number.isFinite(item[1])&&item[1]>=1:item&&typeof item.name==='string'&&Number.isSafeInteger(item.qty)&&item.qty>=1&&['Оружие','Броня','Аксессуары','Прочее'].includes(item.category)&&(!item.bonuses||Object.entries(item.bonuses).every(([k,v])=>codes.includes(k)&&Number.isFinite(v)&&v>=0))))throw Error('Некорректный инвентарь.');
 for(const key of ['race','player','notes'])if(typeof d.info[key]!=='string')d.info[key]='';
 d.log=Array.isArray(d.log)?d.log.filter(s=>typeof s==='string'):[];
 if(d.info.portraitId!==undefined&&typeof d.info.portraitId!=='string')delete d.info.portraitId;
 return d;
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
function imageFromDataUrl(dataUrl){
 if(typeof dataUrl!=='string'||dataUrl.length>20*1024*1024)throw Error('Изображение слишком большое.');
 const match=dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]*={0,2})$/);if(!match)throw Error('Неподдерживаемое изображение в JSON.');
 let binary;try{binary=atob(match[2]);}catch{throw Error('Повреждённое изображение.');}
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 const gif=String.fromCharCode(...bytes.slice(0,3))==='GIF';
 if(!({ 'image/png':png,'image/jpeg':jpg,'image/webp':webp,'image/gif':gif })[match[1]])throw Error('Содержимое изображения не соответствует типу.');
 return new Blob([bytes],{type:match[1]});
}
async function serializeLibrary(records,imageRecords,kind='library'){
 const required=new Set(records.map(r=>r.data.info.portraitId).filter(Boolean));const images=[];
 for(const image of imageRecords)if(required.has(image.id))images.push({id:image.id,name:image.name||'portrait',dataUrl:await blobToDataUrl(image.blob)});
 for(const id of required)if(!images.some(i=>i.id===id))throw Error('Портрет не найден. Повторно загрузите изображение перед экспортом.');
 return JSON.stringify({format:LIBRARY_FORMAT,version:LIBRARY_VERSION,kind,exportedAt:new Date().toISOString(),characters:records,images},null,2);
}
function deserializeLibrary(text,makeId=()=>crypto.randomUUID()){
 if(typeof text!=='string'||text.length>64*1024*1024)throw Error('Файл превышает 64 МБ.');
 let doc;try{doc=JSON.parse(text);}catch{throw Error('Не удалось прочитать JSON.');}
 if(doc?.info)doc={format:LIBRARY_FORMAT,version:1,characters:[{data:doc}],images:[]};
 if(doc?.format!==LIBRARY_FORMAT||doc.version!==LIBRARY_VERSION||!Array.isArray(doc.characters)||!doc.characters.length||doc.characters.length>500||!Array.isArray(doc.images))throw Error('Неподдерживаемый формат или версия библиотеки.');
 const images=[],mapping=new Map();
 for(const image of doc.images){if(!image||typeof image.id!=='string'||mapping.has(image.id))throw Error('Некорректный список изображений.');const id=makeId();mapping.set(image.id,id);images.push({id,name:typeof image.name==='string'?image.name:'portrait',blob:imageFromDataUrl(image.dataUrl)});}
 const now=new Date().toISOString();
 const records=doc.characters.map(record=>{const data=validateCharacterData(record?.data);if(data.info.portraitId){const id=mapping.get(data.info.portraitId);if(!id)throw Error('В файле отсутствует портрет персонажа.');data.info.portraitId=id;}return {id:makeId(),createdAt:now,updatedAt:now,data};});
 return {records,images};
}
if(typeof module!=='undefined')module.exports={CharacterStore,validateCharacterData,serializeLibrary,deserializeLibrary,imageFromDataUrl,LIBRARY_FORMAT};
