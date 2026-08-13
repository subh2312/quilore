import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { spacing, typography } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

const GOAL_PHYSIQUE = [
  'leaner',
  'more muscle',
  'athletic',
  'stronger',
  'toned',
  'maintain look',
] as const;

export default function PhysiqueGoalScreen() {
  const { user } = useAuth();
  const c = useThemeColors();
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const draft = await getOnboardingDraft(user.id);
      if (draft.goalPhysique?.length) setTags(draft.goalPhysique);
    })();
  }, [user]);

  function toggle(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function next() {
    if (!user) return;
    await saveOnboardingDraft(user.id, { goalPhysique: tags });
    router.push('/onboarding/health-context');
  }

  return (
    <OnboardingStepLayout
      title="Physique you want"
      subtitle="We’ll bias workout split and meal targets toward this look — always editable later."
      step={5}
      totalSteps={7}
      onBack={() => router.back()}
      onNext={next}
      nextDisabled={tags.length === 0}
      nextLabel={tags.length ? 'Continue' : 'Pick at least one'}>
      <Text style={[styles.label, { color: c.textPrimary }]}>Target look</Text>
      <View style={styles.wrap}>
        {GOAL_PHYSIQUE.map((tag) => (
          <SelectionChip
            key={tag}
            label={tag}
            selected={tags.includes(tag)}
            onPress={() => toggle(tag)}
          />
        ))}
      </View>
      <Text style={[styles.hint, { color: c.textMuted }]}>
        Example: “leaner + more muscle” steers a recomp-style plan; “more muscle” favors surplus volume.
      </Text>
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700' },
  hint: { fontSize: typography.fontSize.sm, lineHeight: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
