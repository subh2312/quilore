import { useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { QuiloreLogo } from '@/components/quilore/QuiloreLogo';
import { palette, radii, spacing, touchTarget, typography } from '@/constants/DesignTokens';
import { track } from '@/lib/analytics';
import { useAuth } from '@/context/AuthContext';
import { useMarkObserveInteractive } from '@/hooks/useMarkObserveInteractive';

const VALUE_PROPS = [
  { title: 'Form & load coaching', body: 'Voice and vision cues you can confirm before they stick.' },
  { title: 'Indian nutrition accuracy', body: 'Meal scans as editable ranges — never false precision.' },
  { title: 'Mid-workout UX', body: 'High contrast, large targets for quick gym glances.' },
] as const;

export default function OnboardingWelcomeScreen() {
  useMarkObserveInteractive();
  const { signOut } = useAuth();

  useEffect(() => {
    track('onboarding_started', { source: 'welcome' });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.hero}>
        <QuiloreLogo size={112} />
        <Text style={styles.title}>Welcome to Quilore</Text>
        <Text style={styles.subtitle}>Your AI training partner — always editable, never final.</Text>
      </Animated.View>

      <View style={styles.cards}>
        {VALUE_PROPS.map((item, index) => (
          <Animated.View
            key={item.title}
            entering={FadeInDown.delay(180 + index * 120).duration(420)}
            style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.actions}>
        <Pressable style={styles.primary} onPress={() => router.push('/onboarding/consent')} accessibilityRole="button">
          <Text style={styles.primaryText}>Get started</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => void signOut()} accessibilityRole="button">
          <Text style={styles.secondaryText}>Sign out</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.gray50,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
    color: palette.gray900,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: palette.gray600,
    fontSize: typography.fontSize.md,
    lineHeight: 22,
    maxWidth: 320,
  },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  cardTitle: { fontWeight: '800', color: palette.emeraldDark, fontSize: typography.fontSize.md },
  cardBody: { marginTop: 4, color: palette.gray700, lineHeight: 20 },
  actions: { paddingBottom: spacing.lg, gap: spacing.md },
  primary: {
    minHeight: touchTarget.minHeight + 6,
    backgroundColor: palette.emerald,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: palette.white, fontWeight: '800', fontSize: typography.fontSize.lg },
  secondary: {
    minHeight: touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: palette.gray600, fontWeight: '700', fontSize: typography.fontSize.md },
});
