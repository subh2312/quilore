import { apiRequest } from './client';
import { clearSession, getRefreshToken, saveSession } from './authStorage';
import type { AuthSession, AuthUser } from './types';

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  await saveSession(session.accessToken, session.refreshToken, session.user.id);
  return session;
}

export async function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/me');
}

export async function refreshSession(): Promise<AuthSession | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const session = await apiRequest<AuthSession>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    await saveSession(session.accessToken, session.refreshToken, session.user.id);
    return session;
  } catch {
    await clearSession();
    return null;
  }
}

export function isSupportOrAdmin(role: string): boolean {
  return role === 'SUPPORT' || role === 'ADMIN';
}
