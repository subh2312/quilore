/**
 * Onboarding local storage + required-consent fail-closed contracts.
 */

import {
  enqueuePendingConsent,
  getOnboardingCompleteLocal,
  getOnboardingDraft,
  getPendingConsents,
  resetOnboardingStorageForTests,
  saveOnboardingDraft,
  setOnboardingCompleteLocal,
} from '../../lib/onboarding/storage';

jest.mock('../../lib/appVersion', () => ({
  getAppVersion: () => '0.1.0',
}));

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

  it('queues pending consents per user without cross-account leak', async () => {
    await enqueuePendingConsent(USER_A, {
      consentType: 'terms_of_use',
      accepted: true,
      version: '1.0',
      appVersion: '0.1.0',
    });
    expect(await getPendingConsents(USER_A)).toHaveLength(1);
    expect(await getPendingConsents(USER_B)).toEqual([]);
  });
});

describe('Required consent fail-closed', () => {
  const globalFetch = global.fetch;

  beforeEach(() => {
    resetOnboardingStorageForTests();
  });

  afterEach(() => {
    global.fetch = globalFetch;
    resetOnboardingStorageForTests();
  });

  it('fails required consent writes when Spring Boot is unavailable', async () => {
    const { recordConsent } = await import('../../lib/api/profile');
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(recordConsent(USER_A, 'terms_of_use', true)).rejects.toMatchObject({
      endpointUnavailable: true,
    });
    expect(await getPendingConsents(USER_A)).toEqual([]);
  });

  it('flushes legacy pending consents once the backend is reachable', async () => {
    const { flushPendingConsents } = await import('../../lib/api/profile');
    await enqueuePendingConsent(USER_A, {
      consentType: 'terms_of_use',
      accepted: true,
      version: '1.0',
      appVersion: '0.1.0',
    });
    await enqueuePendingConsent(USER_A, {
      consentType: 'ai_editable_disclaimer',
      accepted: true,
      version: '1.0',
      appVersion: '0.1.0',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accepted: true }),
    });

    const outcome = await flushPendingConsents(USER_A);
    expect(outcome).toEqual({ flushed: 2, remaining: 0 });
    expect(await getPendingConsents(USER_A)).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('blocks onboarding complete when required server consents are missing', async () => {
    const { resolveOnboardingComplete } = await import('../../lib/api/profile');
    await setOnboardingCompleteLocal(true, USER_A);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ consentType: 'terms_of_use', accepted: true }],
    });

    expect(await resolveOnboardingComplete(USER_A)).toBe(false);
  });

  it('grants onboarding complete only after all required consents are on the server', async () => {
    const { resolveOnboardingComplete } = await import('../../lib/api/profile');
    await setOnboardingCompleteLocal(true, USER_A);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { consentType: 'terms_of_use', accepted: true },
        { consentType: 'ai_editable_disclaimer', accepted: true },
        { consentType: 'injury_risk_flag_disclaimer', accepted: true },
      ],
    });

    expect(await resolveOnboardingComplete(USER_A)).toBe(true);
  });

  it('denies tab access while a legacy offline consent queue remains', async () => {
    const { resolveOnboardingComplete } = await import('../../lib/api/profile');
    await setOnboardingCompleteLocal(true, USER_A);
    await enqueuePendingConsent(USER_A, {
      consentType: 'terms_of_use',
      accepted: true,
      version: '1.0',
      appVersion: '0.1.0',
    });

    expect(await resolveOnboardingComplete(USER_A)).toBe(false);
  });
});
