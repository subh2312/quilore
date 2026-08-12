import { StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing, typography } from "@/constants/DesignTokens";
import type { SessionSummaryResponse } from "@/lib/api/types";

type Props = { summary: SessionSummaryResponse | null; loading?: boolean };

export function SessionSummaryCard({ summary, loading }: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Session summary</Text>
        <Text style={styles.muted}>Calculating volume and PR hints…</Text>
      </View>
    );
  }
  if (!summary) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Session summary</Text>
      {summary.aiObservation ? <Text style={styles.ai}>AI observation — edit before sharing</Text> : null}
      <Text style={styles.row}>{summary.durationMinutes} min · {summary.exerciseCount} exercises</Text>
      <Text style={styles.row}>Volume ~{Math.round(summary.totalVolumeKg)} kg</Text>
      {summary.personalRecords.length > 0 ? (
        <Text style={styles.pr}>PR flags: {summary.personalRecords.map((p) => p.exerciseName).join(", ")}</Text>
      ) : (
        <Text style={styles.muted}>No PR flags this session.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: palette.gray100,
    gap: spacing.xs,
  },
  title: { fontWeight: "700", fontSize: typography.fontSize.md, color: palette.gray900 },
  ai: { fontSize: typography.fontSize.xs, color: palette.emeraldDark, fontWeight: "700" },
  row: { color: palette.gray800, fontSize: typography.fontSize.sm },
  pr: { color: palette.emeraldDark, fontSize: typography.fontSize.sm, fontWeight: "600" },
  muted: { color: palette.gray500, fontSize: typography.fontSize.sm },
});
