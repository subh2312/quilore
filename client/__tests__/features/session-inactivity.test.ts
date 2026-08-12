/**
 * 30-day inactivity auto-logout contracts.
 */

import {
  clearStoredSession,
  getLastAuthActivityMs,
  getStoredAccessToken,
  persistSession,
  setLastAuthActivityMsForTests,
} from '../../lib/api/authStorage';
import {
  enforceInactivityTimeout,
  INACTIVITY_TIMEOUT_MS,
  isInactivityExpired,
} from '../../lib/api/sessionActivity';

describe('30-day inactivity auto-logout', () => {
  beforeEach(async () => {
    await clearStoredSession();
  });

  it('expires sessions older than 30 days', () => {
    const now = Date.UTC(2026, 7, 12);
    const last = now - INACTIVITY_TIMEOUT_MS - 1;
    expect(isInactivityExpired(last, now)).toBe(true);
  });

  it('keeps sessions within the 30-day window', () => {
    const now = Date.UTC(2026, 7, 12);
    const last = now - INACTIVITY_TIMEOUT_MS + 60_000;
    expect(isInactivityExpired(last, now)).toBe(false);
  });

  it('treats missing last-activity as not expired (logic helper)', () => {
    expect(isInactivityExpired(null, Date.now())).toBe(false);
  });

  it('clears stored session when last activity exceeds 30 days', async () => {
    const now = Date.UTC(2026, 7, 12);
    const stale = now - INACTIVITY_TIMEOUT_MS - 86_400_000;
    await persistSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: '11111111-1111-1111-1111-111111111111',
    });
    await setLastAuthActivityMsForTests(stale);

    expect(await enforceInactivityTimeout(now)).toBe(true);
    expect(await getStoredAccessToken()).toBeNull();
    expect(await getLastAuthActivityMs()).toBeNull();
  });

  it('grandfathers legacy sessions without a last-activity timestamp', async () => {
    const now = Date.UTC(2026, 7, 12);
    await persistSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: '11111111-1111-1111-1111-111111111111',
    });
    await setLastAuthActivityMsForTests(null);

    expect(await enforceInactivityTimeout(now)).toBe(false);
    expect(await getStoredAccessToken()).toBe('access');
    expect(await getLastAuthActivityMs()).toBe(now);
  });

  it('does nothing when no session tokens are stored', async () => {
    expect(await enforceInactivityTimeout()).toBe(false);
  });
});
