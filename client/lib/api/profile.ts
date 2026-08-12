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

export async function recordConsent(
  userId: string,
  consentType: string,
  accepted: boolean,
  version = '1.0',
) {
  const appVersion = getAppVersion();
  const {
    enqueuePendingConsent,
    removePendingConsent,
  } = await import('../onboarding/storage');
  try {
    const result = await apiRequest(`/api/privacy/consents/${userId}`, {
      method: 'POST',
      body: { consentType, version, accepted, appVersion },
    });
    await removePendingConsent(userId, consentType);
    return result;
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      // Queue for durable re-validation once Spring Boot is reachable again.
      await enqueuePendingConsent(userId, { consentType, accepted, version, appVersion });
      return { accepted, consentType, offline: true as const };
    }
    throw err;
  }
}

/**
 * Re-post any required consents accepted while the backend was unavailable.
 * Called on session restore / sign-in so offline onboarding cannot permanently
 * bypass server-side consent persistence.
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
      // Leave item queued for a later retry on non-transient failures too —
      // consent must eventually land on Spring Boot.
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
      return { ...prefs, offline: true };
    }
    throw err;
  }
}

export async function resolveOnboardingComplete(userId: string): Promise<boolean> {
  const { getOnboardingCompleteLocal } = await import('../onboarding/storage');
  if (await getOnboardingCompleteLocal(userId)) return true;
  try {
    const profile = await fetchProfile(userId);
    if (!profile?.age || !profile.sex) return false;
    const goal = await fetchCurrentGoal(userId);
    return goal.hasGoal === true || Boolean(goal.primaryGoal);
  } catch {
    return false;
  }
}
