import { StyleSheet, Text, View, Pressable } from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

/** Range-based calorie/portion estimate + gram slider (never a single false-precision number). */
export function PortionRangeSlider({
  grams,
  calLow,
  calHigh,
  onChangeGrams,
}: {
  grams: number;
  calLow: number;
  calHigh: number;
  onChangeGrams: (g: number) => void;
}) {
  const c = useThemeColors();
  return (
    <View
      style={[styles.wrap, { backgroundColor: c.surfaceMuted }]}
      accessibilityLabel="Portion range slider">
      <Text style={[styles.range, { color: c.textPrimary }]}>
        Est. {Math.round(calLow)}–{Math.round(calHigh)} kcal
      </Text>
      <Text style={[styles.grams, { color: c.textSecondary }]}>{grams} g (adjustable)</Text>
      <View style={styles.controls}>
        <Pressable
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={() => onChangeGrams(Math.max(10, grams - 10))}
          accessibilityRole="button"
          accessibilityLabel="Decrease portion by 10 grams">
          <Text style={[styles.btnText, { color: c.textOnPrimary }]}>−10g</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={() => onChangeGrams(grams + 10)}
          accessibilityRole="button"
          accessibilityLabel="Increase portion by 10 grams">
          <Text style={[styles.btnText, { color: c.textOnPrimary }]}>+10g</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg },
  range: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  grams: { fontSize: typography.fontSize.sm },
  controls: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontWeight: '700' },
});
