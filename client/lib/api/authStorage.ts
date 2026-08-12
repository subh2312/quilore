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

const KEYS = { access: "quilore_access_token", refresh: "quilore_refresh_token", userId: "quilore_user_id" } as const;

export async function getStoredAccessToken() { return secureGet(KEYS.access); }
export async function getStoredRefreshToken() { return secureGet(KEYS.refresh); }
export async function getStoredUserId() { return secureGet(KEYS.userId); }

export async function persistSession(session: { accessToken: string; refreshToken: string; userId: string }) {
  await secureSet(KEYS.access, session.accessToken);
  await secureSet(KEYS.refresh, session.refreshToken);
  await secureSet(KEYS.userId, session.userId);
}

export async function clearStoredSession() {
  await secureSet(KEYS.access, null);
  await secureSet(KEYS.refresh, null);
  await secureSet(KEYS.userId, null);
}
