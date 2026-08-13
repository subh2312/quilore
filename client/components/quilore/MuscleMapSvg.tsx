import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

export const MUSCLE_REGIONS = [
  { id: 'chest', label: 'Chest', side: 'front', top: '22%', left: '28%', width: '44%', height: '12%' },
  { id: 'shoulders', label: 'Shoulders', side: 'front', top: '16%', left: '18%', width: '64%', height: '8%' },
  { id: 'abs', label: 'Abs', side: 'front', top: '36%', left: '34%', width: '32%', height: '16%' },
  { id: 'quads', label: 'Quads', side: 'front', top: '58%', left: '28%', width: '44%', height: '22%' },
  { id: 'upper_back', label: 'Upper back', side: 'back', top: '18%', left: '28%', width: '44%', height: '14%' },
  { id: 'lats', label: 'Lats', side: 'back', top: '32%', left: '22%', width: '56%', height: '14%' },
  { id: 'glutes', label: 'Glutes', side: 'back', top: '48%', left: '30%', width: '40%', height: '12%' },
  { id: 'hamstrings', label: 'Hamstrings', side: 'back', top: '60%', left: '28%', width: '44%', height: '20%' },
] as const;

export function regionLabel(regionId: string): string {
  return MUSCLE_REGIONS.find((r) => r.id === regionId)?.label ?? regionId.replace(/_/g, ' ');
}

export function MuscleMapSvg({
  side,
  selected,
  onSelect,
}: {
  side: 'front' | 'back';
  selected?: string;
  onSelect: (regionId: string) => void;
}) {
  const c = useThemeColors();
  const regions = MUSCLE_REGIONS.filter((r) => r.side === side);

  return (
    <View style={styles.wrap} accessibilityLabel="Interactive muscle map">
      <Text style={[styles.caption, { color: c.textSecondary }]}>
        {side === 'front' ? 'Front view' : 'Back view'} — tap a highlighted region
      </Text>
      <View
        style={[
          styles.silhouetteFrame,
          { backgroundColor: c.surfaceMuted, borderColor: c.border },
        ]}>
        <View style={[styles.head, { backgroundColor: c.border }]} />
        <View style={styles.torso}>
          <View style={[styles.neck, { backgroundColor: c.border }]} />
          <View style={[styles.body, { backgroundColor: c.chipBg }]}>
            {regions.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => onSelect(r.id)}
                style={[
                  styles.hotspot,
                  {
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height,
                    backgroundColor: selected === r.id ? c.primarySoft : `${c.primary}40`,
                    borderColor: selected === r.id ? c.textWarning : c.primaryMuted,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={r.label}>
                <Text style={[styles.hotspotText, { color: c.textPrimary }]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.legsRow}>
            <View style={[styles.leg, { backgroundColor: c.border }]} />
            <View style={[styles.leg, { backgroundColor: c.border }]} />
          </View>
        </View>
      </View>
      <View style={styles.legend}>
        {regions.map((r) => (
          <Pressable
            key={`chip_${r.id}`}
            onPress={() => onSelect(r.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected === r.id ? c.chipBgSelected : c.surfaceMuted,
                borderColor: selected === r.id ? c.textWarning : c.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === r.id }}>
            <Text style={[styles.chipText, { color: c.textPrimary }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.disclaimer, { color: c.textDanger }]}>
        Risk-flag triage only — not a medical diagnosis.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  caption: { fontSize: typography.fontSize.sm },
  silhouetteFrame: {
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
  },
  head: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    marginBottom: 4,
  },
  torso: { alignItems: 'center', width: '100%' },
  neck: { width: 28, height: 12, borderRadius: radii.sm },
  body: {
    width: 200,
    height: 280,
    borderRadius: 80,
    overflow: 'hidden',
    position: 'relative',
  },
  hotspot: {
    position: 'absolute',
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minHeight: 40,
  },
  hotspotText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  legsRow: { flexDirection: 'row', gap: 16, marginTop: -8 },
  leg: { width: 48, height: 72, borderRadius: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipText: { fontWeight: '600' },
  disclaimer: { fontSize: typography.fontSize.xs },
});
