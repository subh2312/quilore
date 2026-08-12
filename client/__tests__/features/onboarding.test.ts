/**
 * Onboarding local storage contracts.
 */

import {
  getOnboardingCompleteLocal,
  getOnboardingDraft,
  resetOnboardingStorageForTests,
  saveOnboardingDraft,
  setOnboardingCompleteLocal,
} from '../../lib/onboarding/storage';

describe('Onboarding storage', () => {
  beforeEach(() => resetOnboardingStorageForTests());

  it('tracks completion flag per user', async () => {
    expect(await getOnboardingCompleteLocal('user-a')).toBe(false);
    await setOnboardingCompleteLocal(true, 'user-a');
    expect(await getOnboardingCompleteLocal('user-a')).toBe(true);
    expect(await getOnboardingCompleteLocal('user-b')).toBe(false);
  });

  it('persists draft baseline fields', async () => {
    await saveOnboardingDraft({ age: 28, sex: 'female', primaryGoal: 'recomp' });
    const draft = await getOnboardingDraft();
    expect(draft.age).toBe(28);
    expect(draft.primaryGoal).toBe('recomp');
  });

  it('merges partial draft updates', async () => {
    await saveOnboardingDraft({ age: 28, sex: 'female', heightCm: 165 });
    await saveOnboardingDraft({ consentsAccepted: true });
    const draft = await getOnboardingDraft();
    expect(draft.age).toBe(28);
    expect(draft.heightCm).toBe(165);
    expect(draft.consentsAccepted).toBe(true);
  });
});
