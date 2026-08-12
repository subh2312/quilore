import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MacroProgressCard } from '@/components/quilore/MacroProgressCard';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';

const INSIGHT =
  'Protein intake and training volume both trended lower recently — worth reviewing recovery fueling (suggestive, not causal).';

export default function ProgressScreen() {
  const [range, setRange] = useState<'week' | 'month'>('week');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Goal dashboards and training–nutrition insights</Text>

      <View style={styles.row}>
        {(['week', 'month'] as const).map((r) => (
          <Pressable
            key={r}
            style={[styles.chip, range === r && styles.chipOn]}
            onPress={() => setRange(r)}>
            <Text style={styles.chipText}>{r}</Text>
          </Pressable>
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

      <View style={styles.card}>
        <Text style={styles.section}>Correlation insight</Text>
        <Text style={styles.body}>{INSIGHT}</Text>
        <Text style={styles.meta}>Window: last {range === 'week' ? '7' : '30'} days · causalClaim: false</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Missing data</Text>
        <Text style={styles.body}>
          Sleep/recovery proxies sparse this {range} — insights stay conservative when data is thin.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: palette.gray200,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: palette.emeraldLight },
  chipText: { fontWeight: '700', color: palette.gray800, textTransform: 'capitalize' },
  card: { backgroundColor: palette.gray50, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  section: { fontWeight: '700', color: palette.gray800, fontSize: typography.fontSize.md },
  body: { color: palette.gray700, fontSize: typography.fontSize.sm, lineHeight: 20 },
  meta: { color: palette.gray500, fontSize: typography.fontSize.xs },
});
