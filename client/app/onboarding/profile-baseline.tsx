import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, touchTarget, typography } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { upsertProfile } from '@/lib/api/profile';
import { ApiClientError } from '@/lib/api/client';
import { getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

const SEX_OPTIONS = ['female', 'male', 'other'] as const;
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;

export default function ProfileBaselineScreen() {
  const { user } = useAuth();
  const c = useThemeColors();
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<(typeof SEX_OPTIONS)[number]>('female');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [trainingExperience, setTrainingExperience] = useState<(typeof EXPERIENCE)[number]>('beginner');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [injuriesInfo, setInjuriesInfo] = useState('');
  const [equipmentAccess, setEquipmentAccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const draft = await getOnboardingDraft(user.id);
      if (draft.age) setAge(String(draft.age));
      if (draft.sex && (SEX_OPTIONS as readonly string[]).includes(draft.sex)) {
        setSex(draft.sex as (typeof SEX_OPTIONS)[number]);
      }
      if (draft.heightCm) setHeightCm(String(draft.heightCm));
      if (draft.weightKg) setWeightKg(String(draft.weightKg));
      if (draft.trainingExperience) setTrainingExperience(draft.trainingExperience as (typeof EXPERIENCE)[number]);
      if (draft.dietaryPreferences) setDietaryPreferences(draft.dietaryPreferences);
      if (draft.injuriesInfo) setInjuriesInfo(draft.injuriesInfo);
      if (draft.equipmentAccess) setEquipmentAccess(draft.equipmentAccess);
    })();
  }, [user]);

  const valid =
    Number(age) >= 13 &&
    Number(age) <= 100 &&
    Number(heightCm) > 0 &&
    Number(weightKg) > 0;

  async function next() {
    if (!valid || !user || busy) return;
    setBusy(true);
    setError(null);
    const payload = {
      age: Number(age),
      sex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      trainingExperience,
      dietaryPreferences,
      injuriesInfo,
      equipmentAccess,
    };
    await saveOnboardingDraft(user.id, payload);
    try {
      await upsertProfile(user.id, payload);
      router.push('/onboarding/goals');
    } catch (err) {
      // Offline / unavailable: keep draft and continue. Hard failures stay on this step.
      const offline =
        err instanceof ApiClientError && (err.endpointUnavailable || err.status === 0);
      if (offline) {
        setError('Saved on this device — will sync when you are back online.');
        router.push('/onboarding/goals');
      } else {
        setError(err instanceof Error ? err.message : 'Could not save baseline. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingStepLayout
      title="Your baseline"
      subtitle="Coaching estimates use these inputs — you can update them anytime in Profile."
      step={3}
      totalSteps={4}
      onBack={() => router.back()}
      onNext={next}
      nextDisabled={!valid || busy}
      nextLabel={busy ? 'Saving…' : 'Continue'}>
      <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Text style={[styles.label, { color: c.textPrimary }]}>Sex</Text>
      <View style={styles.wrap}>
        {SEX_OPTIONS.map((opt) => (
          <SelectionChip key={opt} label={opt} selected={sex === opt} onPress={() => setSex(opt)} />
        ))}
      </View>
      <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
      <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
      <Text style={[styles.label, { color: c.textPrimary }]}>Training experience</Text>
      <View style={styles.wrap}>
        {EXPERIENCE.map((opt) => (
          <SelectionChip
            key={opt}
            label={opt}
            selected={trainingExperience === opt}
            onPress={() => setTrainingExperience(opt)}
          />
        ))}
      </View>
      <Field
        label="Dietary preferences"
        value={dietaryPreferences}
        onChangeText={setDietaryPreferences}
        placeholder="e.g. vegetarian, high protein"
      />
      <Field
        label="Injuries / limitations (risk flag only)"
        value={injuriesInfo}
        onChangeText={setInjuriesInfo}
        placeholder="Optional — not a diagnosis"
        multiline
      />
      <Text style={[styles.disclaimer, { color: c.textWarning }]}>
        Injury notes are risk flags for coaching — not medical diagnoses.
      </Text>
      <Field
        label="Equipment access"
        value={equipmentAccess}
        onChangeText={setEquipmentAccess}
        placeholder="e.g. home dumbbells, full gym"
      />
      {error ? <Text style={[styles.error, { color: c.textDanger }]}>{error}</Text> : null}
    </OnboardingStepLayout>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'number-pad' | 'decimal-pad';
  placeholder?: string;
  multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: c.border,
            backgroundColor: c.inputBg,
            color: c.inputText,
          },
          multiline && styles.multiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={c.inputPlaceholder}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: '700' },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
  },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  disclaimer: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  error: { fontWeight: '600' },
});
