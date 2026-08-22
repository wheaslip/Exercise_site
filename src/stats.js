import { dayRange } from './date.js';
import { dailyTotal } from './state.js';
export const RANGE_DAYS={week:7,month:30,year:365};
export function chartSeries(history,range='week',now=new Date()){return dayRange(RANGE_DAYS[range]||7,now).map(date=>({date,value:dailyTotal(history[date])}));}
export function exerciseHistory(history,exercise,group){if(!exercise)return [];return Object.values(history||{}).flatMap(day=>Array.isArray(day?.events)?day.events:[]).filter(event=>event.exercise===exercise&&(!group||event.group===group)).sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime())}
export function setEntryDefaults(history,selected){const latest=exerciseHistory(history,selected?.exercise,selected?.group)[0];return latest?{repetitions:latest.repetitions,weight:latest.weight,weightUnit:latest.weightUnit||'kg',speed:latest.speed}:{repetitions:10,weight:0,weightUnit:'kg',speed:'normal'}}
