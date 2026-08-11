import { dayRange } from './date.js';
import { dailyTotal } from './state.js';
export const RANGE_DAYS={week:7,month:30,year:365};
export function chartSeries(history,range='week',now=new Date()){return dayRange(RANGE_DAYS[range]||7,now).map(date=>({date,value:dailyTotal(history[date])}));}
