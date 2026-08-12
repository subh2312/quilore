import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/constants/DesignTokens';
import type { PersonalRecord, SessionSummaryResponse } from '@/lib/api/types';

type Props = {
  summary: SessionSummaryResponse;
};

export function SessionSummaryCard({ summary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Session summary</Text>
      <View style={styles.row}>
        <Stat label="Duration" value={`${summary.durationMinutes} min`} />
        <Stat label="Volume" value={`${Math.round(summary.totalVolumeKg)} kg`} />
        <Stat label="Exercises" value={String(summary.exerciseCount)} />
      </View>
      {summary.personalRecords.length > 0 ? (
        <>
          <Text style={styles.section}>Personal records</Text>
          {summary.personalRecords.map((pr) => (
            <PrRow key={`${pr.exerciseName}-${pr.metric}`} pr={pr} />
          ))}
        </>
      ) : (
        <Text style={styles.hint}>No new PRs this session — keep logging for trend detection.</Text>
      )}
      {summary.aiObservation ? (
        <Text style={styles.ai}>AI observation — editable before save</Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function PrRow({ pr }: { pr: PersonalRecord }) {
  return (
    <Text style={styles.pr}>
      {pr.exerciseName}: {pr.value} {pr.metric}
      {pr.previousBest != null ? ` (prev ${pr.previousBest})` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.gray50,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  title: { fontSize: typography.fontSize.md, fontWeight: '700', color: palette.gray900 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  statValue: { fontSize: typography.fontSize.lg, fontWeight: '700', color: palette.emeraldDark },
  section: { fontWeight: '700', color: palette.gray800, marginTop: spacing.xs },
  pr: { color: palette.gray700, fontSize: typography.fontSize.sm },
  hint: { color: palette.gray500, fontSize: typography.fontSize.sm },
  ai: { fontSize: typography.fontSize.xs, color: palette.emeraldDark, fontWeight: '600' },
});
