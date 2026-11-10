const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),elements={};
const element=()=>({value:'',textContent:'',innerHTML:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},prepend(){},insertAdjacentHTML(){},showModal(){},querySelector(){return null;}});
const ctx={structuredClone,console,crypto:webcrypto,Date,Blob,URL,Uint8Array,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},indexedDB:{open:()=>({})},window:{scrollTo(){},matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem(){}},document:{body:element(),documentElement:{style:{setProperty(){}}},createElement:element,querySelector:s=>elements[s]??=element(),querySelectorAll:()=>[],addEventListener(){}}};
vm.createContext(ctx);for(const file of ['combat','experience','catalog','app','rules-data','play','storage','library','effects','workflow','tabletop','wounds'])vm.runInContext(fs.readFileSync(path.join(root,'dist',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const run=s=>vm.runInContext(s,ctx);run('migrateEffects();');


run('state.info.maxhp=100;state.info.hp=72;');assert.equal(run('totalCharacterDamage()'),28);
run('setDistributedDamage(19);');assert.equal(run('distributedDamage()'),19);assert.equal(run('state.info.hp'),53);assert.equal(run('totalCharacterDamage()'),47);run('setDistributedDamage(19)');assert.equal(run('state.info.hp'),53);run('setDistributedDamage(9)');assert.equal(run('state.info.hp'),63);run('setDistributedDamage(19)');assert.equal(run('state.info.hp'),53);assert.throws(()=>run('setDistributedDamage(-1)'),/целое/);
run('setCurrentHealth(60)');assert.equal(run('totalCharacterDamage()'),40);assert.equal(run('distributedDamage()'),19);assert.throws(()=>run('setCurrentHealth(101)'),/HP/);
assert.ok(run('renderBodyMap().indexOf("body-health")<renderBodyMap().indexOf("wound-board")'));assert.ok(run('renderBodyMap().includes("data-newtrauma")'));assert.equal(run('renderZoneStatus()'),'');run('state.traumas=[]');assert.equal(run('renderTraumas()'),'');
run('damageOpen=true;');assert.ok(run('!renderDamageDialog().includes("injury-card")'));run('traumaOpen=true;traumaEdit=-1;state.zones[0].damage=30;');assert.ok(run('renderTraumaDialog().includes("Предполагаемая травма")'));assert.ok(run('renderTraumaDialog().includes("Выбрать эту травму")'));
run('state.traumas=[{zone:0,name:"Ранение",penalty:"Штраф 10%"}]');assert.ok(run('renderTraumas().includes("Ранение")'));assert.ok(run('!renderTraumas().includes("data-newtrauma")'));
assert.deepEqual(JSON.parse(run('JSON.stringify(packColumns([100,50,40],200,8).map(c=>c.items))')),[[0,1],[2]]);assert.deepEqual(JSON.parse(run('JSON.stringify(packColumns([20,50,40],200,8).map(c=>c.items))')),[[0,1,2]]);
run('const copy=validateCharacterData(JSON.parse(JSON.stringify(state)))');assert.equal(run('copy.info.distributedDamage'),19);
console.log('Passed: HP edits and automatic total damage, distributed damage HP accounting, injury suggestion scope, trauma list, compact column packing and persistence.');

(async()=>{
 run('var renameRecord={id:"rename-test",createdAt:"2026-01-01",updatedAt:"2026-01-01",data:structuredClone(state)};characterRecords=[renameRecord];activeCharacterId=renameRecord.id;var storedRename;characterStore.put=async record=>{storedRename=structuredClone(record);};libraryReady=true;libraryHome=true;');
 assert.match(run('renderCharacterLibrary()'),/data-library="rename"/);
 run('renameCharacterId="rename-test";libraryModal="rename";');
 assert.match(run('renderLibraryDialog()'),/rename-character-name/);assert.match(run('renderLibraryDialog()'),/save-rename/);
 await run('renameCharacter("rename-test","  New name <test>  ")');
 assert.equal(run('storedRename.data.info.name'),'New name <test>');assert.equal(run('state.info.name'),'New name <test>');assert.equal(run('storedRename.id'),'rename-test');assert.equal(run('storedRename.createdAt'),'2026-01-01');assert.equal(run('storedRename.data.info.hp'),60);
 assert.match(run('renderCharacterLibrary()'),/New name &lt;test&gt;/);
 await assert.rejects(()=>run('renameCharacter("rename-test","   ")'),/имя/);
 run('characterStore.put=async()=>{throw Error("Write failed");};');
 await assert.rejects(()=>run('renameCharacter("rename-test","Unsaved name")'),/Write failed/);
 assert.equal(run('characterRecords[0].data.info.name'),'New name <test>');assert.equal(run('state.info.name'),'New name <test>');
 run('libraryTrash=true;');assert.doesNotMatch(run('renderCharacterLibrary()'),/data-library="rename"/);
 run('setDistributedDamage(1000);');assert.equal(run('state.info.hp'),0);run('setDistributedDamage(0);');assert.equal(run('state.info.hp'),100);assert.throws(()=>run('setDistributedDamage(1.5)'),/целое/);
 console.log('Passed: saved character rename, escaped labels, identity and data preservation, empty name and failed write handling, damage bounds.');
})().catch(error=>{console.error(error);process.exitCode=1;});
