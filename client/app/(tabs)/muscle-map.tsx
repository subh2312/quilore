import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MuscleMapSvg, regionLabel } from '@/components/quilore/MuscleMapSvg';
import { palette, radii, semantic, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { track } from '@/lib/analytics';

const DESCRIPTORS = ['sore', 'tight', 'sharp', 'swelling', 'aching', 'sudden'];

export default function MuscleMapScreen() {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [region, setRegion] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{ flag: string; message: string } | null>(null);

  function evaluate() {
    if (!region) return;
    track('injury_triage_viewed', { region });
    const injury = selected.some((d) => ['sharp', 'swelling', 'sudden'].includes(d));
    const label = regionLabel(region);
    setResult({
      flag: injury ? 'INJURY_RISK' : selected.length ? 'FATIGUE' : 'INCONCLUSIVE',
      message: injury
        ? `Risk flag for ${label}: markers lean toward injury risk vs ordinary fatigue.`
        : `Risk flag for ${label}: more consistent with training fatigue/soreness.`,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Body</Text>
      <Text style={styles.subtitle}>Interactive muscle map — risk flag only, never a diagnosis</Text>

      <View style={styles.row}>
        {(['front', 'back'] as const).map((s) => (
          <Pressable key={s} style={[styles.chip, side === s && styles.chipOn]} onPress={() => setSide(s)}>
            <Text style={styles.chipText}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <MuscleMapSvg side={side} selected={region} onSelect={setRegion} />

      {region ? (
        <View style={styles.form}>
          <Text style={styles.section}>Pain descriptors · {regionLabel(region)}</Text>
          <View style={styles.wrapChips}>
            {DESCRIPTORS.map((d) => {
              const on = selected.includes(d);
              return (
                <Pressable
                  key={d}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() =>
                    setSelected((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))
                  }>
                  <Text style={styles.chipText}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Optional notes (not a diagnosis)"
            placeholderTextColor={semantic.inputPlaceholder}
            value={notes}
            onChangeText={setNotes}
          />
          <Pressable style={styles.primary} onPress={evaluate}>
            <Text style={styles.primaryText}>Get risk flag</Text>
          </Pressable>
        </View>
      ) : null}

      {result ? (
        <View style={styles.result}>
          <Text style={styles.flag}>{result.flag}</Text>
          <Text style={styles.body}>{result.message}</Text>
          <Text style={styles.disclaimer}>
            Risk flag only — not a medical diagnosis. Seek a clinician for persistent or severe pain.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, backgroundColor: semantic.surface },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: semantic.textPrimary },
  subtitle: { fontSize: typography.fontSize.sm, color: semantic.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: palette.gray200,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: palette.amberLight },
  chipText: { fontWeight: '700', color: semantic.textPrimary, textTransform: 'capitalize' },
  form: { gap: spacing.sm },
  section: { fontWeight: '700', color: semantic.textPrimary },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: semantic.inputBg,
    color: semantic.inputText,
  },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: semantic.textOnPrimary, fontWeight: '700' },
  result: { backgroundColor: semantic.surfaceMuted, padding: spacing.md, borderRadius: radii.lg, gap: spacing.xs },
  flag: { fontWeight: '800', color: palette.amber, fontSize: typography.fontSize.lg },
  body: { color: semantic.textPrimary },
  disclaimer: { color: semantic.textDanger, fontSize: typography.fontSize.xs },
});
