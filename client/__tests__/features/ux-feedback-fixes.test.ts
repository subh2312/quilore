/**
 * UX feedback regressions: meal parse, voice sets, goal→macro mapping, prefs programs.
 */

import { parseVoiceSet } from '../../lib/voice/parseVoiceSet';
import { looksLikeMealLog, parseMealLogItems } from '../../lib/nutrition/parseMealLog';
import {
  calculateLocalMacroTargets,
  mapGoalToMacroPolicy,
} from '../../lib/nutrition/macroTargets';
import { targetMuscleForExercise } from '../../lib/workout/exerciseTargets';
import { generateProgramFromPreferences } from '../../lib/workout/generateFromPreferences';
import { localCoachFallback } from '../../lib/api/coach';
import { triageInterpretation } from '../../lib/workout/triageContext';

describe('Voice set parsing', () => {
  it('parses bench three by eight', () => {
    const parsed = parseVoiceSet('bench three by eight');
    expect(parsed).toEqual(
      expect.objectContaining({ name: 'bench', sets: '3', reps: '8' }),
    );
  });

  it('parses digit x forms', () => {
    expect(parseVoiceSet('Squat 3x5')?.sets).toBe('3');
    expect(parseVoiceSet('Squat 3x5')?.reps).toBe('5');
  });
});

describe('Meal log parsing', () => {
  it('does not invent dalma when user logs other foods', () => {
    const items = parseMealLogItems('Log paratha and alu bhaji for breakfast');
    const labels = items.map((i) => i.label.toLowerCase());
    expect(labels).toEqual(expect.arrayContaining(['paratha', 'alu bhaji']));
    expect(labels.join(' ')).not.toMatch(/dalma|jeera|bhindi/);
    expect(looksLikeMealLog('Log paratha and alu bhaji for breakfast')).toBe(true);
  });
});

describe('Coach always replies', () => {
  it('local fallback acknowledges meal log contents', () => {
    const res = localCoachFallback('Log paratha and alu bhaji for breakfast');
    expect(res.reply.toLowerCase()).toContain('paratha');
    expect(res.reply.length).toBeGreaterThan(20);
  });
});

describe('Goal to macro targets', () => {
  it('maps product goals and changes calories with goal', () => {
    expect(mapGoalToMacroPolicy('fat_loss')).toBe('deficit');
    expect(mapGoalToMacroPolicy('muscle_gain')).toBe('surplus');
    const base = { weightKg: 94, heightCm: 174, age: 33, sex: 'male' };
    const maintain = calculateLocalMacroTargets({ ...base, primaryGoal: 'maintain' });
    const cut = calculateLocalMacroTargets({ ...base, primaryGoal: 'fat_loss' });
    const bulk = calculateLocalMacroTargets({ ...base, primaryGoal: 'muscle_gain' });
    expect(cut.targetCalories).toBeLessThan(maintain.targetCalories);
    expect(bulk.targetCalories).toBeGreaterThan(maintain.targetCalories);
  });
});

describe('Exercise target muscle', () => {
  it('maps barbell curl to biceps not quads', () => {
    expect(targetMuscleForExercise('Barbell curl')).toBe('biceps');
  });
});

describe('Preference-based program generation', () => {
  it('builds different drafts for fat_loss vs muscle_gain', () => {
    const cut = generateProgramFromPreferences({
      primaryGoal: 'fat_loss',
      trainingExperience: 'beginner',
      equipmentAccess: 'full gym',
      daysPerWeek: 4,
    });
    const bulk = generateProgramFromPreferences({
      primaryGoal: 'muscle_gain',
      trainingExperience: 'advanced',
      equipmentAccess: 'home dumbbells',
      daysPerWeek: 4,
    });
    expect(cut.sessions).toHaveLength(4);
    expect(bulk.sessions).toHaveLength(4);
    expect(cut.activeSession.exercises.length).toBeGreaterThan(0);
    expect(cut.title.toLowerCase()).toContain('fat loss');
    expect(bulk.title.toLowerCase()).toContain('muscle gain');
    const cutNames = cut.sessions.flatMap((s) => s.exercises.map((e) => e.name)).join(' ');
    expect(cutNames.toLowerCase()).toMatch(/finisher|bike|walk/);
  });

  it('avoids pain regions and notes health conditions', () => {
    const prog = generateProgramFromPreferences({
      primaryGoal: 'recomp',
      trainingExperience: 'intermediate',
      equipmentAccess: 'gym',
      daysPerWeek: 4,
      goalPhysique: ['leaner', 'stronger'],
      painRegions: ['knees'],
      healthConditions: ['hypertension'],
      avoidRegions: ['shoulders'],
    });
    const names = prog.activeSession.exercises.map((e) => e.name.toLowerCase()).join(' ');
    expect(names).not.toMatch(/back squat|overhead press|bench press/);
    expect(names).toMatch(/pain-aware|mobility|health-aware|rpe/);
  });
});

describe('Triage recent training context', () => {
  it('flags arm pain after legs as not training soreness', () => {
    const result = triageInterpretation({
      regionId: 'shoulders',
      descriptors: ['sore', 'aching'],
      recent: {
        recentExerciseNames: ['Back Squat', 'Romanian Deadlift'],
        recentMuscles: ['quads', 'hamstrings'],
        regionRecentlyTrained: false,
        summary: 'Recent sessions (72h): Back Squat, Romanian Deadlift',
      },
    });
    expect(result.flag).toBe('NOT_TRAINING_SORENESS');
    expect(result.suggestModifyWorkout).toBe(true);
  });
});
