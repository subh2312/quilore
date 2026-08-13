/** Map exercise names to primary target muscle for demo highlight. */

export function targetMuscleForExercise(name: string): string {
  const n = name.toLowerCase();
  if (/curl|bicep/.test(n)) return 'biceps';
  if (/tricep|pushdown|skull/.test(n)) return 'triceps';
  if (/bench|press|push.?up|fly|chest/.test(n)) return 'chest';
  if (/row|pull.?up|lat|chin/.test(n)) return 'lats';
  if (/deadlift|rdl|hamstring/.test(n)) return 'hamstrings';
  if (/squat|leg press|lunge|quad/.test(n)) return 'quads';
  if (/hip thrust|glute|bridge/.test(n)) return 'glutes';
  if (/shoulder|overhead|lateral raise|ohp/.test(n)) return 'shoulders';
  if (/crunch|plank|core|abs/.test(n)) return 'abs';
  return 'full body';
}
