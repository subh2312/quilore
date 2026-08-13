import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MuscleMapSvg, regionLabel } from '@/components/quilore/MuscleMapSvg';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { track } from '@/lib/analytics';
import { recentTrainingContext, triageInterpretation } from '@/lib/workout/triageContext';
import { upsertLocal } from '@/lib/offline/store';

const DESCRIPTORS = ['sore', 'tight', 'sharp', 'swelling', 'aching', 'sudden'];

export default function MuscleMapScreen() {
  const c = useThemeColors();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [region, setRegion] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{
    flag: string;
    message: string;
    suggestModifyWorkout: boolean;
  } | null>(null);
  const [modifyNote, setModifyNote] = useState<string | null>(null);

  function evaluate() {
    if (!region) return;
    track('injury_triage_viewed', { region });
    const recent = recentTrainingContext(region);
    const interpretation = triageInterpretation({
      regionId: region,
      descriptors: selected,
      recent,
    });
    setResult(interpretation);
    setModifyNote(null);
  }

  function requestWorkoutModify() {
    if (!region) return;
    upsertLocal(
      'plans',
      'triage_modify',
      {
        avoidRegions: [region],
        reason: result?.flag ?? 'triage',
        notes,
        at: new Date().toISOString(),
      },
      false,
    );
    setModifyNote(
      `Saved a deload preference for ${regionLabel(region)}. Open Workout → Generate my routine to rebuild today’s draft without loading that area.`,
    );
    track('injury_triage_viewed', { region, action: 'modify_workout' });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: c.textPrimary }]}>Body</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        Interactive triage — risk flag only, never a diagnosis. Uses your recent workout log.
      </Text>

      <View style={styles.row}>
        {(['front', 'back'] as const).map((s) => (
          <SelectionChip key={s} label={s} selected={side === s} onPress={() => setSide(s)} />
        ))}
      </View>

      <MuscleMapSvg side={side} selected={region} onSelect={setRegion} />

      {region ? (
        <View style={styles.form}>
          <Text style={[styles.section, { color: c.textPrimary }]}>
            Pain descriptors · {regionLabel(region)}
          </Text>
          <View style={styles.wrapChips}>
            {DESCRIPTORS.map((d) => {
              const on = selected.includes(d);
              return (
                <SelectionChip
                  key={d}
                  label={d}
                  selected={on}
                  onPress={() =>
                    setSelected((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))
                  }
                />
              );
            })}
          </View>
          <TextInput
            style={[
              styles.input,
              { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText },
            ]}
            placeholder="Optional notes (not a diagnosis)"
            placeholderTextColor={c.inputPlaceholder}
            value={notes}
            onChangeText={setNotes}
          />
          <Pressable style={[styles.primary, { backgroundColor: c.primary }]} onPress={evaluate}>
            <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>Get risk flag</Text>
          </Pressable>
        </View>
      ) : null}

      {result ? (
        <View style={[styles.result, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
          <Text style={[styles.flag, { color: c.textWarning }]}>{result.flag}</Text>
          <Text style={[styles.body, { color: c.textPrimary }]}>{result.message}</Text>
          <Text style={[styles.disclaimer, { color: c.textDanger }]}>
            Risk flag only — not a medical diagnosis. Seek a clinician for persistent or severe pain.
          </Text>
          {result.suggestModifyWorkout ? (
            <Pressable
              style={[styles.secondary, { borderColor: c.primary }]}
              onPress={requestWorkoutModify}
              accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: c.textSuccess }]}>
                Modify today’s workout around this?
              </Text>
            </Pressable>
          ) : null}
          {modifyNote ? <Text style={[styles.body, { color: c.textSecondary }]}>{modifyNote}</Text> : null}
          <Pressable
            style={[styles.secondary, { borderColor: c.border }]}
            onPress={() => router.push('/(tabs)/')}
            accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: c.textPrimary }]}>Open Workout</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, flexGrow: 1 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  subtitle: { fontSize: typography.fontSize.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  form: { gap: spacing.sm },
  section: { fontWeight: '700' },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  primary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontWeight: '700' },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryText: { fontWeight: '700', textAlign: 'center' },
  result: { padding: spacing.md, borderRadius: radii.lg, gap: spacing.sm, borderWidth: 1 },
  flag: { fontWeight: '800', fontSize: typography.fontSize.lg },
  body: { lineHeight: 20 },
  disclaimer: { fontSize: typography.fontSize.xs },
});
