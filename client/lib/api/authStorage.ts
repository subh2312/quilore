/**
 * Secure token storage for Spring Boot JWT sessions.
 */

let memoryToken: string | null = null;
let memoryRefresh: string | null = null;
let memoryUserId: string | null = null;

async function secureGet(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* Expo Go / web fallback */
  }
}

async function secureDelete(key: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* noop */
  }
}

const KEYS = {
  access: 'quilore_access_token',
  refresh: 'quilore_refresh_token',
  userId: 'quilore_user_id',
} as const;

export async function getAccessToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  memoryToken = await secureGet(KEYS.access);
  return memoryToken;
}

export async function getRefreshToken(): Promise<string | null> {
  if (memoryRefresh) return memoryRefresh;
  memoryRefresh = await secureGet(KEYS.refresh);
  return memoryRefresh;
}

export async function getStoredUserId(): Promise<string | null> {
  if (memoryUserId) return memoryUserId;
  memoryUserId = await secureGet(KEYS.userId);
  return memoryUserId;
}

export async function saveSession(accessToken: string, refreshToken: string, userId: string) {
  memoryToken = accessToken;
  memoryRefresh = refreshToken;
  memoryUserId = userId;
  await secureSet(KEYS.access, accessToken);
  await secureSet(KEYS.refresh, refreshToken);
  await secureSet(KEYS.userId, userId);
}

export async function clearSession() {
  memoryToken = null;
  memoryRefresh = null;
  memoryUserId = null;
  await secureDelete(KEYS.access);
  await secureDelete(KEYS.refresh);
  await secureDelete(KEYS.userId);
}

/** Test helper — inject token without SecureStore. */
export function setAccessTokenForTests(token: string | null) {
  memoryToken = token;
}
