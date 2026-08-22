import test from 'node:test'; import assert from 'node:assert/strict';
import {timerSeconds,startTimer,stopTimer,addTimerSeconds,timerStatus} from '../src/timer.js';
import {calculateWorkload,setWorkload,workloadState} from '../src/heatmap.js';
import {selectExercise} from '../src/selection.js'; import {VERSION,dailyTotal,freshState,sanitizeState,complete,skip,streak,loadState,saveState} from '../src/state.js'; import {localDateKey,retainHistory} from '../src/date.js'; import {chartSeries,exerciseHistory,setEntryDefaults} from '../src/stats.js';

test('timer passes below zero',()=>assert.equal(timerSeconds({seconds:1,running:true,startedAt:0},3000),-2));
test('timer status uses warning boundaries',()=>{assert.equal(timerStatus(-1),'negative');assert.equal(timerStatus(0),'warning');assert.equal(timerStatus(299),'warning');assert.equal(timerStatus(300),'healthy')});
test('timer pause, resume, and timestamp reload timing',()=>{let t=startTimer({seconds:10,running:false,startedAt:null},1000);t=stopTimer(t,4000);assert.equal(t.seconds,7);t=startTimer(t,9000);assert.equal(timerSeconds(t,11000),5);assert.deepEqual(JSON.parse(JSON.stringify(t)),t)});
test('adding reward settles elapsed time first',()=>assert.equal(timerSeconds(addTimerSeconds({seconds:10,running:true,startedAt:0},60,5000),5000),65));
const set=(selected,overrides={})=>({...selected,repetitions:8,weight:0,weightUnit:'kg',speed:'normal',...overrides});
const events=count=>Array.from({length:count},(_,i)=>({id:`event-${i}`,timestamp:`2026-01-0${i+1}T12:00:00.000Z`,date:`2026-01-0${i+1}`,group:'Legs',exercise:'squat',repetitions:8,weight:0,weightUnit:'kg',speed:'normal'}));

test('multiple completions of the same exercise remain distinct ordered events',()=>{const s=freshState(()=>0),first=complete(s,set(s.selected),new Date(2026,0,2,12),()=>0,()=> 'first'),done=complete(first,set(s.selected,{repetitions:12,weight:2.5,speed:'slow'}),new Date(2026,0,2,13),()=>0,()=> 'second');const day=done.history['2026-01-02'];assert.equal(dailyTotal(day),2);assert.deepEqual(day.events.map(x=>x.id),['first','second']);assert.deepEqual(day.events.map(x=>x.repetitions),[8,12])});
test('completion preserves all metadata, rewards, and creates the next offer',()=>{const s=freshState(()=>0),now=new Date(2026,0,2,12),done=complete(s,set(s.selected,{weight:'12.75',weightUnit:'lb',speed:'plyometric'}),now,()=>.9,()=> 'stable-id');assert.deepEqual(done.history['2026-01-02'].events[0],{id:'stable-id',timestamp:now.toISOString(),date:'2026-01-02',group:s.selected.group,exercise:s.selected.exercise,repetitions:8,weight:12.75,weightUnit:'lb',speed:'plyometric'});assert.equal(done.timer.seconds,1800);assert.notDeepEqual(done.selected,s.selected)});
test('daily target is saved on first completion and survives later configuration changes',()=>{let s=freshState(()=>0);s.config.dailyTarget=2;s=complete(s,set(s.selected),new Date(2026,0,2,12),()=>0,()=> 'one');s.config.dailyTarget=9;s=complete(s,set(s.selected),new Date(2026,0,2,13),()=>0,()=> 'two');assert.equal(s.history['2026-01-02'].target,2);assert.equal(streak(s.history,new Date(2026,0,2,14),9),1)});
test('completion accepts every speed and decimal or zero weights',()=>{for(const [speed,weight] of [['slow',0],['normal','0.0'],['plyometric','12.75']]){const s=freshState(()=>0),done=complete(s,set(s.selected,{speed,weight}),new Date(2026,0,2,12),()=>0,()=>speed);assert.equal(done.history['2026-01-02'].events[0].speed,speed);assert.equal(done.history['2026-01-02'].events[0].weight,Number(weight))}});
test('completion rejects invalid repetitions',()=>{const s=freshState(()=>0);for(const repetitions of [0,-1,1.5,''])assert.throws(()=>complete(s,set(s.selected,{repetitions})),/positive integer/)});
test('completion accepts supported weight units and rejects unknown units',()=>{const s=freshState(()=>0);for(const weightUnit of ['kg','lb'])assert.equal(complete(s,set(s.selected,{weightUnit}),new Date(2026,0,2),()=>0,()=>weightUnit).history['2026-01-02'].events[0].weightUnit,weightUnit);assert.throws(()=>complete(s,set(s.selected,{weightUnit:'stone'})),/valid weight unit/)});
test('skip changes only the random offer and records no completion',()=>{const s=freshState(()=>0),skipped=skip(s,()=>.9);assert.notDeepEqual(skipped.selected,s.selected);assert.deepEqual(skipped.timer,s.timer);assert.deepEqual(skipped.history,s.history)});
test('weighted selection respects exact boundaries',()=>{const groups=[{name:'A',weight:2,exercises:['a']},{name:'B',weight:1,exercises:['b']}];let draws=[0,0];assert.equal(selectExercise(groups,()=>draws.shift()).group,'A');draws=[2/3,0];assert.equal(selectExercise(groups,()=>draws.shift()).group,'B')});
test('old-version cached state safely falls back',()=>{assert.equal(sanitizeState({version:VERSION-1,config:{dailyTarget:18}}).version,VERSION);assert.equal(sanitizeState(null).version,VERSION)});
test('sanitization rejects malformed events, duplicate IDs, and unknown speeds',()=>{const raw=freshState(()=>0),valid={id:'valid',timestamp:'2026-01-02T12:00:00.000Z',date:'2026-01-02',group:'Legs',exercise:'squat',repetitions:8,weight:0,speed:'normal'};raw.history={'2026-01-02':{target:3,events:[valid,{...valid,id:'bad-speed',speed:'turbo'},{...valid,id:'bad-date',date:'2026-01-03'},{...valid}]}};const clean=sanitizeState(raw,()=>0,new Date(2026,0,2));assert.deepEqual(clean.history['2026-01-02'].events,[{...valid,weightUnit:'kg'}]);assert.equal(clean.history['2026-01-02'].target,3)});
test('local date keys put events on the correct side of a local midnight',()=>{let s=freshState(()=>0);s=complete(s,set(s.selected),new Date(2026,5,1,23,59),()=>0,()=> 'before');s=complete(s,set(s.selected),new Date(2026,5,2,0,0),()=>0,()=> 'after');assert.deepEqual(Object.keys(s.history),['2026-06-01','2026-06-02']);assert.equal(s.history['2026-06-01'].events[0].date,'2026-06-01');assert.equal(s.history['2026-06-02'].events[0].date,'2026-06-02')});
test('local date uses local calendar at rollover',()=>{assert.equal(localDateKey(new Date(2026,5,1,23,59)),'2026-06-01');assert.equal(localDateKey(new Date(2026,5,2,0,0)),'2026-06-02')});
test('history retention preserves event-based days for at least 366 local days',()=>{const h={'2024-12-31':{target:1,events:events(1)},'2025-01-01':{target:1,events:events(1)},'2026-01-01':{target:1,events:events(1)}};const kept=retainHistory(h,new Date(2026,0,1),366);assert.ok(!kept['2024-12-31']);assert.equal(kept['2025-01-01'],h['2025-01-01'])});
test('chart derives daily totals from event arrays and includes zero days',()=>{const s=chartSeries({'2026-01-10':{target:3,events:events(3)}},'week',new Date(2026,0,10));assert.equal(s.length,7);assert.equal(s[0].value,0);assert.equal(s.at(-1).value,3)});
test('exercise history filters the selected exercise and sorts newest first',()=>{const squatOld={...events(1)[0],id:'old',timestamp:'2026-01-01T12:00:00.000Z'},squatNew={...events(1)[0],id:'new',timestamp:'2026-01-03T12:00:00.000Z'},other={...events(1)[0],id:'other',exercise:'lunge',timestamp:'2026-01-04T12:00:00.000Z'},history={'2026-01-01':{events:[squatOld]},'2026-01-03':{events:[squatNew]},'2026-01-04':{events:[other]}};assert.deepEqual(exerciseHistory(history,'squat').map(event=>event.id),['new','old']);assert.deepEqual(exerciseHistory(history,'missing'),[])});
test('set entry defaults use the latest matching group and exercise',()=>{const old={...events(1)[0],id:'old',timestamp:'2026-01-01T12:00:00.000Z',repetitions:5,weight:10,weightUnit:'kg',speed:'slow'},latest={...old,id:'latest',timestamp:'2026-01-03T12:00:00.000Z',repetitions:12,weight:25,weightUnit:'lb',speed:'plyometric'},sameNameOtherGroup={...latest,id:'other-group',group:'Other',timestamp:'2026-01-04T12:00:00.000Z',repetitions:99},history={'2026-01-01':{events:[old]},'2026-01-03':{events:[latest]},'2026-01-04':{events:[sameNameOtherGroup]}};assert.deepEqual(setEntryDefaults(history,{group:'Legs',exercise:'squat'}),{repetitions:12,weight:25,weightUnit:'lb',speed:'plyometric'})});
test('set entry defaults fall back for an exercise without history',()=>assert.deepEqual(setEntryDefaults({}, {group:'Legs',exercise:'new'}),{repetitions:10,weight:0,weightUnit:'kg',speed:'normal'}));
test('streak ignores incomplete today and honors historical targets',()=>{const h={'2026-01-08':{target:2,events:events(2)},'2026-01-09':{target:3,events:events(3)},'2026-01-10':{target:3,events:events(1)}};assert.equal(streak(h,new Date(2026,0,10),18),2);h['2026-01-10'].events=events(3);assert.equal(streak(h,new Date(2026,0,10),18),3)});

const bodyGroup=(name,weight=1,regions=['chest'])=>({name,weight,display:{type:'body',regions},exercises:['x']});
const heatEvent=(group,repetitions=10,speed='normal',weight=0,weightUnit='kg')=>({group,repetitions,speed,weight,weightUnit});
const heatDay=(...items)=>({events:items});
test('heatmap applies explicit recency decay over local calendar days',()=>{const groups=[bodyGroup('A')],history={'2026-01-10':heatDay(heatEvent('A')),'2026-01-09':heatDay(heatEvent('A')),'2026-01-08':heatDay(heatEvent('A')),'2026-01-07':heatDay(heatEvent('A'))};assert.equal(calculateWorkload(history,groups,new Date(2026,0,10,12)).groups.A.raw,23)});
test('heatmap ignores records aged four days and future-dated records',()=>{const groups=[bodyGroup('A')],history={'2026-01-06':heatDay(heatEvent('A',99)),'2026-01-11':heatDay(heatEvent('A',99))};assert.equal(calculateWorkload(history,groups,new Date(2026,0,10,12)).groups.A.raw,0)});
test('selection weight normalization prevents frequently offered groups dominating',()=>{const groups=[bodyGroup('A',2),bodyGroup('B',1)],history={'2026-01-10':heatDay(heatEvent('A',20),heatEvent('B',10))};const result=calculateWorkload(history,groups,new Date(2026,0,10));assert.equal(result.groups.A.raw,result.groups.B.raw)});
test('zero group weight uses a finite neutral divisor',()=>{const result=calculateWorkload({'2026-01-10':heatDay(heatEvent('A'))},[bodyGroup('A',0)],new Date(2026,0,10));assert.equal(result.groups.A.raw,10);assert.ok(Number.isFinite(result.groups.A.score))});
test('set workload applies speed modifiers and neutral bodyweight factor',()=>{assert.equal(setWorkload(heatEvent('A',10,'slow')),8);assert.equal(setWorkload(heatEvent('A',10,'normal')),10);assert.equal(setWorkload(heatEvent('A',10,'plyometric')),12.5);assert.equal(setWorkload(heatEvent('A',10,'normal',50)),15)});
test('set workload normalizes pounds to kilograms',()=>assert.ok(Math.abs(setWorkload(heatEvent('A',10,'normal',100,'lb'))-14.5359237)<1e-9));
test('relative thresholds classify fresh, moderate, and high groups',()=>{const groups=[bodyGroup('High'),bodyGroup('Mid'),bodyGroup('Low'),bodyGroup('Fresh')],history={'2026-01-10':heatDay(heatEvent('High',100),heatEvent('Mid',50),heatEvent('Low',20))};const result=calculateWorkload(history,groups,new Date(2026,0,10));assert.deepEqual(Object.fromEntries(Object.entries(result.groups).map(([name,value])=>[name,value.state])),{High:'red',Mid:'orange',Low:'green',Fresh:'green'});assert.equal(workloadState(2/3),'red');assert.equal(workloadState(1/3),'orange')});
test('multi-region group contribution is divided evenly',()=>{const result=calculateWorkload({'2026-01-10':heatDay(heatEvent('A'))},[bodyGroup('A',1,['chest','shoulders'])],new Date(2026,0,10));assert.equal(result.regions.chest.score,.5);assert.equal(result.regions.shoulders.score,.5)});
test('non-body groups are returned as named workload results, not regions',()=>{const group={...bodyGroup('Balance'),display:{type:'non-body',regions:[]}};const result=calculateWorkload({'2026-01-10':heatDay(heatEvent('Balance'))},[group],new Date(2026,0,10));assert.equal(result.nonBody[0].name,'Balance');assert.equal(result.nonBody[0].state,'red');assert.deepEqual(result.regions,{})});

import { BACKUP_FORMAT, BACKUP_VERSION, backupFilename, parseBackup, restoreBackup, serializeBackup } from '../src/backup.js';
const backupNow = new Date(2026, 0, 10, 12);
function backupState() {
  let state = freshState(() => 0);
  state = complete(state, set(state.selected), new Date(2026, 0, 9, 10), () => 0, () => 'backup-event');
  return state;
}
test('backup export/import round trip preserves configuration, selection, timer, and history', () => {
  const original = backupState(), text = serializeBackup(original, backupNow), parsed = JSON.parse(text);
  assert.equal(parsed.format, BACKUP_FORMAT); assert.equal(parsed.version, BACKUP_VERSION); assert.equal(parsed.exportedAt, backupNow.toISOString());
  assert.match(text, /\n  "format"/); assert.equal(backupFilename(backupNow), 'wesleys-house-of-pain-backup-2026-01-10.json');
  assert.deepEqual(parseBackup(text, backupNow, () => 0), original);
});
test('later-date restoration preserves historical date keys and derives elapsed running timer', () => {
  const original = backupState(); original.timer = { seconds: 100, running: true, startedAt: backupNow.getTime() - 5_000 };
  const later = new Date(2026, 0, 11, 12), restored = parseBackup(serializeBackup(original, backupNow), later, () => 0);
  assert.ok(restored.history['2026-01-09']); assert.equal(restored.history['2026-01-11'], undefined);
  assert.equal(restored.timer.seconds, 95 - 86_400); assert.equal(restored.timer.startedAt, later.getTime());
});
test('backup rejects malformed JSON and unsupported versions', () => {
  assert.throws(() => parseBackup('{broken', backupNow), /not valid JSON/);
  const backup = JSON.parse(serializeBackup(backupState(), backupNow)); backup.version++;
  assert.throws(() => parseBackup(JSON.stringify(backup), backupNow), /not supported/);
});
test('backup rejects invalid history records rather than partially importing them', () => {
  const backup = JSON.parse(serializeBackup(backupState(), backupNow)); backup.state.history['2026-01-09'].events[0].speed = 'invalid';
  assert.throws(() => parseBackup(JSON.stringify(backup), backupNow), /invalid event/);
});
test('backup rejects future running timer timestamps', () => {
  const backup = JSON.parse(serializeBackup(backupState(), backupNow)); backup.state.timer = { seconds: 10, running: true, startedAt: backupNow.getTime() + 1 };
  assert.throws(() => parseBackup(JSON.stringify(backup), backupNow), /timer timestamp/);
});
test('failed import or persistence leaves the current state unchanged', () => {
  const current = backupState(), snapshot = structuredClone(current), storage = { setItem() { throw new Error('storage full'); } };
  assert.throws(() => restoreBackup(serializeBackup(freshState(() => .9), backupNow), current, storage, backupNow), /storage full/);
  assert.deepEqual(current, snapshot);
  assert.throws(() => restoreBackup('bad json', current, storage, backupNow), /not valid JSON/);
  assert.deepEqual(current, snapshot);
});

import { applyConfigDraft, createConfigDraft } from '../src/config.js';
test('configuration draft cancellation leaves live state and persistence unchanged', () => {
  const state = freshState(() => 0), original = structuredClone(state.config), draft = createConfigDraft(state.config);
  draft.groups[0].name = 'Unsaved name'; draft.groups.push({ name: 'Draft only', weight: 1, display: { type: 'non-body', regions: [] }, exercises: ['draft'] });
  const storage = { value: null, setItem(key, value) { this.value = value; } }; saveState(state, storage);
  assert.deepEqual(state.config, original); assert.deepEqual(JSON.parse(storage.value).config, original);
});
test('saving a complete configuration draft replaces config without retaining draft references', () => {
  const state = freshState(() => 0), draft = createConfigDraft(state.config);
  draft.dailyTarget = 7; draft.groups[0].name = 'Renamed'; draft.groups[0].weight = 2; draft.groups[0].display = { type: 'body', regions: ['upper-back'] }; draft.groups[0].exercises = ['first', 'second'];
  const saved = applyConfigDraft(state, draft, () => 0);
  assert.equal(saved.config.dailyTarget, 7); assert.deepEqual(saved.config.groups[0], draft.groups[0]); assert.notEqual(saved.config, draft);
  draft.groups[0].exercises.push('later draft edit'); assert.deepEqual(saved.config.groups[0].exercises, ['first', 'second']);
});
test('saving after deleting the selected exercise chooses a configured replacement', () => {
  const state = freshState(() => 0), draft = createConfigDraft(state.config), selected = state.selected;
  const group = draft.groups.find(item => item.name === selected.group); group.exercises = group.exercises.filter(exercise => exercise !== selected.exercise);
  if (!group.exercises.length) group.exercises.push('replacement');
  const saved = applyConfigDraft(state, draft, () => 0);
  assert.notDeepEqual(saved.selected, selected);
  assert.ok(saved.config.groups.some(item => item.name === saved.selected.group && item.exercises.includes(saved.selected.exercise)));
});
test('saved draft and reconciled selection survive subsequent persistence', () => {
  const state = freshState(() => 0), draft = createConfigDraft(state.config); draft.groups = [{ name: 'Only', weight: 1, display: { type: 'non-body', regions: [] }, exercises: ['kept'] }];
  const saved = applyConfigDraft(state, draft, () => 0), storage = { value: null, setItem(key, value) { this.value = value; }, getItem() { return this.value; } };
  saveState(saved, storage); const loaded = loadState(storage, () => .5, new Date());
  assert.deepEqual(loaded.config, draft); assert.deepEqual(loaded.selected, { group: 'Only', exercise: 'kept' });
});

