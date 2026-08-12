import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/constants/DesignTokens';

type Macro = { label: string; consumed: number; target: number; unit?: string };

export function MacroProgressCard({
  title = 'Today vs targets',
  macros,
}: {
  title?: string;
  macros: Macro[];
}) {
  return (
    <View style={styles.card} accessibilityLabel="Macro target progress card">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.disclaimer}>Coaching estimates — reviewable, not medical targets.</Text>
      {macros.map((m) => {
        const pct = m.target > 0 ? Math.min(1, m.consumed / m.target) : 0;
        const remaining = Math.max(0, m.target - m.consumed);
        return (
          <View key={m.label} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.label}>{m.label}</Text>
              <Text style={styles.values}>
                {Math.round(m.consumed)}/{Math.round(m.target)}
                {m.unit ?? ''} · {Math.round(remaining)} left
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.gray50,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: typography.fontSize.lg, fontWeight: '700', color: palette.gray900 },
  disclaimer: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  row: { gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: typography.fontSize.sm, fontWeight: '600', color: palette.gray700 },
  values: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  barTrack: { height: 8, backgroundColor: palette.gray200, borderRadius: radii.full, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: palette.emerald },
});
