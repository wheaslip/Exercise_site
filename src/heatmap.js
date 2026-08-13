import { addLocalDays, localDateKey } from './date.js';

export const RECENCY_MULTIPLIERS = [1, 0.7, 0.4, 0.2];
export const SPEED_MULTIPLIERS = { slow: 0.8, normal: 1, plyometric: 1.25 };
export const THRESHOLDS = { orange: 1 / 3, red: 2 / 3 };

export function workloadState(score) {
  if (score >= THRESHOLDS.red) return 'red';
  if (score >= THRESHOLDS.orange) return 'orange';
  return 'green';
}

// Bodyweight (zero entered weight) has neutral factor 1; added load scales gently per 100 kg.
export function setWorkload(event) {
  const weightKg = Math.max(0, Number(event.weight) || 0) * (event.weightUnit === 'lb' ? 0.45359237 : 1);
  return Number(event.repetitions) * (SPEED_MULTIPLIERS[event.speed] ?? 1) * (1 + weightKg / 100);
}

export function calculateWorkload(history, groups, now = new Date()) {
  const keys = RECENCY_MULTIPLIERS.map((_, age) => addLocalDays(localDateKey(now), -age));
  const byName = new Map(groups.map(group => [group.name, group]));
  const raw = Object.fromEntries(groups.map(group => [group.name, 0]));
  keys.forEach((key, age) => {
    for (const event of history[key]?.events || []) {
      const group = byName.get(event.group);
      if (!group) continue;
      // A zero selection weight cannot be normalized, so it uses neutral divisor 1.
      raw[group.name] += setWorkload(event) * RECENCY_MULTIPLIERS[age] / (Number(group.weight) > 0 ? Number(group.weight) : 1);
    }
  });
  const max = Math.max(0, ...Object.values(raw));
  const groupScores = Object.fromEntries(groups.map(group => {
    const score = max ? raw[group.name] / max : 0;
    return [group.name, { raw: raw[group.name], score, state: workloadState(score), display: group.display }];
  }));
  const regionScores = {};
  const nonBody = [];
  for (const group of groups) {
    const result = groupScores[group.name];
    if (group.display?.type === 'non-body') nonBody.push({ name: group.name, ...result });
    else {
      const regions = group.display?.regions || [];
      for (const region of regions) regionScores[region] = (regionScores[region] || 0) + result.score / regions.length;
    }
  }
  return { groups: groupScores, regions: Object.fromEntries(Object.entries(regionScores).map(([region, score]) => [region, { score, state: workloadState(score) }])), nonBody, max };
}
