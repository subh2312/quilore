import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';

type OnboardingStepLayoutProps = {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
};

export function OnboardingStepLayout({
  title,
  subtitle,
  step,
  totalSteps,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
}: OnboardingStepLayoutProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View
        entering={FadeInRight.duration(320)}
        exiting={FadeOutLeft.duration(220)}
        style={styles.container}>
        <Text style={styles.progress}>
          Step {step} of {totalSteps}
        </Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
        <View style={styles.actions}>
          {onBack ? (
            <Pressable style={styles.secondary} onPress={onBack} accessibilityRole="button">
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
          <Pressable
            style={[styles.primary, nextDisabled && styles.disabled]}
            disabled={nextDisabled}
            onPress={onNext}
            accessibilityRole="button">
            <Text style={styles.primaryText}>{nextLabel}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.white },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  progress: { color: palette.emeraldDark, fontWeight: '700', fontSize: typography.fontSize.sm },
  title: { fontSize: typography.fontSize.xl, fontWeight: '800', color: palette.gray900 },
  subtitle: { color: palette.gray600, fontSize: typography.fontSize.md, lineHeight: 22 },
  body: { flex: 1, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  spacer: { flex: 1 },
  primary: {
    flex: 2,
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: palette.white, fontWeight: '800', fontSize: typography.fontSize.md },
  secondary: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: palette.gray700, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
