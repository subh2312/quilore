/**
 * Goal → macro policy mapping + local Mifflin estimate (mirrors Spring MacroTargetService).
 */

import { apiRequest, ApiClientError } from '../api/client';
import { listLocal, upsertLocal } from '../offline/store';

export type MacroPolicyGoal = 'maintain' | 'deficit' | 'surplus';

export type MacroTargetSnapshot = {
  goalType: MacroPolicyGoal;
  primaryGoal: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  policyVersion: string;
  source: 'api' | 'local';
};

export type MacroCalcInput = {
  primaryGoal: string;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: string;
  activityLevel?: string;
};

const POLICIES: Record<MacroPolicyGoal, { calorieDelta: number; proteinPerKg: number; fatFraction: number }> = {
  maintain: { calorieDelta: 0, proteinPerKg: 1.6, fatFraction: 0.25 },
  deficit: { calorieDelta: -0.15, proteinPerKg: 1.8, fatFraction: 0.25 },
  surplus: { calorieDelta: 0.1, proteinPerKg: 1.8, fatFraction: 0.25 },
};

/** Map product goal vocabulary onto macro policy keys. */
export function mapGoalToMacroPolicy(primaryGoal: string): MacroPolicyGoal {
  switch (primaryGoal) {
    case 'fat_loss':
      return 'deficit';
    case 'muscle_gain':
      return 'surplus';
    case 'recomp':
    case 'maintain':
    case 'performance':
    default:
      return 'maintain';
  }
}

function activityFactor(level?: string): number {
  switch ((level ?? 'moderate').toLowerCase()) {
    case 'light':
      return 1.375;
    case 'high':
      return 1.725;
    case 'moderate':
      return 1.55;
    default:
      return 1.2;
  }
}

function mifflin(weightKg: number, heightCm: number, age: number, sex: string): number {
  const male = sex.toLowerCase().startsWith('m');
  return male
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateLocalMacroTargets(input: MacroCalcInput): MacroTargetSnapshot {
  const goalType = mapGoalToMacroPolicy(input.primaryGoal);
  const policy = POLICIES[goalType];
  const tdee = mifflin(input.weightKg, input.heightCm, input.age, input.sex) * activityFactor(input.activityLevel);
  const calories = Math.round(tdee * (1 + policy.calorieDelta));
  const protein = input.weightKg * policy.proteinPerKg;
  const fat = (calories * policy.fatFraction) / 9;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return {
    goalType,
    primaryGoal: input.primaryGoal,
    targetCalories: calories,
    targetProteinG: Math.round(protein * 10) / 10,
    targetCarbsG: Math.round(carbs * 10) / 10,
    targetFatG: Math.round(fat * 10) / 10,
    policyVersion: 'macro-policy-v1',
    source: 'local',
  };
}

export function cacheMacroTargets(snapshot: MacroTargetSnapshot) {
  upsertLocal('targets', 'current', { ...snapshot }, false);
}

export function getCachedMacroTargets(): MacroTargetSnapshot | null {
  const row = listLocal('targets').find((r) => r.id === 'current');
  if (!row || typeof row.targetCalories !== 'number') return null;
  return {
    goalType: (row.goalType as MacroPolicyGoal) ?? 'maintain',
    primaryGoal: String(row.primaryGoal ?? 'maintain'),
    targetCalories: Number(row.targetCalories),
    targetProteinG: Number(row.targetProteinG),
    targetCarbsG: Number(row.targetCarbsG),
    targetFatG: Number(row.targetFatG),
    policyVersion: String(row.policyVersion ?? 'macro-policy-v1'),
    source: (row.source as 'api' | 'local') ?? 'local',
  };
}

export async function recalculateMacroTargets(
  userId: string,
  input: MacroCalcInput,
): Promise<MacroTargetSnapshot> {
  const local = calculateLocalMacroTargets(input);
  try {
    const api = await apiRequest<{
      goalType?: string;
      targetCalories: number;
      targetProteinG: number;
      targetCarbsG: number;
      targetFatG: number;
      policyVersion?: string;
    }>(`/api/nutrition/targets/macros/${userId}`, {
      method: 'POST',
      body: {
        goalType: local.goalType,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        age: input.age,
        sex: input.sex,
        activityLevel: input.activityLevel ?? 'moderate',
      },
    });
    const snapshot: MacroTargetSnapshot = {
      goalType: (api.goalType as MacroPolicyGoal) ?? local.goalType,
      primaryGoal: input.primaryGoal,
      targetCalories: api.targetCalories,
      targetProteinG: api.targetProteinG,
      targetCarbsG: api.targetCarbsG,
      targetFatG: api.targetFatG,
      policyVersion: api.policyVersion ?? local.policyVersion,
      source: 'api',
    };
    cacheMacroTargets(snapshot);
    return snapshot;
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      cacheMacroTargets(local);
      return local;
    }
    cacheMacroTargets(local);
    return local;
  }
}

export async function fetchLatestMacroTargets(userId: string): Promise<MacroTargetSnapshot | null> {
  const cached = getCachedMacroTargets();
  try {
    const history = await apiRequest<
      {
        goalType?: string;
        targetCalories: number;
        targetProteinG: number;
        targetCarbsG: number;
        targetFatG: number;
        policyVersion?: string;
      }[]
    >(`/api/nutrition/targets/macros/${userId}/history`);
    const latest = history[history.length - 1];
    if (!latest) return cached;
    const snapshot: MacroTargetSnapshot = {
      goalType: (latest.goalType as MacroPolicyGoal) ?? cached?.goalType ?? 'maintain',
      primaryGoal: cached?.primaryGoal ?? 'maintain',
      targetCalories: latest.targetCalories,
      targetProteinG: latest.targetProteinG,
      targetCarbsG: latest.targetCarbsG,
      targetFatG: latest.targetFatG,
      policyVersion: latest.policyVersion ?? 'macro-policy-v1',
      source: 'api',
    };
    cacheMacroTargets(snapshot);
    return snapshot;
  } catch {
    return cached;
  }
}
