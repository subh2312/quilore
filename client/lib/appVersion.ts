import Constants from 'expo-constants';

/** Runtime app version from Expo config (falls back for test/native builds). */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '0.0.0';
}
