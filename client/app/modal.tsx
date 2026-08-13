import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useTheme, useThemeColors } from '@/hooks/useTheme';

/** Lightweight help / about sheet — replaces Expo template modal. */
export default function ModalScreen() {
  const c = useThemeColors();
  const { isDark } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>About Quilore</Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>
        Coaching estimates stay editable. Injury triage is a risk flag only — never a diagnosis.
        Workouts come from your preferences; photos and imports are ways to update them.
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: c.primary }]}
        onPress={() => router.back()}
        accessibilityRole="button">
        <Text style={[styles.buttonText, { color: c.textOnPrimary }]}>Close</Text>
      </Pressable>
      <StatusBar style={Platform.OS === 'ios' ? (isDark ? 'light' : 'light') : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  body: { fontSize: typography.fontSize.md, textAlign: 'center', lineHeight: 22 },
  button: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '700' },
});
