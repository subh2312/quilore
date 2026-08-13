/**
 * Preference-based workout / routine draft (editable).
 * Used when cloud program generation is offline or as the immediate client draft.
 */

export type ProgramPrefs = {
  primaryGoal: string;
  trainingExperience: string;
  equipmentAccess?: string;
  daysPerWeek?: number;
  secondaryPrefs?: string[];
  injuriesInfo?: string;
};

export type GeneratedExercise = {
  name: string;
  sets: number;
  reps: number;
  notes?: string;
};

export type GeneratedSession = {
  dayLabel: string;
  focus: string;
  exercises: GeneratedExercise[];
};

export type GeneratedProgram = {
  title: string;
  summary: string;
  sessions: GeneratedSession[];
  /** Today's / first session ready to edit on Workout tab */
  activeSession: GeneratedSession;
  source: 'local-prefs' | 'api-draft';
};

function equipmentBucket(equipment?: string): 'home' | 'gym' | 'bodyweight' {
  const e = (equipment ?? '').toLowerCase();
  if (!e.trim()) return 'gym';
  if (/body|none|no equipment|calisthen/.test(e)) return 'bodyweight';
  if (/home|dumbbell|db |bands|kettle/.test(e)) return 'home';
  return 'gym';
}

function setsForExperience(exp: string): { sets: number; reps: number } {
  switch (exp) {
    case 'beginner':
      return { sets: 3, reps: 10 };
    case 'advanced':
      return { sets: 4, reps: 6 };
    default:
      return { sets: 3, reps: 8 };
  }
}

function pickPool(goal: string, gear: 'home' | 'gym' | 'bodyweight'): Record<string, GeneratedExercise[]> {
  const vol = setsForExperience('intermediate');
  const gym: Record<string, GeneratedExercise[]> = {
    lower: [
      { name: 'Back Squat', ...vol },
      { name: 'Romanian Deadlift', sets: 3, reps: 8 },
      { name: 'Walking Lunge', sets: 3, reps: 10 },
      { name: 'Calf Raise', sets: 3, reps: 12 },
    ],
    push: [
      { name: 'Bench Press', ...vol },
      { name: 'Overhead Press', sets: 3, reps: 8 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
      { name: 'Triceps Pushdown', sets: 3, reps: 12 },
    ],
    pull: [
      { name: 'Barbell Row', ...vol },
      { name: 'Lat Pulldown', sets: 3, reps: 10 },
      { name: 'Face Pull', sets: 3, reps: 12 },
      { name: 'Barbell Curl', sets: 3, reps: 10 },
    ],
    full: [
      { name: 'Deadlift', sets: 3, reps: 5 },
      { name: 'Front Squat', sets: 3, reps: 8 },
      { name: 'Pull-Up', sets: 3, reps: 8 },
      { name: 'Dumbbell Bench', sets: 3, reps: 10 },
    ],
  };

  const home: Record<string, GeneratedExercise[]> = {
    lower: [
      { name: 'Goblet Squat', ...vol },
      { name: 'Dumbbell RDL', sets: 3, reps: 10 },
      { name: 'Split Squat', sets: 3, reps: 10 },
      { name: 'Glute Bridge', sets: 3, reps: 12 },
    ],
    push: [
      { name: 'Push-Up', ...vol },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
      { name: 'Dumbbell Floor Press', sets: 3, reps: 10 },
      { name: 'Band Pull-Apart', sets: 3, reps: 15 },
    ],
    pull: [
      { name: 'One-Arm Dumbbell Row', ...vol },
      { name: 'Band Lat Pulldown', sets: 3, reps: 12 },
      { name: 'Rear Delt Fly', sets: 3, reps: 12 },
      { name: 'Dumbbell Curl', sets: 3, reps: 12 },
    ],
    full: [
      { name: 'Goblet Squat', sets: 3, reps: 10 },
      { name: 'Push-Up', sets: 3, reps: 12 },
      { name: 'Dumbbell Row', sets: 3, reps: 10 },
      { name: 'Hip Hinge Good Morning', sets: 3, reps: 10 },
    ],
  };

  const bodyweight: Record<string, GeneratedExercise[]> = {
    lower: [
      { name: 'Bodyweight Squat', ...vol },
      { name: 'Reverse Lunge', sets: 3, reps: 10 },
      { name: 'Glute Bridge', sets: 3, reps: 12 },
      { name: 'Calf Raise', sets: 3, reps: 15 },
    ],
    push: [
      { name: 'Push-Up', ...vol },
      { name: 'Pike Push-Up', sets: 3, reps: 8 },
      { name: 'Diamond Push-Up', sets: 3, reps: 10 },
      { name: 'Plank', sets: 3, reps: 30 },
    ],
    pull: [
      { name: 'Inverted Row', ...vol },
      { name: 'Doorway Row', sets: 3, reps: 10 },
      { name: 'Superman Hold', sets: 3, reps: 20 },
      { name: 'Dead Bug', sets: 3, reps: 10 },
    ],
    full: [
      { name: 'Burpee', sets: 3, reps: 8 },
      { name: 'Bodyweight Squat', sets: 3, reps: 12 },
      { name: 'Push-Up', sets: 3, reps: 10 },
      { name: 'Mountain Climber', sets: 3, reps: 20 },
    ],
  };

  const pools = gear === 'home' ? home : gear === 'bodyweight' ? bodyweight : gym;

  // Fat-loss bias: add conditioning finisher note on full day.
  if (goal === 'fat_loss' || goal === 'recomp') {
    return {
      ...pools,
      full: [
        ...pools.full.slice(0, 3),
        { name: 'Bike or brisk walk finisher', sets: 1, reps: 12, notes: '12 min steady' },
      ],
    };
  }
  if (goal === 'muscle_gain') {
    return Object.fromEntries(
      Object.entries(pools).map(([k, list]) => [
        k,
        list.map((ex) => ({ ...ex, sets: Math.min(5, ex.sets + 1) })),
      ]),
    ) as Record<string, GeneratedExercise[]>;
  }
  return pools;
}

function applyExperience(ex: GeneratedExercise, experience: string): GeneratedExercise {
  const adj = setsForExperience(experience);
  return {
    ...ex,
    sets: experience === 'beginner' ? Math.min(ex.sets, adj.sets) : ex.sets,
    reps: experience === 'beginner' ? Math.max(ex.reps, adj.reps) : experience === 'advanced' ? adj.reps : ex.reps,
  };
}

/**
 * Build an editable multi-day draft from profile/goal preferences.
 */
export function generateProgramFromPreferences(prefs: ProgramPrefs): GeneratedProgram {
  const days = Math.min(6, Math.max(2, prefs.daysPerWeek ?? 4));
  const gear = equipmentBucket(prefs.equipmentAccess);
  const pools = pickPool(prefs.primaryGoal || 'recomp', gear);
  const experience = prefs.trainingExperience || 'beginner';

  const rotation =
    days <= 3
      ? (['full', 'full', 'full'] as const)
      : days === 4
        ? (['lower', 'push', 'pull', 'full'] as const)
        : (['lower', 'push', 'pull', 'lower', 'push', 'pull'] as const);

  const focusLabels: Record<string, string> = {
    lower: 'Lower body',
    push: 'Push (chest / shoulders / triceps)',
    pull: 'Pull (back / biceps)',
    full: 'Full body',
  };

  const sessions: GeneratedSession[] = Array.from({ length: days }, (_, i) => {
    const key = rotation[i % rotation.length];
    const exercises = (pools[key] ?? pools.full)
      .slice(0, experience === 'beginner' ? 3 : 4)
      .map((ex) => applyExperience(ex, experience));
    if (prefs.injuriesInfo?.trim()) {
      exercises.push({
        name: 'Injury-aware mobility / skip pain',
        sets: 1,
        reps: 1,
        notes: `Risk flag only — respect: ${prefs.injuriesInfo.slice(0, 80)}`,
      });
    }
    return {
      dayLabel: `Day ${i + 1}`,
      focus: focusLabels[key] ?? key,
      exercises,
    };
  });

  const goalLabel = (prefs.primaryGoal || 'recomp').replace(/_/g, ' ');
  return {
    title: `${days}-day ${goalLabel} routine`,
    summary: `Draft from your prefs · ${experience} · ${gear} equipment · editable before you train.`,
    sessions,
    activeSession: sessions[0],
    source: 'local-prefs',
  };
}

export function exercisesToDraftRows(session: GeneratedSession): {
  id: string;
  name: string;
  sets: string;
  reps: string;
}[] {
  return session.exercises.map((ex, i) => ({
    id: `gen_${Date.now()}_${i}`,
    name: ex.name,
    sets: String(ex.sets),
    reps: String(ex.reps),
  }));
}
