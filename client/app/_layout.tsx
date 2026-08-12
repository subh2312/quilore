import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AnimatedSplash } from '@/components/quilore/AnimatedSplash';
import { AuthProvider, useProtectedRoute } from '@/context/AuthContext';
import { hydrateFromDatabase } from '@/lib/offline/store';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [splashDone, setSplashDone] = useState(false);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    void hydrateFromDatabase();
    void SplashScreen.hideAsync().then(() => setNativeSplashHidden(true));
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav splashDone={splashDone} />
      {nativeSplashHidden && !splashDone ? (
        <AnimatedSplash onFinish={() => setSplashDone(true)} />
      ) : null}
    </AuthProvider>
  );
}

function RootLayoutNav({ splashDone }: { splashDone: boolean }) {
  const colorScheme = useColorScheme();
  useProtectedRoute(splashDone);

  if (!splashDone) {
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
