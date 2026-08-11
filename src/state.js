import { BODY_REGIONS, defaultConfig } from './defaults.js';
import { localDateKey, retainHistory, addLocalDays } from './date.js';
import { selectExercise } from './selection.js';
import { addTimerSeconds } from './timer.js';

export const STORAGE_KEY = 'whop-state';
export const VERSION = 2;
export const SPEEDS = ['slow', 'normal', 'plyometric'];

export function freshState(random = Math.random) {
  const config = defaultConfig();
  return { version: VERSION, config, timer: { seconds: 0, running: false, startedAt: null }, selected: selectExercise(config.groups, random), history: {} };
}

export function validConfig(config) {
  const supported = new Set(BODY_REGIONS.map(region => region.id));
  const validDisplay = display => display?.type === 'non-body' || (display?.type === 'body' && Array.isArray(display.regions) && display.regions.length > 0 && display.regions.every(region => supported.has(region)));
  return config && Number.isInteger(config.dailyTarget) && config.dailyTarget > 0 && Number.isFinite(config.rewardMinutes) && config.rewardMinutes > 0 && Array.isArray(config.groups) && config.groups.every(group => group && typeof group.name === 'string' && Number.isFinite(Number(group.weight)) && Number(group.weight) >= 0 && validDisplay(group.display) && Array.isArray(group.exercises) && group.exercises.every(exercise => typeof exercise === 'string'));
}

export function validStoredEvent(event, day) {
  if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !event.id.trim() || typeof event.timestamp !== 'string' || typeof event.date !== 'string') return false;
  const parsedTimestamp = new Date(event.timestamp);
  return !Number.isNaN(parsedTimestamp.getTime()) && parsedTimestamp.toISOString() === event.timestamp && event.date === day && typeof event.group === 'string' && Boolean(event.group.trim()) && typeof event.exercise === 'string' && Boolean(event.exercise.trim()) && Number.isInteger(event.repetitions) && event.repetitions > 0 && Number.isFinite(event.weight) && event.weight >= 0 && SPEEDS.includes(event.speed);
}

export function dailyTotal(day) { return Array.isArray(day?.events) ? day.events.length : 0; }

export function validateState(raw) {
  if (!raw || typeof raw !== 'object') throw new TypeError('The backup does not contain state.');
  if (raw.version !== VERSION) throw new TypeError(`State version ${String(raw.version)} is not supported.`);
  if (!validConfig(raw.config)) throw new TypeError('The backup configuration is invalid.');
  if (!raw.timer || !Number.isFinite(raw.timer.seconds) || typeof raw.timer.running !== 'boolean' || (raw.timer.running ? !Number.isFinite(raw.timer.startedAt) : raw.timer.startedAt !== null)) throw new TypeError('The backup timer is invalid.');
  if (!raw.selected || typeof raw.selected.group !== 'string' || typeof raw.selected.exercise !== 'string') throw new TypeError('The backup random selection is invalid.');
  if (!raw.history || typeof raw.history !== 'object' || Array.isArray(raw.history)) throw new TypeError('The backup history is invalid.');
  const seenIds = new Set();
  for (const [day, value] of Object.entries(raw.history)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !value || !Number.isInteger(value.target) || value.target <= 0 || !Array.isArray(value.events)) throw new TypeError(`The history record for ${day} is invalid.`);
    for (const event of value.events) {
      if (!validStoredEvent(event, day) || seenIds.has(event.id)) throw new TypeError(`The history record for ${day} contains an invalid event.`);
      seenIds.add(event.id);
    }
  }
  return raw;
}

export function sanitizeState(raw, random = Math.random, now = new Date()) {
  const fallback = freshState(random);
  if (!raw || raw.version !== VERSION || !validConfig(raw.config)) return fallback;
  const timer = raw.timer && Number.isFinite(raw.timer.seconds) && typeof raw.timer.running === 'boolean' && (!raw.timer.running || Number.isFinite(raw.timer.startedAt)) ? raw.timer : fallback.timer;
  const history = {}, seenIds = new Set();
  if (raw.history && typeof raw.history === 'object') for (const [day, value] of Object.entries(raw.history)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !value || !Array.isArray(value.events)) continue;
    const events = value.events.filter(event => {
      if (!validStoredEvent(event, day) || seenIds.has(event.id)) return false;
      seenIds.add(event.id); return true;
    }).map(event => ({ ...event }));
    history[day] = { target: Number.isInteger(value.target) && value.target > 0 ? value.target : raw.config.dailyTarget, events };
  }
  const selected = raw.selected && typeof raw.selected.group === 'string' && typeof raw.selected.exercise === 'string' ? raw.selected : selectExercise(raw.config.groups, random);
  return { version: VERSION, config: raw.config, timer, selected, history: retainHistory(history, now) };
}

export function loadState(storage = localStorage, random = Math.random, now = new Date()) { try { return sanitizeState(JSON.parse(storage.getItem(STORAGE_KEY)), random, now); } catch { return freshState(random); } }
export function saveState(state, storage = localStorage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }

export function normalizeCompletion(config, payload) {
  if (!payload || typeof payload !== 'object') throw new TypeError('A completion payload is required.');
  const group = typeof payload.group === 'string' ? payload.group.trim() : '';
  const exercise = typeof payload.exercise === 'string' ? payload.exercise.trim() : '';
  const configured = config.groups.some(item => item.name === group && item.exercises.includes(exercise));
  const repetitions = typeof payload.repetitions === 'string' && payload.repetitions.trim() !== '' ? Number(payload.repetitions) : payload.repetitions;
  const weight = typeof payload.weight === 'string' && payload.weight.trim() !== '' ? Number(payload.weight) : payload.weight;
  const speed = typeof payload.speed === 'string' ? payload.speed.trim().toLowerCase() : '';
  if (!configured) throw new TypeError('Choose a configured exercise.');
  if (!Number.isInteger(repetitions) || repetitions <= 0) throw new TypeError('Repetitions must be a positive integer.');
  if (!Number.isFinite(weight) || weight < 0) throw new TypeError('Weight must be a non-negative number.');
  if (!SPEEDS.includes(speed)) throw new TypeError('Choose a valid speed.');
  return { group, exercise, repetitions, weight, speed };
}

function uniqueId() { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }

export function complete(state, payload, now = new Date(), random = Math.random, createId = uniqueId) {
  const completion = normalizeCompletion(state.config, payload), date = localDateKey(now);
  const prior = state.history[date] || { target: state.config.dailyTarget, events: [] };
  const event = { id: createId(), timestamp: now.toISOString(), date, ...completion };
  return { ...state, timer: addTimerSeconds(state.timer, state.config.rewardMinutes * 60, now.getTime()), selected: selectExercise(state.config.groups, random), history: retainHistory({ ...state.history, [date]: { target: prior.target, events: [...prior.events, event] } }, now) };
}

export function skip(state, random = Math.random) { return { ...state, selected: selectExercise(state.config.groups, random) }; }

// Today is counted only after it meets its saved target; an incomplete today does not erase the streak ending yesterday.
export function streak(history, now = new Date(), defaultTarget = 18) {
  let key = localDateKey(now);
  const meetsTarget = day => dailyTotal(day) >= (day?.target || defaultTarget);
  if (!meetsTarget(history[key])) key = addLocalDays(key, -1);
  let count = 0;
  while (meetsTarget(history[key])) { count++; key = addLocalDays(key, -1); }
  return count;
}
