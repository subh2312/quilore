import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { spacing } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { fetchProfile, saveGoal, upsertProfile } from '@/lib/api/profile';
import { clearOnboardingDraft, getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { recalculateMacroTargets } from '@/lib/nutrition/macroTargets';
import { track } from '@/lib/analytics';
import { useAuth } from '@/context/AuthContext';

const GOALS = ['fat_loss', 'recomp', 'muscle_gain', 'maintain', 'performance'] as const;
const TONES = ['direct', 'supportive', 'detailed'] as const;
const SECONDARY = ['strength', 'mobility', 'endurance', 'nutrition_focus'] as const;

export default function OnboardingGoalsScreen() {
  const c = useThemeColors();
  const { user, markOnboardingComplete } = useAuth();
  const [primaryGoal, setPrimaryGoal] = useState<(typeof GOALS)[number]>('recomp');
  const [coachingTone, setCoachingTone] = useState<(typeof TONES)[number]>('supportive');
  const [secondaryPrefs, setSecondaryPrefs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const draft = await getOnboardingDraft(user.id);
      if (draft.primaryGoal && (GOALS as readonly string[]).includes(draft.primaryGoal)) {
        setPrimaryGoal(draft.primaryGoal as (typeof GOALS)[number]);
      }
      if (draft.coachingTone && (TONES as readonly string[]).includes(draft.coachingTone)) {
        setCoachingTone(draft.coachingTone as (typeof TONES)[number]);
      }
    })();
  }, [user]);

  function toggleSecondary(pref: string) {
    setSecondaryPrefs((prev) => (prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]));
  }

  async function finish() {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    await saveOnboardingDraft(user.id, { primaryGoal, coachingTone });
    try {
      const draft = await getOnboardingDraft(user.id);
      const profile = await fetchProfile(user.id);
      if (profile) {
        const injuriesBits = [
          draft.injuriesInfo,
          draft.currentPhysique?.length ? `Current physique: ${draft.currentPhysique.join(', ')}` : '',
          draft.goalPhysique?.length ? `Goal physique: ${draft.goalPhysique.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        await upsertProfile(user.id, {
          age: profile.age,
          sex: profile.sex,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          trainingExperience: profile.trainingExperience,
          dietaryPreferences: profile.dietaryPreferences,
          equipmentAccess: profile.equipmentAccess,
          injuriesInfo: injuriesBits || profile.injuriesInfo,
        });
      }
      await saveGoal(user.id, {
        primaryGoal,
        coachingTone,
        secondaryPrefs,
        schedulePrefs: {
          daysPerWeek: 4,
          currentPhysique: draft.currentPhysique ?? [],
          goalPhysique: draft.goalPhysique ?? [],
          healthConditions: draft.healthConditions ?? [],
          painRegions: draft.painRegions ?? [],
        },
      });
      if (profile?.weightKg && profile.heightCm && profile.age && profile.sex) {
        await recalculateMacroTargets(user.id, {
          primaryGoal,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age,
          sex: profile.sex,
          activityLevel: 'moderate',
        });
      }
      track('goal_set', { primaryGoal, coachingTone, source: 'onboarding' });
      track('onboarding_completed', { step: 'goals' });
      await markOnboardingComplete();
      await clearOnboardingDraft(user.id);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saved locally — sync when online.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingStepLayout
      title="Goals & coaching"
      subtitle="Targets are coaching estimates — reviewable, not medical prescriptions."
      step={7}
      totalSteps={7}
      onBack={() => router.back()}
      onNext={finish}
      nextDisabled={busy}
      nextLabel={busy ? 'Finishing…' : 'Enter Quilore'}>
      <Text style={[styles.label, { color: c.textPrimary }]}>Primary goal</Text>
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <SelectionChip
            key={g}
            label={g.replace('_', ' ')}
            selected={primaryGoal === g}
            onPress={() => setPrimaryGoal(g)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Coaching tone</Text>
      <View style={styles.wrap}>
        {TONES.map((t) => (
          <SelectionChip
            key={t}
            label={t}
            selected={coachingTone === t}
            onPress={() => setCoachingTone(t)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Secondary preferences (optional)</Text>
      <View style={styles.wrap}>
        {SECONDARY.map((s) => (
          <SelectionChip
            key={s}
            label={s.replace('_', ' ')}
            selected={secondaryPrefs.includes(s)}
            onPress={() => toggleSecondary(s)}
          />
        ))}
      </View>

      {error ? <Text style={[styles.error, { color: c.textDanger }]}>{error}</Text> : null}
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700', marginTop: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { fontWeight: '600' },
});
