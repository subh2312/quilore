import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const c = useThemeColors();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <View style={[styles.container, { backgroundColor: c.surface }]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Page not found</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          That screen isn’t part of Quilore. Head back to your workouts or nutrition.
        </Text>
        <Link href="/(tabs)" asChild>
          <Pressable
            style={[styles.button, { backgroundColor: c.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Go to home">
            <Text style={[styles.buttonText, { color: c.textOnPrimary }]}>Back to Quilore</Text>
          </Pressable>
        </Link>
      </View>
    </>
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
