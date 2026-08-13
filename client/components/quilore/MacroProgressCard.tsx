import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

type Macro = { label: string; consumed: number; target: number; unit?: string };

export function MacroProgressCard({
  title = 'Today vs targets',
  macros,
}: {
  title?: string;
  macros: Macro[];
}) {
  const c = useThemeColors();
  return (
    <View
      style={[styles.card, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
      accessibilityLabel="Macro target progress card">
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      <Text style={[styles.disclaimer, { color: c.textMuted }]}>
        Coaching estimates — reviewable, not medical targets.
      </Text>
      {macros.map((m) => {
        const pct = m.target > 0 ? Math.min(1, m.consumed / m.target) : 0;
        const remaining = Math.max(0, m.target - m.consumed);
        return (
          <View key={m.label} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{m.label}</Text>
              <Text style={[styles.values, { color: c.textMuted }]}>
                {Math.round(m.consumed)}/{Math.round(m.target)}
                {m.unit ?? ''} · {Math.round(remaining)} left
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: c.border }]}>
              <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: c.primary }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  title: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  disclaimer: { fontSize: typography.fontSize.xs },
  row: { gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  values: { fontSize: typography.fontSize.xs },
  barTrack: { height: 8, borderRadius: radii.full, overflow: 'hidden' },
  barFill: { height: 8 },
});
