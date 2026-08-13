import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@/constants/DesignTokens";
import { useThemeColors } from "@/hooks/useTheme";
import type { SessionSummaryResponse } from "@/lib/api/types";

type Props = { summary: SessionSummaryResponse | null; loading?: boolean };

export function SessionSummaryCard({ summary, loading }: Props) {
  const c = useThemeColors();
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: c.surfaceMuted }]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Session summary</Text>
        <Text style={[styles.muted, { color: c.textMuted }]}>Calculating volume and PR hints…</Text>
      </View>
    );
  }
  if (!summary) return null;
  return (
    <View style={[styles.card, { backgroundColor: c.surfaceMuted }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Session summary</Text>
      {summary.aiObservation ? (
        <Text style={[styles.ai, { color: c.textSuccess }]}>AI observation — edit before sharing</Text>
      ) : null}
      <Text style={[styles.row, { color: c.textSecondary }]}>
        {summary.durationMinutes} min · {summary.exerciseCount} exercises
      </Text>
      <Text style={[styles.row, { color: c.textSecondary }]}>
        Volume ~{Math.round(summary.totalVolumeKg)} kg
      </Text>
      {summary.personalRecords.length > 0 ? (
        <Text style={[styles.pr, { color: c.textSuccess }]}>
          PR flags: {summary.personalRecords.map((p) => p.exerciseName).join(", ")}
        </Text>
      ) : (
        <Text style={[styles.muted, { color: c.textMuted }]}>No PR flags this session.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  title: { fontWeight: "700", fontSize: typography.fontSize.md },
  ai: { fontSize: typography.fontSize.xs, fontWeight: "700" },
  row: { fontSize: typography.fontSize.sm },
  pr: { fontSize: typography.fontSize.sm, fontWeight: "600" },
  muted: { fontSize: typography.fontSize.sm },
});
