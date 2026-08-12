import { validConfig } from './state.js';
import { selectExercise } from './selection.js';

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function createConfigDraft(config) { return clone(config); }

export function selectionExists(config, selected) {
  return Boolean(selected && config.groups.some(group => group.name === selected.group && group.exercises.includes(selected.exercise)));
}

export function applyConfigDraft(state, draft, random = Math.random) {
  if (!validConfig(draft) || !draft.groups.length || draft.groups.some(group => !group.name.trim() || !group.exercises.length || group.exercises.some(exercise => !exercise.trim()))) {
    throw new TypeError('Keep at least one named group and one exercise in every group.');
  }
  const config = clone(draft);
  return { ...state, config, selected: selectionExists(config, state.selected) ? state.selected : selectExercise(config.groups, random) };
}
