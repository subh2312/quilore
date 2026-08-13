/**
 * UX feedback regressions: meal parse, voice sets, goal→macro mapping.
 */

import { parseVoiceSet } from '../../lib/voice/parseVoiceSet';
import { looksLikeMealLog, parseMealLogItems } from '../../lib/nutrition/parseMealLog';
import {
  calculateLocalMacroTargets,
  mapGoalToMacroPolicy,
} from '../../lib/nutrition/macroTargets';
import { targetMuscleForExercise } from '../../lib/workout/exerciseTargets';

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
