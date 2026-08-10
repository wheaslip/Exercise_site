import { defaultConfig } from './defaults.js';
import { localDateKey, retainHistory, addLocalDays } from './date.js';
import { selectExercise } from './selection.js';
import { addTimerSeconds } from './timer.js';
export const STORAGE_KEY='whop-state'; export const VERSION=1;
export function freshState(random=Math.random) { const config=defaultConfig(); return {version:VERSION,config,timer:{seconds:0,running:false,startedAt:null},selected:selectExercise(config.groups,random),history:{}}; }
function validConfig(c) { return c && Number.isInteger(c.dailyTarget)&&c.dailyTarget>0&&Number.isFinite(c.rewardMinutes)&&c.rewardMinutes>0&&Array.isArray(c.groups)&&c.groups.every(g=>g&&typeof g.name==='string'&&Number(g.weight)>0&&Array.isArray(g.exercises)&&g.exercises.every(x=>typeof x==='string')); }
export function sanitizeState(raw, random=Math.random, now=new Date()) {
  const fallback=freshState(random); if(!raw||raw.version!==VERSION||!validConfig(raw.config)) return fallback;
  const timer=raw.timer&&Number.isFinite(raw.timer.seconds)&&typeof raw.timer.running==='boolean'&&(!raw.timer.running||Number.isFinite(raw.timer.startedAt))?raw.timer:fallback.timer;
  const history={}; if(raw.history&&typeof raw.history==='object') for(const [day,v] of Object.entries(raw.history)) if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&v&&Number.isInteger(v.total)&&v.total>=0&&v.exercises&&typeof v.exercises==='object') history[day]={total:v.total,target:Number.isInteger(v.target)&&v.target>0?v.target:raw.config.dailyTarget,exercises:{...v.exercises}};
  const selected=raw.selected&&typeof raw.selected.group==='string'&&typeof raw.selected.exercise==='string'?raw.selected:selectExercise(raw.config.groups,random);
  return {version:VERSION,config:raw.config,timer,selected,history:retainHistory(history,now)};
}
export function loadState(storage=localStorage, random=Math.random, now=new Date()) { try{return sanitizeState(JSON.parse(storage.getItem(STORAGE_KEY)),random,now)}catch{return freshState(random)} }
export function saveState(state,storage=localStorage){storage.setItem(STORAGE_KEY,JSON.stringify(state));}
export function complete(state, now=new Date(), random=Math.random){if(!state.selected)return state; const key=localDateKey(now), prior=state.history[key]||{total:0,target:state.config.dailyTarget,exercises:{}}; return {...state,timer:addTimerSeconds(state.timer,state.config.rewardMinutes*60,now.getTime()),selected:selectExercise(state.config.groups,random),history:retainHistory({...state.history,[key]:{...prior,total:prior.total+1,exercises:{...prior.exercises,[state.selected.exercise]:(prior.exercises[state.selected.exercise]||0)+1}}},now)};}
export function skip(state,random=Math.random){return {...state,selected:selectExercise(state.config.groups,random)};}
// Today is counted only after it meets its target; an incomplete today does not erase the streak ending yesterday.
export function streak(history,now=new Date(),defaultTarget=18){let key=localDateKey(now),today=history[key];if(!today||today.total<(today.target||defaultTarget))key=addLocalDays(key,-1);let count=0;while(history[key]&&history[key].total>=(history[key].target||defaultTarget)){count++;key=addLocalDays(key,-1);}return count;}
