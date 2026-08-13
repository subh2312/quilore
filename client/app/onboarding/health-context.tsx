import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

const CONDITIONS = [
  'none',
  'hypertension',
  'diabetes',
  'thyroid',
  'asthma',
  'joint issues',
  'other',
] as const;

const PAIN_REGIONS = [
  'none',
  'shoulders',
  'elbows',
  'wrists',
  'lower back',
  'knees',
  'hips',
  'ankles',
] as const;

export default function HealthContextScreen() {
  const { user } = useAuth();
  const c = useThemeColors();
  const [conditions, setConditions] = useState<string[]>(['none']);
  const [painRegions, setPainRegions] = useState<string[]>(['none']);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const draft = await getOnboardingDraft(user.id);
      if (draft.healthConditions?.length) setConditions(draft.healthConditions);
      if (draft.painRegions?.length) setPainRegions(draft.painRegions);
      if (draft.injuriesInfo) setNotes(draft.injuriesInfo);
    })();
  }, [user]);

  function toggleExclusiveNone(list: string[], value: string, set: (v: string[]) => void) {
    if (value === 'none') {
      set(['none']);
      return;
    }
    const next = list.includes(value)
      ? list.filter((x) => x !== value)
      : [...list.filter((x) => x !== 'none'), value];
    set(next.length ? next : ['none']);
  }

  async function next() {
    if (!user) return;
    const injuriesInfo = [
      notes.trim(),
      conditions.filter((c) => c !== 'none').length
        ? `Conditions: ${conditions.filter((c) => c !== 'none').join(', ')}`
        : '',
      painRegions.filter((p) => p !== 'none').length
        ? `Pain/limitations: ${painRegions.filter((p) => p !== 'none').join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join(' · ');

    await saveOnboardingDraft(user.id, {
      healthConditions: conditions,
      painRegions,
      injuriesInfo: injuriesInfo || undefined,
    });
    router.push('/onboarding/goals');
  }

  return (
    <OnboardingStepLayout
      title="Health context"
      subtitle="Risk flags only — not a diagnosis. Plans avoid aggravating reported pain and respect conditions."
      step={6}
      totalSteps={7}
      onBack={() => router.back()}
      onNext={next}
      nextLabel="Continue">
      <Text style={[styles.label, { color: c.textPrimary }]}>Pre-existing conditions</Text>
      <View style={styles.wrap}>
        {CONDITIONS.map((item) => (
          <SelectionChip
            key={item}
            label={item}
            selected={conditions.includes(item)}
            onPress={() => toggleExclusiveNone(conditions, item, setConditions)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Current pain / limitations</Text>
      <View style={styles.wrap}>
        {PAIN_REGIONS.map((item) => (
          <SelectionChip
            key={item}
            label={item}
            selected={painRegions.includes(item)}
            onPress={() => toggleExclusiveNone(painRegions, item, setPainRegions)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Notes (optional)</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText },
        ]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. left knee flares on deep squats"
        placeholderTextColor={c.inputPlaceholder}
        multiline
      />
      <Text style={[styles.disclaimer, { color: c.textWarning }]}>
        Interactive triage later will compare new pain with recent workouts — arm pain after a leg day
        is not treated as training soreness.
      </Text>
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: typography.fontSize.md,
    textAlignVertical: 'top',
  },
  disclaimer: { fontSize: typography.fontSize.sm, fontWeight: '600', lineHeight: 20 },
});
