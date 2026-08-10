export const DAY_MS = 86_400_000;
export const DEFAULT_GROUPS = [
  { name: 'Upper legs', weight: 2, exercises: ['weighted squats', 'deadlift', 'RDL', 'jumping squats', 'single leg thrusts'] },
  { name: 'Lower legs', weight: 1, exercises: ['calf raises', 'tibialis'] },
  { name: 'Core', weight: 1, exercises: ['cortaplumas', 'hollow', 'back extensions', 'obliques', 'leg raises'] },
  { name: 'Chest', weight: 1, exercises: ['regular push ups', 'bench press', 'incline bench press', 'diamond push ups'] },
  { name: 'Back', weight: 1, exercises: ['pull ups', 'ring pull ups', 'chin ups', 'ring rows', 'single arm rows', 'bar rows'] },
  { name: 'Shoulders', weight: 1, exercises: ['military press', 'lateral raises', 'handstand push ups'] },
  { name: 'Biceps', weight: 1, exercises: ['bicep curls'] },
  { name: 'Triceps', weight: 1, exercises: ['dips', 'tricep extension'] },
];
export const defaultConfig = () => ({ dailyTarget: 18, rewardMinutes: 30, groups: structuredClone(DEFAULT_GROUPS) });
