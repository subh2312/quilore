import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { palette, radii, spacing, touchTarget, typography } from '@/constants/DesignTokens';
import { upsertProfile } from '@/lib/api/profile';
import { getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

const SEX_OPTIONS = ['female', 'male', 'other'] as const;
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;

export default function ProfileBaselineScreen() {
  const { user } = useAuth();
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
    if (!valid || !user) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saved locally — sync when online.');
    } finally {
      setBusy(false);
      router.push('/onboarding/goals');
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
      <Text style={styles.label}>Sex</Text>
      <ChipRow options={SEX_OPTIONS} value={sex} onChange={setSex} />
      <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
      <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
      <Text style={styles.label}>Training experience</Text>
      <ChipRow options={EXPERIENCE} value={trainingExperience} onChange={setTrainingExperience} />
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
      <Text style={styles.disclaimer}>Injury notes are risk flags for coaching — not medical diagnoses.</Text>
      <Field
        label="Equipment access"
        value={equipmentAccess}
        onChangeText={setEquipmentAccess}
        placeholder="e.g. home dumbbells, full gym"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={palette.gray400}
        multiline={multiline}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[styles.chip, value === opt && styles.chipOn]}
          onPress={() => onChange(opt)}>
          <Text style={styles.chipText}>{opt.replace('_', ' ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: '700', color: palette.gray800 },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: palette.gray300,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.gray50,
    fontSize: typography.fontSize.md,
    color: palette.gray900,
  },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: palette.gray200,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: palette.emeraldLight },
  chipText: { fontWeight: '700', color: palette.gray800, textTransform: 'capitalize' },
  disclaimer: { color: palette.amber, fontSize: typography.fontSize.sm, fontWeight: '600' },
  error: { color: palette.red, fontWeight: '600' },
});
