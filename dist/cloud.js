/* Firebase config identifies the public web client. Access is enforced by firestore.rules. */
const firebaseConfig={apiKey:'AIzaSyBX33kHjXXCD-MH6dvbnxE_bor1mwV4C3I',authDomain:'ms-character-sheet.firebaseapp.com',projectId:'ms-character-sheet',storageBucket:'ms-character-sheet.firebasestorage.app',messagingSenderId:'137850447236',appId:'1:137850447236:web:139a22ebb1e50c6e86a9d1'};
let cloudApi=null,cloudAuth=null,cloudDb=null,cloudUser=null,cloudEngine=null,cloudGeneration=0,cloudSwitching=false,cloudBusyEngine=null,cloudDialogOpen=false,cloudTimer=0,cloudStatus='Подключаем Google…',cloudError='',cloudAvailable=false,cloudImportBusy=false;
const googleOAuthClientId='137850447236-n48v3tgcfluq6bs23op4k9alk6smi2kl.apps.googleusercontent.com';
let googleLoginOpen=false,googleLoginBusy=false,googleIdentityPromise=null,googleIdentityInitialized=false;
const guestCharacterStore=characterStore;
function cloudErrorMessage(error){
 const code=error?.code||'';
 if(code==='permission-denied')return 'Нет доступа к Firestore. Создайте базу и опубликуйте правила доступа из firestore.rules.';
 if(code==='auth/unauthorized-domain')return 'Добавьте этот домен в Firebase → Authentication → Settings → Authorized domains.';
 if(code==='auth/operation-not-allowed'||code==='auth/configuration-not-found')return 'Включите Google в Firebase → Authentication → Sign-in method.';
 if(code==='auth/popup-blocked')return 'Браузер заблокировал окно Google. Разрешите всплывающие окна для сайта и повторите вход.';
 if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request')return 'Вход отменён.';
 if(code==='unavailable'||code==='auth/network-request-failed')return 'Нет связи с облаком. Изменения остаются на устройстве и будут отправлены при подключении.';
 return error?.message||'Не удалось подключить облако. Локальные данные сохранены.';
}
function updateCloudStatus(text,error=''){cloudStatus=text;cloudError=error;document.querySelectorAll('[data-cloud-status]').forEach(el=>{el.textContent=error||text;el.classList.toggle('cloud-error',!!error);});const button=document.querySelector('#cloud-account-button');if(button){button.textContent=cloudUser?'☁ Аккаунт':'☁ Google';button.disabled=cloudSwitching;}}
function renderCloudPanel(){return `<section class="cloud-panel" aria-label="Облачное сохранение"><div><b>${cloudUser?'Сохранения Google':'Сохранения между устройствами'}</b>${cloudUser?`<small>${esc(cloudUser.email||cloudUser.displayName||'Google')}</small>`:''}<p data-cloud-status class="${cloudError?'cloud-error':''}" role="status">${esc(cloudError||cloudStatus)}</p></div><button data-cloud="${cloudUser?'account':'login'}" ${!cloudAvailable||cloudSwitching?'disabled':''}>${cloudUser?'Управление':'Войти через Google'}</button></section>`;}
function renderCloudDialog(){return `<dialog id="cloud-dialog" class="formula-dialog" aria-labelledby="cloud-title"><div class="toolbar"><h2 id="cloud-title">Облачные сохранения</h2><button data-cloud="close" aria-label="Закрыть облачные сохранения">×</button></div><p>${esc(cloudUser?.email||'Вход через Google')}</p><p data-cloud-status class="${cloudError?'cloud-error':''}" role="status">${esc(cloudError||cloudStatus)}</p><div class="cloud-actions"><button data-cloud="sync">Синхронизировать сейчас</button><button data-cloud="import-guest">Добавить персонажей с этого устройства</button><button data-cloud="logout">Выйти из Google</button></div><p class="help-copy">У каждого аккаунта отдельная библиотека. Изменения автоматически отправляются в облако. При конфликте сохраняется отдельная копия. После выхода локальные персонажи аккаунта остаются на этом устройстве для следующего входа.</p></dialog>`;}
const beforeCloudRender=render;
render=function(){beforeCloudRender();if(!document.querySelector('#cloud-account-button'))document.querySelector('header>div:last-child').insertAdjacentHTML('beforeend','<button id="cloud-account-button" data-cloud="account" aria-label="Облачные сохранения">☁ Google</button>');if(libraryHome){const library=document.querySelector('.character-library');if(library)library.querySelector('.character-cards').insertAdjacentHTML('beforebegin',renderCloudPanel());}if(cloudDialogOpen){document.querySelector('#view').insertAdjacentHTML('beforeend',renderCloudDialog());document.querySelector('#cloud-dialog').showModal();}if(googleLoginOpen)showGoogleLoginDialog();updateCloudStatus(cloudStatus,cloudError);};
function scheduleCloudSync(delay=3000){clearTimeout(cloudTimer);if(!cloudUser||cloudSwitching)return;cloudTimer=setTimeout(syncCloud,delay);}
function firebaseRemote(uid){
 const f=cloudApi.fs,base=['users',uid],ref=(kind,id)=>f.doc(cloudDb,...base,kind,id);
 return {
  async listRecords(){const docs=await f.getDocs(f.collection(cloudDb,...base,'characters'));return new Map(docs.docs.map(d=>{const value=d.data();if(value.version!==1||!Number.isSafeInteger(value.revision)||value.revision<1)throw Error('Неподдерживаемая версия облачной записи.');return [d.id,value];}));},
  async writeRecord(id,json,expected){return f.runTransaction(cloudDb,async tx=>{const doc=ref('characters',id),old=await tx.get(doc),revision=old.exists()?old.data().revision:0;if(revision!==expected){const error=Error('Персонаж изменён на другом устройстве.');error.code='cloud-conflict';throw error;}tx.set(doc,{version:1,revision:revision+1,json,updatedAt:f.serverTimestamp()});return revision+1;});},
  async putImage(image){
   const doc=ref('images',image.id);if((await f.getDoc(doc)).exists())return;
   const parts=cloudImageParts(await blobToDataUrl(image.blob)),batch=f.writeBatch(cloudDb);
   parts.forEach((data,i)=>batch.set(f.doc(doc,'chunks',String(i)),{data}));batch.set(doc,{version:1,parts:parts.length,name:String(image.name||'portrait').slice(0,160)});try{await batch.commit();}catch(error){if(!(await f.getDoc(doc)).exists())throw error;}
  },
  async getImage(id){
   if(!/^[-\w]{1,180}$/.test(id))throw Error('Некорректный ID портрета.');
   const doc=ref('images',id),snapshot=await f.getDoc(doc);if(!snapshot.exists())throw Error('Облачный портрет пока недоступен. Повторите синхронизацию.');
   const info=snapshot.data();if(info.version!==1||!Number.isSafeInteger(info.parts)||info.parts<1||info.parts>27)throw Error('Повреждён облачный портрет.');
   const chunks=await Promise.all(Array.from({length:info.parts},(_,i)=>f.getDoc(f.doc(doc,'chunks',String(i)))));
   if(chunks.some(c=>!c.exists()||typeof c.data().data!=='string'||c.data().data.length>150000))throw Error('Облачный портрет загружен не полностью.');
   return {id,name:info.name||'portrait',blob:imageFromDataUrl(chunks.map(c=>c.data().data).join(''))};
  }
 };
}
async function syncCloud(){
 const engine=cloudEngine,generation=cloudGeneration;if(!engine||engine.running||cloudBusyEngine===engine||cloudSwitching)return;
 if(!navigator.onLine){updateCloudStatus('Без сети. Изменения сохранены на устройстве.');return;}
 cloudBusyEngine=engine;
 try{
  await persistQueue;if(generation!==cloudGeneration)return;updateCloudStatus('Синхронизация…');
  const result=await engine.sync();if(generation!==cloudGeneration)return;
  const records=await engine.store.list(),images=await engine.store.images();if(generation!==cloudGeneration)return;characterRecords=records;await refreshPortraitUrls(images);
  updateCloudStatus(result?.deferred?'Есть изменения с другого устройства. '+(libraryHome?'Объединяем сохранения…':'Откройте список персонажей для объединения.') :result?.pending?'Отправляем последние изменения…':'✓ Сохранено в Google · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  if(result?.pending&&(!result.deferred||libraryHome)||result?.deferred&&libraryHome)scheduleCloudSync();
  if(libraryHome&&!libraryModal&&!cloudDialogOpen)render();
 }catch(error){if(generation===cloudGeneration)updateCloudStatus('Изменения сохранены на устройстве.',cloudErrorMessage(error));}finally{if(cloudBusyEngine===engine)cloudBusyEngine=null;}
}
async function selectCloudAccount(user){
 if(!user&&!cloudUser&&characterStore===guestCharacterStore){updateCloudStatus('Без входа. Персонажи сохраняются на этом устройстве.');if(libraryHome&&!libraryModal)render();return;}
 document.querySelector('#ui-shell').inert=true;libraryBusy=true;
 const generation=++cloudGeneration;cloudSwitching=true;clearTimeout(cloudTimer);cloudEngine=null;cloudBusyEngine=null;
 try{
  await libraryInitialization;
  if(!libraryHome){save();await persistQueue;}if(generation!==cloudGeneration)return;
  cloudUser=user;libraryHome=true;libraryModal=null;cloudDialogOpen=false;googleLoginOpen=false;activeCharacterId=null;characterRecords=[];libraryReady=false;
  conditionEditor=null;conditionDraft=null;woundDialog=null;effectsOpenSource=null;featPickerOpen=false;creationDraft=null;creationToken=null;resetCharacterUi();
  const store=user?new CharacterStore('sacralic-library-google-'+user.uid):guestCharacterStore;
  if(user)store.cloudTracking=user.uid;await store.open();if(generation!==cloudGeneration)return;
  const records=await store.list(),images=await store.images();if(generation!==cloudGeneration)return;characterStore=store;persistQueue=Promise.resolve();characterRecords=records;await refreshPortraitUrls(images);libraryReady=true;
  if(user){store.onChanged=()=>scheduleCloudSync();cloudEngine=new CloudSyncEngine({store,remote:firebaseRemote(user.uid),isCurrent:()=>cloudGeneration===generation&&characterStore===store,isEditing:id=>!libraryHome&&activeCharacterId===id,onConflict:()=>toast('Изменения с этого устройства сохранены отдельной копией.')});}
  updateCloudStatus(user?'Готово к синхронизации.':'Без входа. Персонажи сохраняются на этом устройстве.');render();
 }catch(error){updateCloudStatus('Не удалось открыть библиотеку.',cloudErrorMessage(error));}
 finally{if(generation===cloudGeneration){cloudSwitching=false;libraryBusy=false;document.querySelector('#ui-shell').inert=false;updateCloudStatus(cloudStatus,cloudError);if(user)scheduleCloudSync(0);}}
}
async function importGuestCharacters(){
 if(cloudImportBusy)return;cloudImportBusy=true;try{
 if(!cloudUser||cloudSwitching)throw Error('Сначала войдите через Google.');const store=characterStore,generation=cloudGeneration;
 await guestCharacterStore.open();const imported=(await store.getMeta('cloud-imported-guest'))?.value||[],records=(await guestCharacterStore.list()).filter(r=>!r.deletedAt&&!imported.includes(r.id)),images=await guestCharacterStore.images();
 if(generation!==cloudGeneration)return;
 const copies=records.map(r=>({...structuredClone(r),id:crypto.randomUUID(),updatedAt:new Date().toISOString()})),ids=new Set(copies.map(r=>r.data.info.portraitId).filter(Boolean));
 await store.commit(copies,images.filter(i=>ids.has(i.id)),[{key:'cloud-imported-guest',value:[...imported,...records.map(r=>r.id)]}]);
 const currentRecords=await store.list(),currentImages=await store.images();if(generation!==cloudGeneration)return;characterRecords=currentRecords;await refreshPortraitUrls(currentImages);toast(copies.length?'Добавлено персонажей: '+copies.length:'Все локальные персонажи уже добавлены.');scheduleCloudSync(0);
 }finally{cloudImportBusy=false;}
}
function closeCloudDialog(){cloudDialogOpen=false;document.querySelector('#cloud-dialog')?.remove();}
document.addEventListener('cancel',event=>{if(event.target.id==='cloud-dialog')closeCloudDialog();if(event.target.id==='google-login-dialog')closeGoogleLogin();},true);
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-cloud]');if(!b)return;event.stopImmediatePropagation();const action=b.dataset.cloud;
 if(action==='close-google'){closeGoogleLogin();return;}if(action==='close'){closeCloudDialog();return;}if(cloudSwitching)return;
 if(action==='account'&&!cloudUser||action==='login'){
  if(!cloudAvailable){toast(cloudError||'Подключение Google ещё не готово.');return;}
  googleLoginOpen=true;showGoogleLoginDialog();return;
 }
 if(action==='account'){cloudDialogOpen=true;document.querySelector('#view').insertAdjacentHTML('beforeend',renderCloudDialog());document.querySelector('#cloud-dialog').showModal();return;}
 if(action==='sync'){closeCloudDialog();syncCloud();return;}
 if(action==='import-guest'){closeCloudDialog();importGuestCharacters().then(()=>render()).catch(error=>toast(cloudErrorMessage(error)));return;}
 if(action==='logout'){closeCloudDialog();window.google?.accounts?.id?.disableAutoSelect();cloudApi.auth.signOut(cloudAuth).catch(error=>toast(cloudErrorMessage(error)));}
},true);
window.addEventListener('online',()=>scheduleCloudSync(0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCloudSync(0);});
document.addEventListener('click',event=>{if(event.target.closest('[data-library="home"]'))scheduleCloudSync(1000);},true);
setInterval(()=>{if(document.visibilityState==='visible')scheduleCloudSync(0);},60000);
async function initializeCloud(){
 try{
  const base='https://www.gstatic.com/firebasejs/13.0.0/';
  const [app,auth,fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
  cloudApi={auth,fs};const firebase=app.initializeApp(firebaseConfig);cloudAuth=auth.getAuth(firebase);cloudDb=fs.getFirestore(firebase);cloudAvailable=true;
  auth.onAuthStateChanged(cloudAuth,user=>selectCloudAccount(user),error=>updateCloudStatus('Google недоступен.',cloudErrorMessage(error)));
 }catch(error){updateCloudStatus('Локальные сохранения доступны.',cloudErrorMessage(error));if(libraryHome)render();}
}
render();initializeCloud();

// Google returns the ID token to this page; Firebase's cross-origin auth handler is not used.
function closeGoogleLogin(){googleLoginOpen=false;document.querySelector('#google-login-dialog')?.remove();}
function loadGoogleIdentity(){
 if(window.google?.accounts?.id)return Promise.resolve(window.google.accounts.id);
 if(googleIdentityPromise)return googleIdentityPromise;
 googleIdentityPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client?hl=ru';script.async=true;
  script.onload=()=>{if(window.google?.accounts?.id)resolve(window.google.accounts.id);else{googleIdentityPromise=null;reject(Error('Не удалось загрузить вход Google. Попробуйте ещё раз.'));}};
  script.onerror=()=>{googleIdentityPromise=null;script.remove();reject(Error('Google недоступен. Проверьте соединение и повторите вход.'));};document.head.append(script);
 });return googleIdentityPromise;
}
async function handleGoogleCredential(response){
 if(!googleLoginOpen||googleLoginBusy||!cloudAvailable)return;
 const note=document.querySelector('[data-google-login-status]');
 if(typeof response?.credential!=='string'||!response.credential){if(note)note.textContent='Google не подтвердил вход. Попробуйте ещё раз.';return;}
 googleLoginBusy=true;if(note)note.textContent='Подтверждаем вход…';updateCloudStatus('Подтверждаем вход Google…');
 try{const credential=cloudApi.auth.GoogleAuthProvider.credential(response.credential);await cloudApi.auth.signInWithCredential(cloudAuth,credential);closeGoogleLogin();}
 catch(error){const message=cloudErrorMessage(error);if(note?.isConnected)note.textContent=message;updateCloudStatus('Без входа.',message);}
 finally{googleLoginBusy=false;}
}
function showGoogleLoginDialog(){
 if(document.querySelector('#google-login-dialog'))return;
 document.querySelector('#view').insertAdjacentHTML('beforeend',`<dialog id="google-login-dialog" class="formula-dialog" aria-labelledby="google-login-title"><div class="toolbar"><h2 id="google-login-title">Вход через Google</h2><button data-cloud="close-google" aria-label="Закрыть вход Google">×</button></div><div id="google-identity-button"></div><p data-google-login-status role="status">Загружаем кнопку Google…</p><p class="help-copy">На телефоне открывайте сайт в Chrome или Safari.</p></dialog>`);
 const dialog=document.querySelector('#google-login-dialog'),host=dialog.querySelector('#google-identity-button');dialog.showModal();
 loadGoogleIdentity().then(identity=>{
  if(!googleLoginOpen||host!==document.querySelector('#google-identity-button'))return;
  if(!googleIdentityInitialized){identity.initialize({client_id:googleOAuthClientId,callback:handleGoogleCredential,ux_mode:'popup',auto_select:false,button_auto_select:false,use_fedcm_for_button:true});googleIdentityInitialized=true;}
  identity.renderButton(host,{type:'standard',theme:'filled_black',size:'large',text:'signin_with',shape:'rectangular',locale:'ru',width:Math.min(320,Math.max(200,host.clientWidth))});dialog.querySelector('[data-google-login-status]').textContent='Выберите Google-аккаунт для своей библиотеки персонажей.';
 }).catch(error=>{if(googleLoginOpen&&host===document.querySelector('#google-identity-button'))dialog.querySelector('[data-google-login-status]').textContent=error.message;});
}
