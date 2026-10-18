/* Audited Sacralic abilities. World events and target decisions remain explicit GM inputs. */
const ABILITY_CATEGORIES=['Простые фиты','Эпик','Престиж-классы'];
const POINT_FEATS={'Образование':['freeSkills',3],'Мастер':['freeSkills',10],'Талант':['freeStats',10]};
const TARGET_FEATS=['Дополнительный навык','На грани безумия','Тактический убийца','Удачливый убийца','Увеличить максимум стата (стат)','Увеличить шанс успеха (навык)','Учитель (навык)','Профессионал (навык)','Смертельная удача','Снять ограничение (стат)','Поднять характеристику (стат)','Взять 20','Исключение промаха'];
const ABILITY_NOTES={
 'Антипревент':'Выберите противников до боя; каждый теряет 3 доступных ОД своего превента против вас. Решение применяет ведущий.',
 'Боевой опыт':'Множитель применяется при начислении опыта с типом «Боевой».',
 'Быстрый стрелок':'Стоимость всех выстрелов уменьшена; прицельная стрельба запрещена.',
 'Всезнайка':'Бонус к знаниям, включая броски без изученного навыка.',
 'Дополнительный навык':'Выбранный навык считается классовым; его предел показан в настройках навыка.',
 'Дуболом':'Попадание в ближнем бою и штраф уворота рассчитываются автоматически.',
 'Крадущаяся тень':'Бонус скрытности и штраф наблюдательности рассчитываются автоматически.',
 'Мастер на все руки':'Бонус ремонта, включая броски без изученного навыка.',
 'Меткий стрелок':'Стоимость выстрела и бонус прицельного попадания рассчитываются автоматически.',
 'Мирный опыт':'Множитель применяется при начислении опыта с типом «Мирный».',
 'На грани безумия':'Выберите пси-дисциплину; бонус и штраф защиты INT применяются к соответствующим броскам.',
 'Неисправимый лгун':'Укажите правду или ложь в настройках источника.',
 'Неудачник':'Аура критического неуспеха действует при LCK < 5. Ведущий учитывает её у всех участников.',
 'Амбидекстрия':'Двойная атака рассчитывает штраф 10% вместо 40% и ОД медленного оружия +1.',
 'Отключение болевого порога':'Первую проверку стойкости можно отметить успешной; смерть от болевого шока заменяется бессознательным состоянием. Иные причины смерти не отменяются.',
 'Отключение критического неуспеха':'Последствия провала классового навыка показаны в результате; потерю раунда подтверждает ведущий.',
 'Образование':'3 очка навыков за каждое взятие; повторная загрузка не выдаёт их заново.',
 'Параноидальная готовность':'Реакция для инициативы и превента увеличена на 5. Дружественные действия запрещены текстом правила.',
 'Попрыгун':'Бонус уворота и штраф ближнего боя рассчитываются автоматически.',
 'Право на ошибку (класс)':'Счётчик 1/день и долг штрафного броска; замену исхода подтверждает ведущий.',
 'Предельная концентрация':'Переключайте пассивную пси-способность в настройках источника.',
 'Псион':'Открывает выбранную ветку псионики и доступ к классу; дисциплина выбирается в настройках.',
 'Серая мышь':'В исходнике шанс указан как N: величину задаёт ведущий, приложение её не выдумывает.',
 'Соколиный глаз':'Бонус наблюдательности и штраф скрытности рассчитываются автоматически.',
 'Тактический убийца':'Выберите навык: мастерство ×1,5, потеря одного дайса за каждый нечётный уровень навыка.',
 'Удачливый убийца':'Выберите навык: мастерство ×0,5, дополнительный дайс за каждый нечётный уровень навыка.',
 'Увеличить максимум стата (стат)':'Каждое взятие имеет отдельную цель. Предел увеличивается на 5.',
 'Увеличить шанс успеха (навык)':'Каждое взятие имеет отдельную цель. Шанс увеличивается на 5 п.п.',
 'Учитель (навык)':'Право обучения выбранному навыку до 3. Опыт за обучение вводится как мирный.',
 'Фаворит':'Положительные и отрицательные изменения репутации умножаются на 2 в калькуляторе способности.',
 'Честный переговорщик':'Укажите правду или ложь в настройках источника.',
 'Профессионал (навык)':'Выбранные навыки и их пределы увеличиваются на 1 за каждое взятие.',
 'Быстрота рефлексов':'Максимальные ОД увеличены на 3 с сохранением уже потраченных ОД.',
 'Первый ход':'При импорте в тактику команда получает приоритет первого хода; равенство решает реакция.',
 'Превент против всех':'Разрешён превент против каждого врага; отдельные реакции разрешает ведущий.',
 'Вне игры':'Активация 1/день, длительность CHA/10 раундов; агрессивное действие снимает эффект. Урон по площади не блокируется.',
 'Снять ограничение (стат)':'Ограничение выбранного параметра снимается; жёсткие расовые исключения сохраняются.',
 'Мастер':'10 очков навыков за каждое взятие, с защитой от повторной выдачи.',
 'Поднять характеристику (стат)':'Выбранный параметр увеличивается на 5. Цели повторных взятий настраиваются отдельно.',
 'Счастливчик (бой)':'Критический шанс боевых навыков увеличен на 5 п.п. за взятие.',
 'Счастливчик (мир)':'Критический шанс мирных навыков увеличен на 5 п.п. за взятие.',
 'Смертельная удача':'Выберите оружейный навык: множитель критического урона увеличен на 1.',
 'Железное здоровье':'Базовые HP увеличиваются на 50% за взятие.',
 'Исключение промаха':'Итог попадания выбранным навыком равен 95% до ситуационных штрафов.',
 'Взять 20':'Параметр считается 20 с учётом своего максимума.',
 'Талант':'10 очков характеристик с защитой от повторной выдачи.',
 'Улучшенное исчезновение':'Шаг разрешён в исчезновении; обнаружение и видимость разрешает ведущий.',
 '9 жизней':'9 невосстанавливаемых зарядов; применение оставляет 1 HP и запрещает активные действия до отдыха в течение суток.',
 'Улучшенный духовный выстрел':'Число X вводится по расовой способности; духовный урон рассчитывается как Xd100.',
 'Маска':'Мирные активные действия сохраняют скрытность; атака по-прежнему раскрывает персонажа.',
 'Телохранитель':'Перехват за 1 ОД; флаг атаки охраняемого включает lvl/4 к атаке.',
 'Бастион':'Модификатор HP = 3; входящий показатель крита снижен на 1 за 20 уровней класса.',
 'Уворотчик':'Уворот и контрудар получают 10 п.п.; критический контрудар имеет показатель 1.',
 'Разрушитель':'Для двуручного ближнего оружия: −1 ОД, дайсы за уровень, досягаемость +1 и две цели.',
 'Железный кулак':'Только голый кулак: ББ за каждые 5 уровней персонажа, d100 за каждые 20. Кастеты и перчатки исключают бонус.',
 'Джаггернаут':'1/раунд движение с атакой; при попадании временные HP = CON × пройденные клетки до конца раунда.',
 'Критовик (да да, тупое название - придумайте лучше)':'Критический шанс за уровни класса и множитель критического урона ближнего боя.',
 'Кубинский охотник':'Лимит трофеев рассчитан. Эффекты конкретных трофеев задаёт ведущий через ручные эффекты источника; одинаковые трофеи не складываются.',
 'Снайпер':'Включите оптику для прицельного бонуса ACC; критический промах снайперским оружием становится обычным.',
 'Автоматчик':'Очередь: −1 ОД, каждая попавшая пуля получает урон ACC.',
 'Штурмовик':'Автоматическая прибавка брони и снижение входящего показателя крита за уровни класса.',
 'Пулеметчик':'Пулемёты получают ББ за уровни класса. Шквальная очередь 1/раунд: +2 ОД, удвоенные боезапас и разброс.',
 'Легкий стрелок':'Шаг и бег +1; выстрел лёгкого оружия −1 ОД, минимум 3.',
 'Гранатометчик':'Тяжёлое оружие по площади получает дайсы за уровень класса. Урон союзникам ×0,5, при крите 0; выбор целей подтверждает ведущий.',
 'Поджигатель':'Горение длится S раундов и наносит половину начального урона; включите горящую цель для бонуса урона lvl.',
 'Тирадор':'Критический шанс за уровни класса и множитель критического урона стрелкового оружия.',
 'Ниндзя':'Вход в скрытность за 1 ОД, включая нахождение на виду. Обнаружение разрешает ведущий.',
 'Пирокинетик':'Переключатель особого урона при критическом пирокинезе; критический промах не имеет негативных последствий.',
 'Ясновидец':'Бесплатное действие в конце первого раунда отмечается отдельно. Связь с союзниками тратит половину EP; выбор до S целей подтверждает ведущий.',
 'Материализатор':'Максимальные HP увеличены на EP; критическая материализация восстанавливает стоимость вместо траты.',
 'Телепат':'Шанс INT-эффектов псионики = INT+10. Критический успех участника боя восстанавливает S EP по кнопке события.',
 'Шаман':'Флаг зла городов даёт INT/2 к криту. При отсутствии зла городов в S×20 клетках восстанавливается S EP/раунд.',
 'Варден':'Пси-способности можно оплачивать HP по 10 HP за EP; получение урона за EP подтверждается отдельно. Самовосстановление ограничено правилом.',
 'Пси-универсал':'EP увеличены на уровень класса; регенерация за раунд без псионики. Слишком слабые дисциплины недоступны для применения.',
 'Искатель':'Счётчики отмены событий LCK/10 и переброса LCK 1/день. Универсальное знание дикой местности — право по правилу.',
 'Следопыт':'Выберите знание местности и включите контекст. Нахождение следов бросается от ACC, распознавание — от INT.',
 'Игрок':'Выбранная игра получает lvl/4. Последствия критических неудач классовых навыков игнорируются.',
 'Шпион':'Отдельный перераспределяемый пул SP = lvl/3; двойной бросок скрытности и лицедейства, выбор союзников подтверждает ведущий.',
 'Сыщик':'Гипотеза 1/квест, проверка правды чистым INT 1/разговор; ответ даёт ведущий.',
 'Вор':'Контексты противозаконного действия и успешного уворота включают LCK; атака автоматически снимает бонус защитной серии.',
 'Отравитель':'Показан штраф защиты цели lvl/3; яды могут критовать и не отравляют самого персонажа при провале.',
 'Уличный бард':'Бросок слухов от CHA и исполнение песни с результатом 25; репертуар S−5 подтверждается игроком.',
 'Зверовод: Хозяин стаи':'Показаны CHA-шанс стаи и разброс. Состав стаи, отдельные HP и распределение попаданий задаёт ведущий.',
 'Зверовод: верный друг':'Контекст близкого питомца включает бонус ОД CHA/10. Условие «при смерти» и радиус S проверяются ведущим.',
 'Маэстро':'Исполнение lvl/3; создание произведения получает CHA к критическому шансу по включённому контексту.',
 'Дипломат':'Убеждение lvl/3; счётчик вопроса о мотивах 1/разговор.',
 'Водитель-универсал':'Калькулятор HP транспорта ×2; вождение незнакомого транспорта разрешено правилом.',
 'Таксист':'Иммунитет случайным негативным событиям в знакомом городе за рулём; информацию по знанию города выдаёт ведущий.',
 'Механик':'Экстренный ремонт за 10 ОД и бросок ремонта; длительность lvl/2. Повторный ремонт того же механизма запрещён правилом.',
 'Специалист':'Выбранный производственный навык: очки ×2; игнорирование сложности строго ниже lvl/2.',
 'Хакер':'Безопасная попытка lvl/2% 1/день без крита и подавления. При подавлении ≥2 результат успешен без броска.',
 'Специалист (ученый - название идет по специальности, например - химик, математик и т.д.)':'Выбранный научный навык: очки исследования ×2; игнорирование сложности строго ниже lvl/2.',
 'Знаток':'Неограниченный рост знаний; исследования и производство запрещены. Поиск готовой информации успешен без броска.',
 'Безумный ученый':'Контекст идеи даёт ±lvl/2 к броскам и двойные очки производства/исследования для идеи.'
};
function abilitySource(name){return selectedEffectSources().find(s=>s.title===name&&sourceConfig(s.id).enabled!==false);}
function abilityLevel(name){const s=abilitySource(name);return s?effectsForSource(s).level:0;}
function abilityConfig(name){const s=abilitySource(name);return s?sourceConfig(s.id):{};}
function abilitySkillLevel(pattern){return Math.max(0,...state.skills.filter(s=>pattern.test(skillEffectName(s))).map(effectiveSkillLevel));}
function abilityState(){return state.play.rules;}
function migrateAbilityState(){
 const p=state.play;if(!p.rules||typeof p.rules!=='object'||Array.isArray(p.rules))p.rules={};const r=p.rules;
 for(const key of ['pointLedger','legacyGrants','uses'])if(!r[key]||typeof r[key]!=='object'||Array.isArray(r[key]))r[key]={};
 if(!r.grantsMigrated){for(const source of selectedEffectSources())if(POINT_FEATS[source.title]){const count=Math.max(1,Math.min(50,sourceConfig(source.id).count||1));if(!Number.isSafeInteger(r.pointLedger[source.id])){r.legacyGrants[source.id]=count;r.pointLedger[source.id]=0;}}r.grantsMigrated=true;}
 for(const [key,n] of Object.entries(r.uses))if(!Number.isSafeInteger(n)||n<0)delete r.uses[key];
 if(!Number.isSafeInteger(r.day)||r.day<1)r.day=1;if(!Number.isSafeInteger(r.conversation))r.conversation=1;if(!Number.isSafeInteger(r.quest))r.quest=1;
 if(!Number.isFinite(r.epSpent)||r.epSpent<0)r.epSpent=0;
 if(!r.stance||!['Защитная стойка','Атакующая стойка','Яростная стойка'].includes(r.stance.name)||!Number.isSafeInteger(r.stance.until)||r.stance.until<=p.round)r.stance=null;
 if(r.tempHpRound!==p.round)r.tempHp=0;
 if(!Number.isFinite(r.tempHp)||r.tempHp<0)r.tempHp=0;
 if(r.flurryRound!==p.round)r.flurry=false;
 if(!r.meleeBase||typeof r.meleeBase!=='object')r.meleeBase={cost:null,damage:''};
 r.meleeBase.cost=Number.isSafeInteger(r.meleeBase.cost)&&r.meleeBase.cost>=1&&r.meleeBase.cost<=1000?r.meleeBase.cost:null;
 r.meleeBase.damage=typeof r.meleeBase.damage==='string'?r.meleeBase.damage.slice(0,120):'';
 for(const cfg of Object.values(state.effects.sources))if(cfg&&typeof cfg==='object'){
  if(!Array.isArray(cfg.picks))delete cfg.picks;
  if(!Array.isArray(cfg.spyAllocations))delete cfg.spyAllocations;else cfg.spyAllocations=cfg.spyAllocations.filter(a=>a&&typeof a.skill==='string'&&Number.isSafeInteger(a.levels)&&a.levels>=0&&a.levels<=50);
  if(!Number.isFinite(cfg.manualChance))delete cfg.manualChance;
 }
}
function syncFeatGrants(){
 const r=abilityState();for(const [name,[bank,amount]] of Object.entries(POINT_FEATS)){
  const source=RULE_ENTRIES.find(e=>e.title===name&&ABILITY_CATEGORIES.includes(e.category));if(!source)continue;
  const selected=state.play.pinned.includes(source.id)?Math.max(1,Math.min(50,sourceConfig(source.id).count||1)):0;
  const pending=Number.isSafeInteger(r.legacyGrants[source.id])?Math.max(0,Math.min(selected,r.legacyGrants[source.id])):0;if(pending)r.legacyGrants[source.id]=pending;else delete r.legacyGrants[source.id];
  const target=sourceConfig(source.id).enabled!==false?selected-pending:0,prior=Number.isSafeInteger(r.pointLedger[source.id])?r.pointLedger[source.id]:0,delta=(target-prior)*amount;
  if(Number.isSafeInteger(state.info[bank]+delta)){state.info[bank]+=delta;r.pointLedger[source.id]=target;}
 }
}
function resolveLegacyFeatGrant(id,grant){const e=RULE_ENTRIES.find(e=>e.id===id),pending=abilityState().legacyGrants[id]||0;if(!e||!POINT_FEATS[e.title]||!pending)return;const [bank,amount]=POINT_FEATS[e.title];if(grant){if(!Number.isSafeInteger(state.info[bank]+pending*amount))throw Error('Слишком много очков.');state.info[bank]+=pending*amount;}abilityState().pointLedger[id]=(abilityState().pointLedger[id]||0)+pending;delete abilityState().legacyGrants[id];}
const beforeAbilityMigrate=migrateEffects;
migrateEffects=function(){beforeAbilityMigrate();migrateAbilityState();syncFeatGrants();};
const beforeAbilitySkillMatches=effectSkillMatches;
effectSkillMatches=function(skill,scope){
 if(scope==='combatAttack')return skill[2]==='Боевые'||isPsiSkill(skill);
 if(scope==='rangedOnly')return !!combatKey(skill)?.startsWith('Стрельба');
 if(scope==='pyro')return /пирокин/i.test(skill[0]);
 if(scope==='craft')return /крафт|производств|ремонт/i.test(skill[0]);
 return beforeAbilitySkillMatches(skill,scope);
};
const beforeAbilityModel=effectsForSource;
effectsForSource=function(source,configuration){
 const cfg=configuration||sourceConfig(source.id),count=Number.isSafeInteger(cfg.count)?Math.max(1,Math.min(50,cfg.count)):1;
 if(TARGET_FEATS.includes(source.title)&&count>1&&!configuration){
  const models=Array.from({length:count},(_,i)=>beforeAbilityModel(source,{...cfg,...cfg.picks?.[i],count:1}));
  const extras=Array.from({length:count},(_,i)=>abilityExtraModel(source,{...cfg,...cfg.picks?.[i],count:1},models[i]));
  const model=extras[0];model.cfg=cfg;model.count=count;model.effects=extras.flatMap((m,i)=>m.effects.filter(e=>!i||e.id.startsWith(source.id+'/')).map(e=>({...e,id:i?e.id+'/take-'+i:e.id,label:e.label+' · взятие '+(i+1)})));return model;
 }
 const picked=TARGET_FEATS.includes(source.title)&&cfg.picks?.[0]?{...cfg,...cfg.picks[0]}:cfg;
 return abilityExtraModel(source,picked,beforeAbilityModel(source,picked));
};
function abilityExtraModel(source,cfg,model){
 const name=source.title,level=model.level,count=model.count;
 const add=(target,value,label,opts={})=>model.effects.push({id:source.id+'/audit-'+effectNorm(target+' '+label),sourceId:source.id,source:name,url:source.url,target,value,label,op:'add',sourceEnabled:cfg.enabled!==false,...opts});
 const choice=(key,label,type='skill')=>{if(!model.choices.some(c=>c.key===key))model.choices.push({key,label,type});return cfg[key]||'';};
 const condition=(key,label)=>{if(!model.conditions.some(c=>c.key===key))model.conditions.push({key,label});return !!cfg.conditions?.[key];};
 if(['Тактический убийца','Удачливый убийца','Смертельная удача','Дополнительный навык','Учитель (навык)','Псион'].includes(name))choice('skill',name==='Псион'?'Открытая пси-дисциплина':'Выбранный навык');
 if(name==='Дополнительный навык'){const id=cfg.skill;add('skillCap:'+id,5,'Классовый навык',{op:'set',requires:!!id});}
 if(name==='Боевой опыт'||name==='Мирный опыт')add(name==='Боевой опыт'?'xp:combat':'xp:peaceful',25*Math.min(2,count),'Бонус получаемого опыта',{op:'percent'});
 if(name==='Неудачник')add('fumbleAura',5*count,'Шанс критического неуспеха всех участников',{luckBelow:5});
 if(name==='Фаворит')add('reputation',2,'Положительная и отрицательная репутация',{op:'multiply'});
 if(name==='Бастион'||name==='Штурмовик')add('incomingCriticalPower',-Math.floor(level/20),'Показатель крита атакующего');
 if(name==='Штурмовик')add('armor',Math.floor(level/10),'Дополнительная броня');
 if(name==='Уворотчик')add('counterChance',10,'Шанс контрудара');
 if(name.startsWith('Критовик')){add('critical',Math.floor(level/10),'Критический шанс ближнего боя',{scope:'melee'});add('criticalMultiplier',1,'Множитель критического урона',{scope:'melee'});}
 if(name==='Тирадор'){add('critical',Math.floor(level/10),'Критический шанс стрельбы',{scope:'rangedOnly'});add('criticalMultiplier',1,'Множитель критического урона',{scope:'rangedOnly'});}
 if(name==='Смертельная удача')add('criticalMultiplier',count,'Множитель критического урона',{scope:'id:'+cfg.skill,requires:!!cfg.skill});
 if(name==='Пси-универсал')add('energy',level,'EP за уровень класса');
 if(name==='Шпион')for(const allocation of cfg.spyAllocations||[])if(Number.isSafeInteger(allocation.levels)&&allocation.levels>0&&allocation.levels<=50&&state.skills.some(s=>skillIdentity(s)===allocation.skill))add('skillLevel',allocation.levels,'Перевоплощение: '+allocation.skill,{scope:'id:'+allocation.skill});
 if(name==='Шаман')add('critical','INT','Крит по злу городов',{op:'addHalf',scope:'combatAttack',condition:condition('urbanEvil','Цель имеет зло городов')});
 if(name==='Маэстро')add('critical','CHA','Создание произведения искусства',{scope:'art',condition:condition('creation','Создаёт произведение искусства')});
 if(name==='Поджигатель')condition('burningTarget','Цель подожжена этим персонажем');
 if(name==='Шаман')condition('noUrbanEvil','В радиусе S×20 нет зла городов: регенерация EP');
 if(name==='Пулеметчик')condition('suppressiveBurst','Шквальная очередь: +2 ОД, удвоенные пули и разброс');
 if(name==='Снайпер')condition('optics','Прицельный выстрел с оптикой');
 if(['Специалист','Специалист (ученый - название идет по специальности, например - химик, математик и т.д.)'].includes(name))choice('skill','Навык специальности');
 return model;
}
const beforeAbilityExpression=effectExpression;
effectExpression=function(value,spec){const n=beforeAbilityExpression(value,spec);return spec.op==='addHalf'?n/2:n;};
const beforeAbilityApplicable=applicableEffects;
applicableEffects=function(target,context={}){return beforeAbilityApplicable(target,context).map(e=>({...e,op:e.op==='addHalf'?'add':e.op,enabled:e.enabled&&(!e.luckBelow||statTotal('LCK')<e.luckBelow)}));};
const beforeAbilityIsPsi=isPsiSkill;
isPsiSkill=function(s){return beforeAbilityIsPsi(s)||/шаманизм/i.test(s[0]);};
const beforeAbilityEnergy=energyValues;
energyValues=function(){const e=beforeAbilityEnergy();return {...e,max:Math.max(0,Math.floor(resolveEffectTarget(e.max,'energy').value))};};
function currentEnergy(){return Math.max(0,energyValues().max-abilityState().epSpent);}
function changeEnergy(delta){if(!Number.isFinite(delta))throw Error('Проверьте EP.');const r=abilityState();r.epSpent=Math.max(0,r.epSpent-delta);}
function classSkillSources(skill){
 const names=[];for(const source of selectedEffectSources().filter(s=>sourceConfig(s.id).enabled!==false)){
  const cfg=sourceConfig(source.id);if(source.title==='Дополнительный навык'&&[cfg,...cfg.picks||[]].some(c=>c.skill===skillIdentity(skill)))names.push(source.title);
  if(['Классы','Престиж-классы'].includes(source.category)){const text=ruleTable(source.category)?.rows[source.row-1]?.[2]||'';if(String(text).split(/[,\n\r]/).some(t=>effectNorm(t).length>3&&effectNorm(skillEffectName(skill)).includes(effectNorm(t))))names.push(source.title);}
 }return names;
}
function skillMaximum(skill){return resolveEffectTarget(5,'skillCap:'+skillIdentity(skill),{skill}).value;}
function abilityRollAdvice(skill,mode){
 const result=[];if(classSkillSources(skill).length){if(abilitySource('Игрок'))result.push('Игрок: эффекты критического неуспеха игнорируются, включая 000.');else if(abilitySource('Отключение критического неуспеха'))result.push('Классовый критический неуспех: только потеря раунда; 000 разрешается как обычный критический неуспех.');}
 if(combatKey(skill)==='Стрельба(снайпер)'&&abilitySource('Снайпер'))result.push('Критический промах считается обычным.');
 if(/пирокин/i.test(skill[0])&&abilitySource('Пирокинетик'))result.push('Критический промах не имеет негативных последствий; крит можно заменить особым уроном с показателем 1.');
 if(mode==='defense'&&abilityState().stance?.name==='Яростная стойка')result.push('Яростная стойка: защита автоматически неуспешна.');
 return result;
}
const beforeAbilityRoll=resolveRoll;
resolveRoll=function(skill,mode,modifier,superiority,roll){
 if(mode==='aimed'&&combatKey(skill)?.startsWith('Стрельба')&&abilitySource('Быстрый стрелок'))throw Error('Быстрый стрелок запрещает прицельный выстрел.');
 if(abilitySource('Знаток')&&/крафт|производств|исследован/i.test(skillEffectName(skill)))throw Error('Знаток не может вести исследования и производство.');
 const originalModifier=modifier;
 if(modifier<0)for(const src of selectedEffectSources().filter(s=>s.title.startsWith('Специалист')&&sourceConfig(s.id).enabled!==false&&sourceConfig(s.id).skill===skillIdentity(skill)))if(-modifier<effectsForSource(src).level/2)modifier=0;
 const r=beforeAbilityRoll(skill,mode,modifier,superiority,roll),stance=abilityState().stance;
 if(stance){if(mode==='defense'){if(stance.name==='Защитная стойка')r.target+=stance.level*5;if(stance.name==='Атакующая стойка')r.target/=2;}else if(stance.name==='Атакующая стойка'&&effectSkillMatches(skill,'combatAttack'))r.target+=stance.level*5;
  r.success=roll<=r.target||r.pure;r.critical=r.success&&roll<=r.base&&roll<=resolveEffectTarget(statTotal('LCK')/2,'critical',{skill,mode}).value;
  if(stance.name==='Яростная стойка'){if(mode==='defense'){r.success=false;r.pure=false;r.critical=false;}else if(effectSkillMatches(skill,'combatAttack'))r.critical=r.success&&roll<=r.base&&roll<=resolveEffectTarget(statTotal('LCK')/2,'critical',{skill,mode}).value+stance.level;}
 }
 if(mode!=='defense'&&abilityState().flurry&&combatKey(skill)?.startsWith('Ближний бой')){r.target/=2;r.success=roll<=r.target;r.critical=r.critical&&r.success;}
 r.advice=abilityRollAdvice(skill,mode);if(originalModifier!==modifier)r.advice.push('Специалист: штраф сложности ниже lvl/2 проигнорирован.');
 if(mode==='normal'&&superiority>=2&&abilitySource('Хакер')&&/(^ит$|компьютер|информацион)/i.test(skillEffectName(skill))){r.success=true;r.critical=false;r.automatic=true;r.advice.push('Хакер: при подавлении ≥2 взлом успешен без броска.');}
 return r;
};
const beforeAbilityRollResult=renderRollResult;
renderRollResult=function(r){return beforeAbilityRollResult(r)+(r.advice||[]).map(t=>`<p class="ability-rule-note">${esc(t)}</p>`).join('');};
const beforeAbilitySkillResult=skillResult;
skillResult=function(s){let r=beforeAbilitySkillResult(s);const stance=abilityState().stance;if(!r.error&&stance?.name==='Атакующая стойка'&&effectSkillMatches(s,'combatAttack'))r={...r,value:r.value+stance.level*5};if(!r.error&&abilityState().flurry&&combatKey(s)?.startsWith('Ближний бой'))r={...r,value:r.value/2};return r;};
const beforeAbilityDerived=derivedPlay;
derivedPlay=function(){const d=beforeAbilityDerived(),stance=abilityState().stance;if(stance?.name==='Защитная стойка')d.dodge+=stance.level*5;if(stance?.name==='Атакующая стойка')d.dodge/=2;if(stance?.name==='Яростная стойка')d.dodge=0;return d;};
const beforeAbilityMovement=movementValues;
movementValues=function(config=state.play.movement){const m=beforeAbilityMovement(config),stance=abilityState().stance;if(!m.error&&stance){const factor=stance.name==='Яростная стойка'?1:.5;for(const k of ['walk','run','jump'])m[k]=m[k]*factor+(stance.name==='Яростная стойка'&&k!=='jump'?1:0);}return m;};
const beforeAbilityResolveTarget=resolveEffectTarget;
resolveEffectTarget=function(base,target,context={}){const r=beforeAbilityResolveTarget(base,target,context),stance=state.play.rules?.stance;if(target==='ap'&&stance?.name==='Защитная стойка')r.value=Math.floor(r.value/2);return r;};
function weaponAbilityPick(source,skill){const cfg=sourceConfig(source.id),picks=cfg.picks?.length?cfg.picks:Array.from({length:Math.max(1,cfg.count||1)},()=>cfg);return picks.filter(c=>c.skill===skillIdentity(skill)).length;}
function isBareFist(item){return item.details?.bareFist===true||item.details?.bareFist==='true';}
function normalizedAbilityDamage(expression){
 const raw=String(expression).replace(/−/g,'-').replace(/\s/g,'');if(!/^[+-]?(?:\d+d\d+|\d+(?:\.\d+)?)(?:[+-](?:\d+d\d+|\d+(?:\.\d+)?))*$/i.test(raw))return expression;
 const dice=new Map();let constant=0;for(const t of raw.match(/[+-]?[^+-]+/g)){const sign=t[0]==='-'?-1:1,m=t.replace(/^[+-]/,'').match(/^(\d+)d(\d+)$/i);if(m)dice.set(+m[2],(dice.get(+m[2])||0)+sign*+m[1]);else constant+=Number(t);}
 const parts=[...dice].filter(([,n])=>n>0).map(([s,n])=>n+'d'+s);if(constant||!parts.length)parts.push(String(Math.max(0,constant)));return parts.join(' + ');
}
const beforeAbilityAttack=attackNumbers;
attackNumbers=function(item){
 const a=beforeAbilityAttack(item),d=item.details||{},skill=a.skill,melee=!!a.key?.startsWith('Ближний бой'),twoHanded=melee&&/двуруч/i.test(d.type||item.notes||''),die=Number(a.baseDamage?.match(/d(\d+)/i)?.[1]||100);let extraDice=0,fistDice=0,mastery=a.mastery;
 a.criticalChance=skill?resolveEffectTarget(statTotal('LCK')/2,'critical',{skill}).value:statTotal('LCK')/2;
 a.criticalMultiplierBonus=skill?resolveEffectTarget(0,'criticalMultiplier',{skill}).value:0;
 a.criticalPowerBonus=skill?cumulativeCombatFeatures(skill).filter(f=>/показатель критического/.test(f.text)).reduce((n,f)=>n+Number(f.text.match(/[+]\d+/)?.[0]||0),0):0;
 const note=(text)=>a.notes.push(text);
 if(a.key==='Стрельба(легкое)'&&abilitySource('Легкий стрелок')){if(a.cost!==null)a.cost=Math.max(3,a.cost-1);note('Легкий стрелок: −1 ОД');}
 if(melee&&abilitySource('Разрушитель')){if(twoHanded&&!a.key.includes('силовой')){if(a.cost!==null)a.cost=Math.max(1,a.cost-1);extraDice+=Math.floor(abilityLevel('Разрушитель')/20);}a.range=Number.isFinite(Number(a.range))?Number(a.range)+1:a.range;a.targets=2;note('Разрушитель: досягаемость +1; две цели');}
 if(melee&&isBareFist(item)&&abilitySource('Железный кулак')){fistDice=Math.floor(state.info.level/20);a.bb=(a.bb||0)+Math.floor(state.info.level/5);note('Железный кулак: голый кулак, ББ и d100 за уровень персонажа');}
 if(a.shooting&&/очеред/i.test(d.attackMode||'')&&abilitySource('Автоматчик')){a.damage+=' + '+statTotal('ACC');note('Автоматчик: ACC урона каждой попавшей пуле');}
 if(a.shooting&&/пулем[её]т/i.test(item.name+' '+d.type)&&abilitySource('Пулеметчик')){a.bb=(a.bb||0)+Math.floor(abilityLevel('Пулеметчик')/10);note('Пулеметчик: ББ за уровень класса');}
 if(a.key==='Стрельба(тяжелое)'&&(d.area===true||d.area==='true')&&abilitySource('Гранатометчик')){extraDice+=Math.floor(abilityLevel('Гранатометчик')/20);a.friendlyDamageFactor=.5;note('Гранатометчик: дайсы за уровень класса; союзникам ×0,5, крит 0');}
 if(abilityConfig('Поджигатель').conditions?.burningTarget&&abilitySource('Поджигатель')){a.damage+=' + '+abilityLevel('Поджигатель');note('Поджигатель: цель горит, урон +уровень класса');}
 if(skill)for(const title of ['Тактический убийца','Удачливый убийца']){const src=abilitySource(title),n=src?weaponAbilityPick(src,skill):0;if(n){extraDice+=(title==='Тактический убийца'?-1:1)*Math.ceil(a.level/2)*n;mastery*=Math.pow(title==='Тактический убийца'?1.5:.5,n);note(title+': выбранный навык');}}
 if(extraDice)a.damage+=' '+(extraDice>0?'+ ':'- ')+Math.abs(extraDice)+'d'+die;
 if(fistDice)a.damage+=' + '+fistDice+'d100';
 if(mastery!==a.mastery){const delta=mastery-a.mastery;a.damage+=' '+(delta>=0?'+ ':'- ')+Math.abs(delta);a.mastery=mastery;}
 a.extraDice=extraDice;a.skillDice+=extraDice;
 if(melee&&abilityState().flurry){if(a.cost!==null)a.cost=Math.max(1,a.cost-1);note('Шквал ударов: −1 ОД и 50% шанса, до движения или конца раунда');}
 const stance=abilityState().stance;if(stance?.name==='Яростная стойка'){a.damageFactor=1.5;a.criticalChance+=stance.level;note('Яростная стойка: итоговый урон ×1,5');}
 a.aimedAvailable=!(a.shooting&&abilitySource('Быстрый стрелок'));
 // Apply floors and manual overrides once, after all feat/class/skill adjustments have combined.
 if(a.baseCost!==null){let cost=a.baseCost+Number(d.actionCostBonus||0);
  if(skill)for(const f of cumulativeCombatFeatures(skill))if(/од на (выстрел|удар|метание)/.test(f.text))cost+=Number(f.text.match(/[+-]?\d+/)?.[0]||0);
  if(a.shooting&&abilitySource('Быстрый стрелок'))cost--;if(a.shooting&&abilitySource('Меткий стрелок'))cost++;
  if(a.shooting&&/очеред/i.test(d.attackMode||'')&&abilitySource('Автоматчик'))cost--;
  if(twoHanded&&abilitySource('Разрушитель'))cost--;if(a.key==='Стрельба(легкое)'&&abilitySource('Легкий стрелок'))cost--;if(melee&&abilityState().flurry)cost--;
  a.cost=Math.max(a.shooting?3:1,Math.floor(resolveEffectTarget(cost,'attackCost',{skill}).value));
 }
 if(a.bbBase!==null){let bb=a.bbBase+Number(a.row?.armorPen||0)+Number(d.armorPenBonus||0);
  if(melee&&isBareFist(item)&&abilitySource('Железный кулак'))bb+=Math.floor(state.info.level/5);
  if(a.shooting&&/пулем[её]т/i.test(item.name+' '+d.type)&&abilitySource('Пулеметчик'))bb+=Math.floor(abilityLevel('Пулеметчик')/10);
  a.bb=resolveEffectTarget(bb,'attackArmorPen',{skill}).value;
 }
 a.damage=normalizedAbilityDamage(a.damage);
 return a;
};
// These flags are explicit because a name alone cannot distinguish bare fists, gloves and blast weapons.
itemFields['Оружие'].push(['bareFist','Голый кулак (true / false)'],['area','Урон по площади (true / false)']);
function abilityFacts(source){
 const name=source.title,L=effectsForSource(source).level,S=p=>abilitySkillLevel(p),r=abilityState();const facts=[];
 const add=(label,value)=>facts.push([label,value]);
 if(name==='Антипревент')add('Противников',Math.floor(statTotal('RTC')/10));
 if(name==='Боевой опыт'||name==='Мирный опыт')add('Множитель опыта',resolveEffectTarget(1,name==='Боевой опыт'?'xp:combat':'xp:peaceful').value);
 if(name==='Неудачник')add('Аура неуспеха',resolveEffectTarget(0,'fumbleAura').value+' п.п.');
 if(name==='Амбидекстрия')add('Штраф двух оружий','10% · ОД медленного +1');
 if(name==='Вне игры')add('Длительность',Math.floor(statTotal('CHA')/10)+' раундов');
 if(name==='9 жизней')add('Осталось жизней',Math.max(0,9-(r.uses[source.id+':lifetime']||0)));
 if(name==='Серая мышь')add('Шанс N',sourceConfig(source.id).manualChance??'определяет ведущий');
 if(name==='Разрушитель')add('Дайсы двуручного оружия',Math.floor(L/20));
 if(name==='Железный кулак'){add('ББ голого кулака',Math.floor(state.info.level/5));add('Урон голого кулака',Math.floor(state.info.level/20)+'d100');}
 if(name==='Бастион'||name==='Штурмовик')add('К показателю крита врага',-Math.floor(L/20));
 if(name==='Штурмовик')add('К броне AR',Math.floor(L/10));
 if(name==='Поджигатель'){add('Горение',S(/тяжел/i)+' раундов');add('Урон горения','начальный урон / 2');add('Урон по горящей цели',L);}
 if(name==='Кубинский охотник')add('Активных трофеев',Math.floor(L/30)+'; все 12 при полной коллекции');
 if(name==='Ясновидец')add('Союзников',S(/ясновид/i));
 if(name==='Телепат'){add('INT-эффект псионики',statTotal('INT')+10+'%');add('EP за крит участника',S(/псионик/i));}
 if(name==='Шаман'){add('Радиус без зла городов',S(/шаман/i)*20);add('EP/раунд',S(/шаман/i));}
 if(name==='Пси-универсал'){add('Дополнительные EP',L);add('Минимум дисциплины',Math.max(0,...state.skills.filter(isPsiSkill).map(effectiveSkillLevel))-1);}
 if(name==='Искатель')add('Отмен событий',Math.floor(statTotal('LCK')/10));
 if(name==='Шпион')add('Перераспределяемые SP',Math.floor(L/3));
 if(name==='Шпион')add('Остаток пула перевоплощения',Math.floor(L/3)-spyAllocationCost(sourceConfig(source.id).spyAllocations||[]));
 if(name==='Отравитель')add('Штраф защиты от яда',-(L/3));
 if(name==='Уличный бард')add('Песен в репертуаре',Math.max(0,S(/музык|искусств|исполн/i)-5));
 if(name==='Зверовод: Хозяин стаи')add('Шанс атаки стаи',Math.max(0,S(/прируч/i)-1)*5+20+statTotal('CHA')+'% · разброс 10');
 if(name==='Зверовод: верный друг')add('Радиус связи',S(/прируч/i)+' клеток');
 if(name==='Водитель-универсал')add('HP транспорта','базовые ×2');
 if(name==='Механик')add('Экстренный ремонт',Math.floor(L/2)+' раундов · 10 ОД');
 if(name.startsWith('Специалист')){add('Очки специальности','×2');add('Игнорировать сложность','строго ниже '+L/2);}
 if(name==='Хакер')add('Безопасный взлом',L/2+'% · без крита и подавления');
 if(name==='Безумный ученый')add('Очки для идеи','×2');
 if(name==='Учитель (навык)')add('Предел обучения',3);
 if(name==='Фаворит')add('Изменение репутации','×2');
 return facts;
}
function spyAllocationCost(allocations){return allocations.reduce((total,a)=>{const s=state.skills.find(s=>skillIdentity(s)===a.skill);return !s||!Number.isInteger(a.levels)||a.levels<0?total:total+a.levels*s[1]+a.levels*(a.levels-1)/2;},0);}
function abilityWorkPoints(source,base,skillId){
 if(!Number.isFinite(base)||base<0)throw Error('Очки работы — число от 0.');if(abilitySource('Знаток'))throw Error('Знаток не может вести исследования и производство.');
 const cfg=sourceConfig(source.id);if(source.title.startsWith('Специалист')&&(!cfg.skill||cfg.skill!==skillId))throw Error('Выберите навык специальности в настройках источника.');
 return base*(source.title==='Безумный ученый'&&cfg.conditions?.unrelated?1:2);
}
