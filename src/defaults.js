export const DAY_MS = 86_400_000;
export const BODY_REGIONS = [
  { id: 'chest', label: 'Chest' }, { id: 'upper-back', label: 'Upper back' },
  { id: 'shoulders', label: 'Shoulders' }, { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' }, { id: 'core', label: 'Core' },
  { id: 'upper-legs', label: 'Upper legs' }, { id: 'lower-legs', label: 'Lower legs' },
];
const body = (...regions) => ({ type: 'body', regions });
export const DEFAULT_GROUPS = [
  { name: 'Upper legs', weight: 2, display: body('upper-legs'), exercises: ['weighted squats', 'deadlift', 'RDL', 'jumping squats', 'single leg thrusts'] },
  { name: 'Lower legs', weight: 1, display: body('lower-legs'), exercises: ['calf raises', 'tibialis'] },
  { name: 'Core', weight: 1, display: body('core'), exercises: ['cortaplumas', 'hollow', 'back extensions', 'obliques', 'leg raises'] },
  { name: 'Chest', weight: 1, display: body('chest'), exercises: ['regular push ups', 'bench press', 'incline bench press', 'diamond push ups'] },
  { name: 'Back', weight: 1, display: body('upper-back'), exercises: ['pull ups', 'ring pull ups', 'chin ups', 'ring rows', 'single arm rows', 'bar rows'] },
  { name: 'Shoulders', weight: 1, display: body('shoulders'), exercises: ['military press', 'lateral raises', 'handstand push ups'] },
  { name: 'Biceps', weight: 1, display: body('biceps'), exercises: ['bicep curls'] },
  { name: 'Triceps', weight: 1, display: body('triceps'), exercises: ['dips', 'tricep extension'] },
];
export const defaultConfig = () => ({ dailyTarget: 18, rewardMinutes: 30, groups: structuredClone(DEFAULT_GROUPS) });
