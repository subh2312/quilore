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

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('Onboarding storage', () => {
  beforeEach(() => resetOnboardingStorageForTests());

  it('tracks completion flag per user', async () => {
    expect(await getOnboardingCompleteLocal(USER_A)).toBe(false);
    await setOnboardingCompleteLocal(true, USER_A);
    expect(await getOnboardingCompleteLocal(USER_A)).toBe(true);
    expect(await getOnboardingCompleteLocal(USER_B)).toBe(false);
  });

  it('persists draft baseline fields per user', async () => {
    await saveOnboardingDraft(USER_A, { age: 28, sex: 'female', primaryGoal: 'recomp' });
    const draft = await getOnboardingDraft(USER_A);
    expect(draft.age).toBe(28);
    expect(draft.primaryGoal).toBe('recomp');
    expect(await getOnboardingDraft(USER_B)).toEqual({});
  });

  it('merges partial draft updates', async () => {
    await saveOnboardingDraft(USER_A, { age: 28, sex: 'female', heightCm: 165 });
    await saveOnboardingDraft(USER_A, { consentsAccepted: true });
    const draft = await getOnboardingDraft(USER_A);
    expect(draft.age).toBe(28);
    expect(draft.heightCm).toBe(165);
    expect(draft.consentsAccepted).toBe(true);
  });

  it('does not leak draft data across users', async () => {
    await saveOnboardingDraft(USER_A, { age: 42, weightKg: 80, injuriesInfo: 'knee' });
    await saveOnboardingDraft(USER_B, { consentsAccepted: true });
    const draftB = await getOnboardingDraft(USER_B);
    expect(draftB.age).toBeUndefined();
    expect(draftB.injuriesInfo).toBeUndefined();
    expect(draftB.consentsAccepted).toBe(true);
  });
});
