/**
 * 30-day inactivity auto-logout.
 *
 * Last successful auth activity is the most recent of:
 * - login / register / token refresh (`persistSession`)
 * - any authenticated (JWT) API request that returns 2xx
 *
 * Checked on AuthProvider bootstrap and AppState foreground resume.
 * Sessions that have tokens but no timestamp (pre-upgrade) are grandfathered:
 * we write "now" instead of logging the user out on first launch after this ships.
 */

import {
  clearStoredSession,
  getLastAuthActivityMs,
  getStoredAccessToken,
  getStoredRefreshToken,
  touchLastAuthActivity,
} from './authStorage';

export const INACTIVITY_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

export function isInactivityExpired(
  lastActivityMs: number | null,
  nowMs: number,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
): boolean {
  if (lastActivityMs == null) return false;
  return nowMs - lastActivityMs > timeoutMs;
}

/** @returns true when the stored session was cleared for inactivity. */
export async function enforceInactivityTimeout(nowMs = Date.now()): Promise<boolean> {
  const access = await getStoredAccessToken();
  const refresh = await getStoredRefreshToken();
  if (!access && !refresh) return false;

  const last = await getLastAuthActivityMs();
  if (last == null) {
    await touchLastAuthActivity(nowMs);
    return false;
  }
  if (!isInactivityExpired(last, nowMs)) return false;
  await clearStoredSession();
  return true;
}
