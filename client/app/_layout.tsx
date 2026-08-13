import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AnimatedSplash } from '@/components/quilore/AnimatedSplash';
import { AuthProvider, useAuth, useProtectedRoute } from '@/context/AuthContext';
import { hydrateFromDatabase } from '@/lib/offline/store';

// Must run before mount — Expo Router per-route metrics (SDK 56+).
Observe.configure({
  integrations: { 'expo-router': true },
});

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [splashDone, setSplashDone] = useState(false);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);
  const [hydrateDone, setHydrateDone] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    void (async () => {
      try {
        await hydrateFromDatabase();
      } catch {
        // Offline hydrate is best-effort; still allow startup metrics.
      } finally {
        if (!cancelled) setHydrateDone(true);
      }
    })();
    void SplashScreen.hideAsync()
      .then(() => setNativeSplashHidden(true))
      .catch(() => setNativeSplashHidden(true));
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav splashDone={splashDone} hydrateDone={hydrateDone} />
      {nativeSplashHidden && !splashDone ? (
        <AnimatedSplash onFinish={() => setSplashDone(true)} />
      ) : null}
    </AuthProvider>
  );
}

function RootLayoutNav({
  splashDone,
  hydrateDone,
}: {
  splashDone: boolean;
  hydrateDone: boolean;
}) {
  const colorScheme = useColorScheme();
  const { isLoading } = useAuth();
  const { markInteractive } = useObserve();
  const appReady = splashDone && hydrateDone && !isLoading;
  useProtectedRoute(appReady);

  useEffect(() => {
    if (!appReady) return;
    // App ready for input after fonts, awaited offline hydrate, branded splash, and auth bootstrap.
    markInteractive();
  }, [appReady, markInteractive]);

  if (!appReady) {
    return <View style={{ flex: 1, backgroundColor: '#059669' }} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
      </Stack>
    </ThemeProvider>
  );
}

export default ObserveRoot.wrap(RootLayout);
