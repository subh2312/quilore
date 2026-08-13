import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MuscleMapSvg, regionLabel } from '@/components/quilore/MuscleMapSvg';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { track } from '@/lib/analytics';

const DESCRIPTORS = ['sore', 'tight', 'sharp', 'swelling', 'aching', 'sudden'];

export default function MuscleMapScreen() {
  const c = useThemeColors();
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
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: c.textPrimary }]}>Body</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        Interactive muscle map — risk flag only, never a diagnosis
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
        <View style={[styles.result, { backgroundColor: c.surfaceMuted }]}>
          <Text style={[styles.flag, { color: c.textWarning }]}>{result.flag}</Text>
          <Text style={[styles.body, { color: c.textPrimary }]}>{result.message}</Text>
          <Text style={[styles.disclaimer, { color: c.textDanger }]}>
            Risk flag only — not a medical diagnosis. Seek a clinician for persistent or severe pain.
          </Text>
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
  result: { padding: spacing.md, borderRadius: radii.lg, gap: spacing.xs },
  flag: { fontWeight: '800', fontSize: typography.fontSize.lg },
  body: {},
  disclaimer: { fontSize: typography.fontSize.xs },
});
