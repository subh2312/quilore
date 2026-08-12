import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';

const REGIONS = [
  { id: 'chest', label: 'Chest', side: 'front' },
  { id: 'shoulders', label: 'Shoulders', side: 'front' },
  { id: 'abs', label: 'Abs', side: 'front' },
  { id: 'quads', label: 'Quads', side: 'front' },
  { id: 'upper_back', label: 'Upper back', side: 'back' },
  { id: 'lats', label: 'Lats', side: 'back' },
  { id: 'glutes', label: 'Glutes', side: 'back' },
  { id: 'hamstrings', label: 'Hamstrings', side: 'back' },
] as const;

export function MuscleMapSvg({
  side,
  selected,
  onSelect,
}: {
  side: 'front' | 'back';
  selected?: string;
  onSelect: (regionId: string) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityLabel="Interactive muscle map">
      <Text style={styles.caption}>{side === 'front' ? 'Front view' : 'Back view'} · tap a region</Text>
      <View style={styles.grid}>
        {REGIONS.filter((r) => r.side === side).map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onSelect(r.id)}
            style={[styles.region, selected === r.id && styles.regionOn]}
            accessibilityRole="button"
            accessibilityLabel={r.label}>
            <Text style={styles.regionText}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.disclaimer}>Risk-flag triage only — not a medical diagnosis.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  caption: { fontSize: typography.fontSize.sm, color: palette.gray600 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  region: {
    minWidth: '45%',
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.gray100,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  regionOn: { backgroundColor: palette.amberLight },
  regionText: { fontWeight: '600', color: palette.gray800 },
  disclaimer: { fontSize: typography.fontSize.xs, color: palette.red },
});
