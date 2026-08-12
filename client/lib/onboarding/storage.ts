/**
 * Local onboarding completion flag and draft fallback when backend is unavailable.
 */

const ONBOARDING_COMPLETE_KEY = 'quilore_onboarding_complete_v1';
const ONBOARDING_DRAFT_KEY = 'quilore_onboarding_draft_v1';

const memory: Record<string, string | undefined> = {};

async function secureGet(key: string): Promise<string | null> {
  if (process.env.JEST_WORKER_ID !== undefined) return memory[key] ?? null;
  try {
    const SecureStore = await import('expo-secure-store');
    return (await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return memory[key] ?? null;
  }
}

async function secureSet(key: string, value: string | null) {
  if (process.env.JEST_WORKER_ID !== undefined) {
    memory[key] = value ?? undefined;
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    memory[key] = value ?? undefined;
  }
}

export type OnboardingDraft = {
  age?: number;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  trainingExperience?: string;
  dietaryPreferences?: string;
  injuriesInfo?: string;
  equipmentAccess?: string;
  primaryGoal?: string;
  coachingTone?: string;
  consentsAccepted?: boolean;
};

function onboardingCompleteKey(userId: string) {
  return `${ONBOARDING_COMPLETE_KEY}_${userId}`;
}

export async function getOnboardingCompleteLocal(userId: string): Promise<boolean> {
  const raw = await secureGet(onboardingCompleteKey(userId));
  return raw === 'true';
}

export async function setOnboardingCompleteLocal(complete: boolean, userId: string) {
  await secureSet(onboardingCompleteKey(userId), complete ? 'true' : null);
}

export async function clearOnboardingCompleteLocal(userId: string) {
  await secureSet(onboardingCompleteKey(userId), null);
}

export async function getOnboardingDraft(): Promise<OnboardingDraft> {
  const raw = await secureGet(ONBOARDING_DRAFT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return {};
  }
}

export async function saveOnboardingDraft(patch: OnboardingDraft) {
  const existing = await getOnboardingDraft();
  await secureSet(ONBOARDING_DRAFT_KEY, JSON.stringify({ ...existing, ...patch }));
}

export async function clearOnboardingDraft() {
  await secureSet(ONBOARDING_DRAFT_KEY, null);
}

/** Test helper */
export function resetOnboardingStorageForTests() {
  for (const key of Object.keys(memory)) {
    if (key.startsWith('quilore_onboarding_')) delete memory[key];
  }
}
