/**
 * Compare triage region with recent logged workouts.
 * Arm pain after a leg session is not treated as training-related DOMS.
 */

import { listLocal } from '../offline/store';
import { targetMuscleForExercise } from './exerciseTargets';

const REGION_ALIASES: Record<string, string[]> = {
  chest: ['chest'],
  shoulders: ['shoulders'],
  abs: ['abs'],
  quads: ['quads'],
  upper_back: ['lats', 'full body'],
  lats: ['lats'],
  glutes: ['glutes'],
  hamstrings: ['hamstrings'],
  // pain chips from health onboarding (free text ids)
  elbows: ['biceps', 'triceps', 'shoulders'],
  wrists: ['biceps', 'triceps', 'chest'],
  'lower back': ['hamstrings', 'glutes', 'full body'],
  knees: ['quads', 'glutes'],
  hips: ['glutes', 'quads'],
  ankles: ['quads'],
};

export type RecentTrainingContext = {
  recentExerciseNames: string[];
  recentMuscles: string[];
  regionRecentlyTrained: boolean;
  summary: string;
};

export function recentTrainingContext(regionId: string, lookbackHours = 72): RecentTrainingContext {
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
  const workouts = listLocal('workouts');
  const names: string[] = [];
  for (const row of workouts) {
    const completedAt = Date.parse(String(row.completedAt ?? row.updatedAt ?? 0));
    if (completedAt && completedAt < cutoff) continue;
    const exercises = (row.exercises as { name?: string }[] | undefined) ?? [];
    for (const ex of exercises) {
      if (ex.name) names.push(ex.name);
    }
  }

  const muscles = [...new Set(names.map((n) => targetMuscleForExercise(n)))];
  const aliases = REGION_ALIASES[regionId] ?? [regionId.replace(/_/g, ' ')];
  const regionRecentlyTrained = aliases.some((a) =>
    muscles.some((m) => m.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(m.toLowerCase())),
  );

  const summary = names.length
    ? `Recent sessions (${lookbackHours}h): ${names.slice(0, 6).join(', ')}${names.length > 6 ? '…' : ''}`
    : `No workouts logged in the last ${lookbackHours} hours.`;

  return {
    recentExerciseNames: names,
    recentMuscles: muscles,
    regionRecentlyTrained,
    summary,
  };
}

export function triageInterpretation(input: {
  regionId: string;
  descriptors: string[];
  recent: RecentTrainingContext;
}): { flag: string; message: string; suggestModifyWorkout: boolean } {
  const label = input.regionId.replace(/_/g, ' ');
  const injury = input.descriptors.some((d) => ['sharp', 'swelling', 'sudden'].includes(d));
  const sore = input.descriptors.some((d) => ['sore', 'aching', 'tight'].includes(d));

  if (injury) {
    return {
      flag: 'INJURY_RISK',
      message: `Risk flag for ${label}: sharp/sudden markers lean toward injury risk vs ordinary fatigue. ${input.recent.summary}`,
      suggestModifyWorkout: true,
    };
  }

  if (sore && input.recent.regionRecentlyTrained) {
    return {
      flag: 'FATIGUE',
      message: `Risk flag for ${label}: more consistent with training fatigue — you recently trained related muscles. ${input.recent.summary}`,
      suggestModifyWorkout: false,
    };
  }

  if (sore && !input.recent.regionRecentlyTrained) {
    return {
      flag: 'NOT_TRAINING_SORENESS',
      message: `Risk flag for ${label}: unlikely ordinary workout soreness — recent logs don’t show work for this region (e.g. arm pain after a leg day). ${input.recent.summary}`,
      suggestModifyWorkout: true,
    };
  }

  return {
    flag: 'INCONCLUSIVE',
    message: `Risk flag for ${label}: not enough markers yet. ${input.recent.summary}`,
    suggestModifyWorkout: Boolean(input.descriptors.length),
  };
}
