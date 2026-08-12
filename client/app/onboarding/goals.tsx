import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { palette, radii, spacing, touchTarget } from '@/constants/DesignTokens';
import { saveGoal } from '@/lib/api/profile';
import { clearOnboardingDraft, getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { track } from '@/lib/analytics';
import { useAuth } from '@/context/AuthContext';

const GOALS = ['fat_loss', 'recomp', 'muscle_gain', 'maintain', 'performance'] as const;
const TONES = ['direct', 'supportive', 'detailed'] as const;
const SECONDARY = ['strength', 'mobility', 'endurance', 'nutrition_focus'] as const;

export default function OnboardingGoalsScreen() {
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
      await saveGoal(user.id, {
        primaryGoal,
        coachingTone,
        secondaryPrefs,
        schedulePrefs: { daysPerWeek: 4 },
      });
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
      step={4}
      totalSteps={4}
      onBack={() => router.back()}
      onNext={finish}
      nextDisabled={busy}
      nextLabel={busy ? 'Finishing…' : 'Enter Quilore'}>
      <Text style={styles.label}>Primary goal</Text>
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <Pressable
            key={g}
            style={[styles.chip, primaryGoal === g && styles.chipOn]}
            onPress={() => setPrimaryGoal(g)}>
            <Text style={styles.chipText}>{g.replace('_', ' ')}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Coaching tone</Text>
      <View style={styles.wrap}>
        {TONES.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, coachingTone === t && styles.chipOn]}
            onPress={() => setCoachingTone(t)}>
            <Text style={styles.chipText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Secondary preferences (optional)</Text>
      <View style={styles.wrap}>
        {SECONDARY.map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, secondaryPrefs.includes(s) && styles.chipOn]}
            onPress={() => toggleSecondary(s)}>
            <Text style={styles.chipText}>{s.replace('_', ' ')}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700', color: palette.gray800, marginTop: spacing.xs },
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
  error: { color: palette.red, fontWeight: '600' },
});
