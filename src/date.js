import { DAY_MS } from './defaults.js';
export function localDateKey(date = new Date()) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function addLocalDays(key, amount) { const [y,m,d] = key.split('-').map(Number); return localDateKey(new Date(y, m - 1, d + amount)); }
export function dayRange(days, now = new Date()) { const end = localDateKey(now); return Array.from({length:days}, (_,i) => addLocalDays(end, i - days + 1)); }
export function retainHistory(history, now = new Date(), days = 366) {
  const cutoff = new Date(now); cutoff.setHours(0,0,0,0); cutoff.setTime(cutoff.getTime() - (days - 1) * DAY_MS);
  const cutoffKey = localDateKey(cutoff); return Object.fromEntries(Object.entries(history).filter(([key]) => key >= cutoffKey));
}
