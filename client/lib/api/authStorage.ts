const memory: Record<string, string | undefined> = {};

async function secureGet(key: string): Promise<string | null> {
  if (process.env.JEST_WORKER_ID !== undefined) return memory[key] ?? null;
  try {
    const SecureStore = await import("expo-secure-store");
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
    const SecureStore = await import("expo-secure-store");
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    memory[key] = value ?? undefined;
  }
}

const KEYS = {
  access: "quilore_access_token",
  refresh: "quilore_refresh_token",
  userId: "quilore_user_id",
  lastActivity: "quilore_last_auth_activity",
} as const;

export async function getStoredAccessToken() { return secureGet(KEYS.access); }
export async function getStoredRefreshToken() { return secureGet(KEYS.refresh); }
export async function getStoredUserId() { return secureGet(KEYS.userId); }

export async function getLastAuthActivityMs(): Promise<number | null> {
  const raw = await secureGet(KEYS.lastActivity);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function touchLastAuthActivity(nowMs = Date.now()) {
  await secureSet(KEYS.lastActivity, String(nowMs));
}

/** Test helper — stamp an arbitrary last-activity time. */
export async function setLastAuthActivityMsForTests(ms: number | null) {
  await secureSet(KEYS.lastActivity, ms == null ? null : String(ms));
}

export async function persistSession(session: { accessToken: string; refreshToken: string; userId: string }) {
  await secureSet(KEYS.access, session.accessToken);
  await secureSet(KEYS.refresh, session.refreshToken);
  await secureSet(KEYS.userId, session.userId);
  await touchLastAuthActivity();
}

export async function clearStoredSession() {
  await secureSet(KEYS.access, null);
  await secureSet(KEYS.refresh, null);
  await secureSet(KEYS.userId, null);
  await secureSet(KEYS.lastActivity, null);
}
