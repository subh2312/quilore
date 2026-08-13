import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MacroProgressCard } from '@/components/quilore/MacroProgressCard';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, typography } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

const INSIGHT =
  'Protein intake and training volume both trended lower recently — worth reviewing recovery fueling (suggestive, not causal).';

export default function ProgressScreen() {
  const c = useThemeColors();
  const [range, setRange] = useState<'week' | 'month'>('week');

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: c.surface }]}
      style={{ backgroundColor: c.surface }}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Progress</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        Goal dashboards and training–nutrition insights
      </Text>

      <View style={styles.row}>
        {(['week', 'month'] as const).map((r) => (
          <SelectionChip
            key={r}
            label={r}
            selected={range === r}
            onPress={() => setRange(r)}
            accessibilityLabel={`Show ${r} progress`}
          />
        ))}
      </View>

      <MacroProgressCard
        title={`${range} goal progress`}
        macros={[
          { label: 'Training consistency', consumed: 72, target: 100 },
          { label: 'Nutrition adherence', consumed: 65, target: 100 },
          { label: 'Plan completion', consumed: 40, target: 100 },
        ]}
      />

      <View style={[styles.card, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
        <Text style={[styles.section, { color: c.textPrimary }]}>Correlation insight</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>{INSIGHT}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          Window: last {range === 'week' ? '7' : '30'} days · suggestive only (not a causal claim)
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
        <Text style={[styles.section, { color: c.textPrimary }]}>Missing data</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Sleep/recovery proxies sparse this {range} — insights stay conservative when data is thin.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, flexGrow: 1 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  subtitle: { fontSize: typography.fontSize.sm },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  card: { borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs, borderWidth: 1 },
  section: { fontWeight: '700', fontSize: typography.fontSize.md },
  body: { fontSize: typography.fontSize.sm, lineHeight: 20 },
  meta: { fontSize: typography.fontSize.xs },
});
