import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MuscleMapSvg } from '@/components/quilore/MuscleMapSvg';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
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
    setResult({
      flag: injury ? 'INJURY_RISK' : selected.length ? 'FATIGUE' : 'INCONCLUSIVE',
      message: injury
        ? `Risk flag for ${region}: markers lean toward injury risk vs ordinary fatigue.`
        : `Risk flag for ${region}: more consistent with training fatigue/soreness.`,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Muscle Map</Text>
      <Text style={styles.subtitle}>Interactive triage — risk flag only, never a diagnosis</Text>

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
          <Text style={styles.section}>Pain descriptors · {region}</Text>
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
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
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
  chipText: { fontWeight: '700', color: palette.gray800, textTransform: 'capitalize' },
  form: { gap: spacing.sm },
  section: { fontWeight: '700', color: palette.gray800 },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
  },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: palette.white, fontWeight: '700' },
  result: { backgroundColor: palette.gray50, padding: spacing.md, borderRadius: radii.lg, gap: spacing.xs },
  flag: { fontWeight: '800', color: palette.amber, fontSize: typography.fontSize.lg },
  body: { color: palette.gray800 },
  disclaimer: { color: palette.red, fontSize: typography.fontSize.xs },
});
