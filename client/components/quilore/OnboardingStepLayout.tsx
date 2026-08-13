import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { usePrefersReducedMotion, useThemeColors } from '@/hooks/useTheme';

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
  const c = useThemeColors();
  const reduceMotion = usePrefersReducedMotion();
  const entering = reduceMotion ? undefined : FadeInRight.duration(280);
  const exiting = reduceMotion ? undefined : FadeOutLeft.duration(200);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <Animated.View entering={entering} exiting={exiting} style={styles.container}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            <Text style={[styles.progress, { color: c.textSuccess }]}>
              Step {step} of {totalSteps}
            </Text>
            <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
          </ScrollView>
          <View style={[styles.actions, { borderTopColor: c.border, backgroundColor: c.surface }]}>
            {onBack ? (
              <Pressable
                style={[styles.secondary, { borderColor: c.borderStrong }]}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back">
                <Text style={[styles.secondaryText, { color: c.textPrimary }]}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.spacer} />
            )}
            <Pressable
              style={[styles.primary, { backgroundColor: c.primary }, nextDisabled && styles.disabled]}
              disabled={nextDisabled}
              onPress={onNext}
              accessibilityRole="button"
              accessibilityState={{ disabled: Boolean(nextDisabled) }}>
              <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>{nextLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  scrollContent: { flexGrow: 1, gap: spacing.md, paddingBottom: spacing.xl },
  progress: { fontWeight: '700', fontSize: typography.fontSize.sm },
  title: { fontSize: typography.fontSize.xl, fontWeight: '800' },
  subtitle: { fontSize: typography.fontSize.md, lineHeight: 22 },
  body: { gap: spacing.md, paddingBottom: spacing.lg },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  spacer: { flex: 1 },
  primary: {
    flex: 2,
    minHeight: touchTarget.minHeight,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontWeight: '800', fontSize: typography.fontSize.md },
  secondary: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
