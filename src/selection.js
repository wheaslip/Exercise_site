export function selectExercise(groups, random = Math.random) {
  const eligible = groups.filter(g => Number(g.weight) > 0 && Array.isArray(g.exercises) && g.exercises.length);
  if (!eligible.length) return null;
  const total = eligible.reduce((sum,g) => sum + Number(g.weight), 0); let pick = random() * total; let group = eligible.at(-1);
  for (const candidate of eligible) { pick -= Number(candidate.weight); if (pick < 0) { group = candidate; break; } }
  const exercise = group.exercises[Math.min(group.exercises.length - 1, Math.floor(random() * group.exercises.length))];
  return { group: group.name, exercise };
}
