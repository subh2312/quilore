import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { OnboardingStepLayout } from '@/components/quilore/OnboardingStepLayout';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { getOnboardingDraft, saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

const PHYSIQUE_TAGS = [
  'lean',
  'soft',
  'athletic',
  'bulky',
  'skinny-fat',
  'recomping',
] as const;

export default function PhysiqueCurrentScreen() {
  const { user } = useAuth();
  const c = useThemeColors();
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const draft = await getOnboardingDraft(user.id);
      if (draft.currentPhysique?.length) setTags(draft.currentPhysique);
      if (draft.physiquePhotoUris?.length) setPhotos(draft.physiquePhotoUris);
    })();
  }, [user]);

  function toggle(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function addPhoto() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const uris = (result.assets ?? []).map((a) => a.uri).filter(Boolean);
      setPhotos((prev) => [...prev, ...uris].slice(0, 4));
      setNote(`${uris.length} photo(s) attached — stay on-device until you choose to sync.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not attach photo');
    }
  }

  async function next() {
    if (!user) return;
    await saveOnboardingDraft(user.id, {
      currentPhysique: tags,
      physiquePhotoUris: photos,
    });
    router.push('/onboarding/physique-goal');
  }

  return (
    <OnboardingStepLayout
      title="Your current physique"
      subtitle="Optional photos and tags help personalize routines and meal targets. Photos stay editable and private."
      step={4}
      totalSteps={7}
      onBack={() => router.back()}
      onNext={next}
      nextLabel="Continue">
      <Text style={[styles.label, { color: c.textPrimary }]}>How would you describe yourself now?</Text>
      <View style={styles.wrap}>
        {PHYSIQUE_TAGS.map((tag) => (
          <SelectionChip
            key={tag}
            label={tag.replace('-', ' ')}
            selected={tags.includes(tag)}
            onPress={() => toggle(tag)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Body photos (optional)</Text>
      <Text style={[styles.hint, { color: c.textMuted }]}>
        Front / side / back help coaching estimates — never used as a medical assessment.
      </Text>
      <Pressable
        style={[styles.secondary, { borderColor: c.primary }]}
        onPress={addPhoto}
        accessibilityRole="button">
        <Text style={[styles.secondaryText, { color: c.textSuccess }]}>
          {photos.length ? `Add more photos (${photos.length}/4)` : 'Add physique photos'}
        </Text>
      </Pressable>
      {note ? <Text style={[styles.hint, { color: c.textSecondary }]}>{note}</Text> : null}
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700' },
  hint: { fontSize: typography.fontSize.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '700' },
});
