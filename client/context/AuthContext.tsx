import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, useSegments } from 'expo-router';
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  register as apiRegister,
} from '@/lib/api/auth';
import { getStoredAccessToken, getStoredRefreshToken, clearStoredSession } from '@/lib/api/authStorage';
import { resolveOnboardingComplete } from '@/lib/api/profile';
import { setOnboardingCompleteLocal } from '@/lib/onboarding/storage';
import type { AuthUser } from '@/lib/api/types';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAuthState(): Promise<{ user: AuthUser | null; onboardingComplete: boolean }> {
  try {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      const session = await refreshSession();
      if (session?.user) {
        return {
          user: session.user,
          onboardingComplete: await resolveOnboardingComplete(session.user.id),
        };
      }
    }
    const accessToken = await getStoredAccessToken();
    if (accessToken) {
      const me = await fetchMe();
      return { user: me, onboardingComplete: await resolveOnboardingComplete(me.id) };
    }
    return { user: null, onboardingComplete: false };
  } catch {
    return { user: null, onboardingComplete: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const refreshOnboardingStatus = useCallback(async () => {
    if (!user) {
      setOnboardingComplete(false);
      return;
    }
    const complete = await resolveOnboardingComplete(user.id);
    setOnboardingComplete(complete);
  }, [user]);

  useEffect(() => {
    let active = true;
    void loadAuthState().then((state) => {
      if (!active) return;
      setUser(state.user);
      setOnboardingComplete(state.onboardingComplete);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await apiLogin(email, password);
    setUser(session.user);
    const complete = await resolveOnboardingComplete(session.user.id);
    setOnboardingComplete(complete);
    return complete;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const session = await apiRegister(email, password, displayName);
    setUser(session.user);
    setOnboardingComplete(false);
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setOnboardingComplete(false);
    try {
      const refreshToken = await getStoredRefreshToken();
      if (refreshToken) {
        await apiLogout(refreshToken);
      } else {
        await clearStoredSession();
      }
    } catch {
      await clearStoredSession();
    }
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;
    await setOnboardingCompleteLocal(true, user.id);
    setOnboardingComplete(true);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      onboardingComplete,
      signIn,
      signUp,
      signOut,
      refreshOnboardingStatus,
      markOnboardingComplete,
    }),
    [
      user,
      isLoading,
      onboardingComplete,
      signIn,
      signUp,
      signOut,
      refreshOnboardingStatus,
      markOnboardingComplete,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Redirect unauthenticated users to auth and incomplete onboarding to onboarding stack. */
export function useProtectedRoute(enabled: boolean) {
  const { isLoading, isAuthenticated, onboardingComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || isLoading) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inOnboarding = root === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace(onboardingComplete ? '/(tabs)' : '/onboarding/welcome');
      return;
    }

    if (isAuthenticated && !onboardingComplete && !inOnboarding && !inAuthGroup) {
      router.replace('/onboarding/welcome');
    }
  }, [enabled, isLoading, isAuthenticated, onboardingComplete, segments, router]);
}
