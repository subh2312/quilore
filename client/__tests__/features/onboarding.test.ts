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

  it('tracks completion flag locally', async () => {
    expect(await getOnboardingCompleteLocal()).toBe(false);
    await setOnboardingCompleteLocal(true);
    expect(await getOnboardingCompleteLocal()).toBe(true);
  });

  it('persists draft baseline fields', async () => {
    await saveOnboardingDraft({ age: 28, sex: 'female', primaryGoal: 'recomp' });
    const draft = await getOnboardingDraft();
    expect(draft.age).toBe(28);
    expect(draft.primaryGoal).toBe('recomp');
  });
});
