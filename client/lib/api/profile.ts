import { getAppVersion } from '../appVersion';
import { apiRequest, ApiClientError } from './client';

export type UserProfile = {
  userId: string;
  age: number;
  sex: string;
  heightCm: number;
  weightKg: number;
  trainingExperience: string;
  dietaryPreferences?: string;
  injuriesInfo: string;
  equipmentAccess?: string;
  injuriesDisclaimer: string;
};

export type ProfileUpsertInput = {
  age: number;
  sex: string;
  heightCm: number;
  weightKg: number;
  trainingExperience?: string;
  dietaryPreferences?: string;
  injuriesInfo?: string;
  equipmentAccess?: string;
};

export type GoalSnapshot = {
  hasGoal?: boolean;
  primaryGoal?: string;
  coachingTone?: string;
  secondaryPrefs?: string[];
  schedulePrefs?: Record<string, unknown>;
  version?: number;
};

export type ConsentRecord = {
  consentType: string;
  accepted: boolean;
  version?: string;
  appVersion?: string;
};

/** Mandatory onboarding consents that must exist on Spring Boot before tab access. */
export const REQUIRED_CONSENT_TYPES = [
  'terms_of_use',
  'ai_editable_disclaimer',
  'injury_risk_flag_disclaimer',
] as const;

export async function upsertProfile(userId: string, input: ProfileUpsertInput): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/api/profiles/${userId}`, { method: 'PUT', body: input });
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    return await apiRequest<UserProfile>(`/api/profiles/${userId}`);
  } catch (err) {
    if (err instanceof ApiClientError && (err.endpointUnavailable || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

export async function saveGoal(
  userId: string,
  body: {
    primaryGoal: string;
    secondaryPrefs?: string[];
    coachingTone?: string;
    schedulePrefs?: Record<string, unknown>;
  },
): Promise<GoalSnapshot> {
  return apiRequest<GoalSnapshot>(`/api/goals/${userId}`, { method: 'POST', body });
}

export async function fetchCurrentGoal(userId: string): Promise<GoalSnapshot> {
  try {
    return await apiRequest<GoalSnapshot>(`/api/goals/${userId}/current`);
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return { hasGoal: false };
    }
    throw err;
  }
}

/**
 * Persist a consent to Spring Boot. Required consents are fail-closed: backend
 * unavailability throws (never treated as success / offline:true).
 */
export async function recordConsent(
  userId: string,
  consentType: string,
  accepted: boolean,
  version = '1.0',
) {
  const appVersion = getAppVersion();
  const { removePendingConsent } = await import('../onboarding/storage');
  const result = await apiRequest(`/api/privacy/consents/${userId}`, {
    method: 'POST',
    body: { consentType, version, accepted, appVersion },
  });
  await removePendingConsent(userId, consentType);
  return result;
}

export async function fetchConsents(userId: string): Promise<ConsentRecord[]> {
  return apiRequest<ConsentRecord[]>(`/api/privacy/consents/${userId}`);
}

export function hasAcceptedRequiredConsents(records: ConsentRecord[]): boolean {
  return REQUIRED_CONSENT_TYPES.every((type) =>
    records.some((c) => c.consentType === type && c.accepted === true),
  );
}

/**
 * Re-validate mandatory consents against Spring Boot.
 * - Online: requires all REQUIRED_CONSENT_TYPES accepted server-side.
 * - Offline with no pending queue: allow only if local onboarding already completed
 *   (implies a prior successful online consent write after fail-closed enforcement).
 * - Pending offline queue remaining: deny access until flushed.
 */
export async function verifyRequiredConsents(
  userId: string,
  options?: { allowOfflineWithoutPriorLocal?: boolean },
): Promise<boolean> {
  const { getOnboardingCompleteLocal, getPendingConsents } = await import('../onboarding/storage');
  if ((await getPendingConsents(userId)).length > 0) {
    return false;
  }
  try {
    const records = await fetchConsents(userId);
    return hasAcceptedRequiredConsents(records);
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      if (options?.allowOfflineWithoutPriorLocal) {
        return true;
      }
      return (await getOnboardingCompleteLocal(userId)) === true;
    }
    return false;
  }
}

/**
 * Re-post any consents left in the legacy offline queue (from an earlier
 * queue-and-proceed path). New required consent writes no longer enqueue.
 */
export async function flushPendingConsents(userId: string): Promise<{ flushed: number; remaining: number }> {
  const { getPendingConsents, removePendingConsent } = await import('../onboarding/storage');
  const pending = await getPendingConsents(userId);
  if (!pending.length) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  for (const item of pending) {
    try {
      await apiRequest(`/api/privacy/consents/${userId}`, {
        method: 'POST',
        body: {
          consentType: item.consentType,
          version: item.version,
          accepted: item.accepted,
          appVersion: item.appVersion,
        },
      });
      await removePendingConsent(userId, item.consentType);
      flushed += 1;
    } catch (err) {
      if (err instanceof ApiClientError && err.endpointUnavailable) {
        break;
      }
      // Leave item queued for a later retry — consent must land on Spring Boot.
    }
  }

  const remaining = (await getPendingConsents(userId)).length;
  return { flushed, remaining };
}

export async function savePrivacyPreferences(
  userId: string,
  prefs: { analyticsOptIn: boolean; crashReportingOptIn: boolean },
) {
  try {
    return await apiRequest(`/api/privacy/preferences/${userId}`, {
      method: 'PUT',
      body: {
        analyticsOptIn: prefs.analyticsOptIn,
        crashReportingOptIn: prefs.crashReportingOptIn,
        privacyModeNotifications: true,
      },
    });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      // Optional prefs may degrade offline; required consents must not.
      return { ...prefs, offline: true as const };
    }
    throw err;
  }
}

export async function resolveOnboardingComplete(userId: string): Promise<boolean> {
  const { getOnboardingCompleteLocal, setOnboardingCompleteLocal } = await import('../onboarding/storage');
  let baselineComplete = await getOnboardingCompleteLocal(userId);
  if (!baselineComplete) {
    try {
      const profile = await fetchProfile(userId);
      if (!profile?.age || !profile.sex) return false;
      const goal = await fetchCurrentGoal(userId);
      baselineComplete = goal.hasGoal === true || Boolean(goal.primaryGoal);
    } catch {
      return false;
    }
  }
  if (!baselineComplete) return false;
  const consentsOk = await verifyRequiredConsents(userId);
  if (consentsOk) {
    await setOnboardingCompleteLocal(true, userId);
  }
  return consentsOk;
}
