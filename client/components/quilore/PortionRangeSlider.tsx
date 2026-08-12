import { StyleSheet, Text, View, Pressable } from 'react-native';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';

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
  return (
    <View style={styles.wrap} accessibilityLabel="Portion range slider">
      <Text style={styles.range}>
        Est. {Math.round(calLow)}–{Math.round(calHigh)} kcal
      </Text>
      <Text style={styles.grams}>{grams} g (adjustable)</Text>
      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={() => onChangeGrams(Math.max(10, grams - 10))}>
          <Text style={styles.btnText}>−10g</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => onChangeGrams(grams + 10)}>
          <Text style={styles.btnText}>+10g</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, padding: spacing.md, backgroundColor: palette.gray50, borderRadius: radii.lg },
  range: { fontSize: typography.fontSize.lg, fontWeight: '700', color: palette.gray900 },
  grams: { fontSize: typography.fontSize.sm, color: palette.gray600 },
  controls: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.amber,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontWeight: '700', color: palette.gray900 },
});
