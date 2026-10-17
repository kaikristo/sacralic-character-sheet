const assert=require('node:assert/strict');
global.validateCharacterData=require('../dist/storage.js').validateCharacterData;
const {CloudSyncEngine,validateCloudRecord,cloudImageParts}=require('../dist/cloud-core.js');
const clone=value=>structuredClone(value);
function character(name='Hero',id='hero'){
 return {id,createdAt:'2026-10-17T00:00:00Z',updatedAt:'2026-10-17T00:00:00Z',data:{info:{name,player:'QA',race:'Человек',notes:'',hp:48,maxhp:48,level:1,height:0,weight:0,money:0,mutation:0},stats:['STR','DEX','CON','RTC','ACC','INT','LCK','CHA'].map(c=>[c,c,8]),skills:[],items:[],zones:Array.from({length:6},()=>({armor:0,damage:0,note:''})),log:[]}};
}
class Store{
 constructor(){this.records=new Map();this.meta=new Map();this.pictures=new Map();this.sequence=0;}
 async list(){return [...this.records.values()].map(clone);}
 async get(id){return clone(this.records.get(id));}
 async cloudSnapshot(id){return {local:clone(this.records.get(id)),dirty:this.meta.get('cloud-dirty:'+id)||null,base:this.meta.get('cloud-base:'+id)||0};}
 async getMeta(key){return {value:this.meta.get(key)};}
 async image(id){return this.pictures.get(id);}
 async put(record){this.records.set(record.id,clone(record));this.meta.set('cloud-dirty:'+record.id,'dirty-'+ ++this.sequence);}
 async ackCloud(id,token,revision){if((this.meta.get('cloud-dirty:'+id)||null)===token)this.meta.set('cloud-dirty:'+id,null);this.meta.set('cloud-base:'+id,Math.max(revision,this.meta.get('cloud-base:'+id)||0));}
 async applyCloudRecord(record,images,token,revision,conflict){if(this.beforeApply){const fn=this.beforeApply;this.beforeApply=null;await fn();}if((this.meta.get('cloud-dirty:'+record.id)||null)!==token)return false;images.forEach(i=>this.pictures.set(i.id,i));this.records.set(record.id,clone(record));this.meta.set('cloud-dirty:'+record.id,null);this.meta.set('cloud-base:'+record.id,revision);if(conflict)await this.put(conflict);return true;}
}
class Remote{
 constructor(){this.records=new Map();this.images=new Map();this.writes=0;}
 async listRecords(){return clone(this.records);}
 async writeRecord(id,json,expected){if(this.beforeWrite){const fn=this.beforeWrite;this.beforeWrite=null;await fn();}const revision=this.records.get(id)?.revision||0;if(revision!==expected){const error=Error('conflict');error.code='cloud-conflict';throw error;}this.records.set(id,{revision:revision+1,json});this.writes++;return revision+1;}
 async putImage(image){this.images.set(image.id,image);}
 async getImage(id){if(!this.images.has(id))throw Error('missing image');return this.images.get(id);}
}
const engine=(store,remote,extra={})=>new CloudSyncEngine({store,remote,isCurrent:()=>true,isEditing:()=>false,...extra});
(async()=>{
 const local=new Store(),remote=new Remote(),hero=character();hero.data.info.portraitId='portrait';local.pictures.set('portrait',{id:'portrait',blob:new Blob(['image'])});await local.put(hero);
 await engine(local,remote).sync();assert.equal(remote.writes,1);assert.equal(remote.records.get('hero').revision,1);assert.equal(local.meta.get('cloud-dirty:hero'),null);assert.ok(remote.images.has('portrait'));
 const changedTime=await local.get('hero');changedTime.updatedAt='2026-10-17T03:00:00Z';await local.put(changedTime);await engine(local,remote).sync();assert.equal(remote.writes,1,'opening a character must not rewrite unchanged cloud content');
 const phone=new Store();await engine(phone,remote).sync();assert.equal(phone.records.get('hero').data.info.name,'Hero');assert.ok(phone.pictures.has('portrait'));
 const fromPhone=await phone.get('hero');fromPhone.data.info.notes='phone edits';await phone.put(fromPhone);await engine(phone,remote).sync();
 const fromPC=await local.get('hero');fromPC.data.info.notes='PC edits';await local.put(fromPC);
 const conflictResult=await engine(local,remote).sync();assert.equal(conflictResult.deferred,true);assert.equal(local.records.get('hero').data.info.notes,'phone edits');const copy=[...local.records.values()].find(r=>r.id!=='hero');assert.equal(copy.data.info.notes,'PC edits');assert.match(copy.data.info.name,/копия/);await engine(local,remote).sync();assert.equal(remote.records.size,2);
 const editing=await phone.get('hero');editing.data.info.notes='currently editing';await phone.put(editing);remote.records.set('hero',{revision:3,json:JSON.stringify({...hero,data:{...hero.data,info:{...hero.data.info,notes:'remote edit'}}})});
 assert.equal((await engine(phone,remote,{isEditing:()=>true}).sync()).deferred,true);assert.equal(phone.records.get('hero').data.info.notes,'currently editing');
 const raceStore=new Store(),raceRemote=new Remote();await raceStore.put(character());raceRemote.beforeWrite=async()=>{const changed=await raceStore.get('hero');changed.data.info.notes='written during upload';await raceStore.put(changed);};
 assert.equal((await engine(raceStore,raceRemote).sync()).pending,true);assert.ok(raceStore.meta.get('cloud-dirty:hero'));await engine(raceStore,raceRemote).sync();assert.equal(JSON.parse(raceRemote.records.get('hero').json).data.info.notes,'written during upload');
 const pull=new Store();pull.beforeApply=async()=>{await pull.put(character('New local edit'));};await engine(pull,raceRemote).sync();assert.equal(pull.records.get('hero').data.info.name,'New local edit','a local write during download must survive');
 const blocked=new Store();let current=true;const swapped=new Remote();swapped.listRecords=async()=>{current=false;return remote.records;};await assert.rejects(()=>engine(blocked,swapped,{isCurrent:()=>current}).sync(),/session-changed/);assert.equal(blocked.records.size,0);
 const tombstone=character('Trash');tombstone.deletedAt='2026-10-17T01:00:00Z';await raceStore.put(tombstone);await engine(raceStore,raceRemote).sync();const other=new Store();await engine(other,raceRemote).sync();assert.equal(other.records.get('hero').deletedAt,tombstone.deletedAt);
 const staleRemote=new Remote(),staleStore=new Store();await staleStore.put(character('Newer tab'));staleStore.meta.set('cloud-base:hero',3);staleStore.meta.set('cloud-dirty:hero',null);staleRemote.records.set('hero',{revision:2,json:JSON.stringify(character('Stale snapshot'))});assert.equal((await engine(staleStore,staleRemote).sync()).deferred,true);assert.equal(staleStore.records.get('hero').data.info.name,'Newer tab');
 const missingRemote=new Remote();missingRemote.records.set('hero',{revision:1,json:JSON.stringify(hero)});const missingLocal=new Store();await assert.rejects(()=>engine(missingLocal,missingRemote).sync(),/missing image/);assert.equal(missingLocal.records.size,0);
 assert.throws(()=>validateCloudRecord(JSON.stringify(character()),'wrong-id'),/Повреждена/);assert.throws(()=>validateCloudRecord('я'.repeat(400000),'hero'),/большой/);
 const parts=cloudImageParts('a'.repeat(310000));assert.deepEqual(parts.map(p=>p.length),[150000,150000,10000]);assert.throws(()=>cloudImageParts('a'.repeat(4000001)),/слишком большой/);
 const fs=require('node:fs'),vm=require('node:vm'),stores=new Map();
 class AccountStore extends Store{constructor(name='guest'){super();if(stores.has(name))return stores.get(name);this.name=name;stores.set(name,this);}async open(){return this;}async images(){return [...this.pictures.values()];}}
 const guest=new AccountStore();await guest.put(character('Guest hero'));
 const element={inert:false,querySelector(){return this;},insertAdjacentHTML(){},remove(){},isConnected:true,classList:{toggle(){}},showModal(){}};
 const ui={console,TextEncoder,crypto,structuredClone,Date,Blob,CharacterStore:AccountStore,CloudSyncEngine,characterStore:guest,libraryInitialization:Promise.resolve(),persistQueue:Promise.resolve(),libraryHome:true,libraryModal:null,libraryReady:true,libraryBusy:false,characterRecords:[],activeCharacterId:null,conditionEditor:null,conditionDraft:null,woundDialog:null,effectsOpenSource:null,featPickerOpen:false,creationDraft:null,creationToken:null,render(){},resetCharacterUi(){},save(){},refreshPortraitUrls:async()=>{},toast(){},esc:String,document:{querySelector:()=>element,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},navigator:{onLine:true},setTimeout:()=>0,clearTimeout(){},setInterval(){}};
 vm.createContext(ui);vm.runInContext(fs.readFileSync(require.resolve('../dist/cloud.js'),'utf8').replace('render();initializeCloud();',''),ui);vm.runInContext('cloudApi={fs:{}}',ui);
 await vm.runInContext('selectCloudAccount({uid:"alice",email:"alice@example.com"})',ui);assert.equal(ui.characterStore.name,'sacralic-library-google-alice');await ui.characterStore.put(character('Alice hero'));
 await vm.runInContext('selectCloudAccount({uid:"bob",email:"bob@example.com"})',ui);assert.equal((await ui.characterStore.list()).length,0,'another account must have an empty isolated library');assert.equal((await guest.list())[0].data.info.name,'Guest hero');
 await vm.runInContext('selectCloudAccount({uid:"alice",email:"alice@example.com"})',ui);assert.equal((await ui.characterStore.list())[0].data.info.name,'Alice hero');
 await vm.runInContext('selectCloudAccount(null)',ui);assert.equal(ui.characterStore,guest);assert.equal(element.inert,false);
 let releaseAlice,enteredAlice;const aliceHeld=new Promise(resolve=>releaseAlice=resolve),aliceEntered=new Promise(resolve=>enteredAlice=resolve),aliceStore=stores.get('sacralic-library-google-alice'),originalList=aliceStore.list.bind(aliceStore);
 aliceStore.list=async()=>{enteredAlice();await aliceHeld;return originalList();};const switchingAlice=vm.runInContext('selectCloudAccount({uid:"alice"})',ui);await aliceEntered;
 await vm.runInContext('selectCloudAccount({uid:"bob"})',ui);releaseAlice();await switchingAlice;assert.equal(ui.characterStore.name,'sacralic-library-google-bob');assert.equal(ui.characterRecords.length,0,'a late response from Alice must not appear in Bob library');assert.equal(element.inert,false);
 let credentialCalls=0,receivedCredential;ui.window.sessionStorage=new Proxy({},{get(){throw Error('sessionStorage must not be used by Google credential handoff');}});
 ui.credentialAuth={GoogleAuthProvider:{credential:token=>({idToken:token})},signInWithCredential:async(auth,credential)=>{credentialCalls++;receivedCredential=credential;}};
 vm.runInContext('cloudApi={auth:credentialAuth};cloudAvailable=true;cloudAuth={};googleLoginOpen=true',ui);
 ui.googleResponse={credential:'signed-google-id-token'};await vm.runInContext('handleGoogleCredential(googleResponse)',ui);assert.equal(credentialCalls,1);assert.deepEqual(receivedCredential,{idToken:'signed-google-id-token'});assert.equal(vm.runInContext('googleLoginOpen',ui),false);
 await vm.runInContext('handleGoogleCredential(googleResponse)',ui);assert.equal(credentialCalls,1,'closed sign-in must ignore late identity callbacks');
 vm.runInContext('googleLoginOpen=true',ui);await vm.runInContext('handleGoogleCredential({})',ui);assert.equal(credentialCalls,1,'missing credentials must not reach Firebase');
 ui.credentialAuth.signInWithCredential=async()=>{throw Object.assign(Error('network'),{code:'auth/network-request-failed'});};await vm.runInContext('handleGoogleCredential(googleResponse)',ui);assert.equal(vm.runInContext('googleLoginBusy',ui),false);assert.equal(vm.runInContext('googleLoginOpen',ui),true);assert.match(vm.runInContext('cloudError',ui),/Нет связи/);
 console.log('Passed: direct Google ID-token handoff without Firebase popup/redirect state, late-callback cancellation, invalid credentials and retry after network failure.');
 console.log('Passed: auth account switching keeps guest, Alice and Bob libraries isolated and restores local account cache.');
 console.log('Passed: cloud round trip with portraits, no-op sync, revision conflicts and copies, active editing deferral, concurrent local changes, account isolation, trash, invalid payloads and image chunk bounds.');
})().catch(error=>{console.error(error);process.exitCode=1;});
