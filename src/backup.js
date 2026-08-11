import { retainHistory } from './date.js';
import { sanitizeState, saveState, validateState } from './state.js';
import { timerSeconds } from './timer.js';

export const BACKUP_FORMAT = 'wesleys-house-of-pain-backup';
export const BACKUP_VERSION = 1;

function validIsoTimestamp(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

/** Create the complete, retained application backup as pretty-printed JSON. */
export function serializeBackup(state, now = new Date()) {
  const exportedAt = now.toISOString();
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    state,
  }, null, 2);
}

/** Parse and strictly validate a backup without changing browser storage. */
export function parseBackup(text, now = new Date(), random = Math.random) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new TypeError('The selected file is not valid JSON.');
  }
  if (!backup || backup.format !== BACKUP_FORMAT) throw new TypeError('This is not a Wesley’s House of Pain backup.');
  if (backup.version !== BACKUP_VERSION) throw new TypeError(`Backup version ${String(backup.version)} is not supported.`);
  if (!validIsoTimestamp(backup.exportedAt)) throw new TypeError('The backup has an invalid export timestamp.');
  const exportedAt = new Date(backup.exportedAt).getTime(), nowMs = now.getTime();
  if (exportedAt > nowMs) throw new TypeError('The backup export timestamp is in the future.');

  // Strict validation uses the same schema validator as normal state loading, but
  // rejects rather than silently dropping malformed records.
  validateState(backup.state);
  const restored = sanitizeState(backup.state, random, now);
  if (restored.timer.running) {
    if (restored.timer.startedAt > exportedAt) throw new TypeError('The running timer timestamp is invalid or in the future.');
    const secondsAtExport = timerSeconds(restored.timer, exportedAt);
    restored.timer = {
      seconds: secondsAtExport - Math.floor((nowMs - exportedAt) / 1000),
      running: true,
      startedAt: nowMs,
    };
  }
  // sanitizeState applies retention. This assignment emphasizes that date keys and
  // event timestamps remain untouched; no history is moved to the restore date.
  restored.history = retainHistory(restored.history, now);
  return restored;
}

/** Validate and persist before returning replacement state; failures leave current state untouched. */
export function restoreBackup(text, currentState, storage = localStorage, now = new Date(), random = Math.random) {
  const restored = parseBackup(text, now, random);
  saveState(restored, storage);
  return restored;
}

export function backupFilename(now = new Date()) {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `wesleys-house-of-pain-backup-${date}.json`;
}
