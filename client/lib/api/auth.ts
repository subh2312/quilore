import { apiRequest, ApiClientError } from "./client";
import { clearStoredSession, getStoredRefreshToken, persistSession } from "./authStorage";
import type { AuthSession, AuthUser } from "./types";

/** Set when login/register establishes a new session during an in-flight logout. */
let newSessionEstablishedDuringLogout = false;
let inFlightLogoutCount = 0;

function markNewSessionEstablished() {
  if (inFlightLogoutCount > 0) {
    newSessionEstablishedDuringLogout = true;
  }
}

export function isSupportOrAdmin(role: string): boolean {
  return role === "SUPPORT" || role === "ADMIN";
}

export async function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/me");
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
  markNewSessionEstablished();
  await persistSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, userId: session.user.id });
  return session;
}

export async function register(email: string, password: string, displayName: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/api/auth/register", {
    method: "POST",
    body: { email, password, displayName },
    auth: false,
  });
  markNewSessionEstablished();
  await persistSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, userId: session.user.id });
  return session;
}

export async function refreshSession(): Promise<AuthSession | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;
  try {
    const session = await apiRequest<AuthSession>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    });
    await persistSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, userId: session.user.id });
    return session;
  } catch (err) {
    if (err instanceof ApiClientError && (err.endpointUnavailable || err.status === 0)) {
      return null;
    }
    await clearStoredSession();
    return null;
  }
}

export async function logout(refreshToken: string) {
  inFlightLogoutCount += 1;
  try {
    await apiRequest("/api/auth/logout", { method: "POST", body: { refreshToken } });
  } finally {
    inFlightLogoutCount -= 1;
    if (inFlightLogoutCount === 0) {
      if (!newSessionEstablishedDuringLogout) {
        await clearStoredSession();
      }
      newSessionEstablishedDuringLogout = false;
    }
  }
}
