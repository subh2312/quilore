import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedExerciseDemo } from '@/components/quilore/AnimatedExerciseDemo';
import { PdfImportPanel } from '@/components/quilore/PdfImportPanel';
import { SessionSummaryCard } from '@/components/quilore/SessionSummaryCard';
import { VoiceCaptureIndicator } from '@/components/quilore/VoiceCaptureIndicator';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { fetchSessionSummary } from '@/lib/api/workout';
import type { SessionSummaryResponse } from '@/lib/api/types';
import { appendPartial, getWhisperEngineName, startListening, stopListening } from '@/lib/voice/whisperStub';
import { upsertLocal } from '@/lib/offline/store';
import { track } from '@/lib/analytics';

type TemplateExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weightKg?: string;
};

export default function WorkoutScreen() {
  const sessionStart = useRef(new Date().toISOString());
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [draftExercises, setDraftExercises] = useState<TemplateExercise[]>([
    { id: '1', name: 'Back Squat', sets: '3', reps: '5', weightKg: '100' },
  ]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryResponse | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleVoice() {
    if (listening) {
      const final = stopListening();
      setListening(false);
      setPartial(final.text);
      if (!final.text.toLowerCase().includes('set') && !/\d+\s*[x×]\s*\d+/.test(final.text)) {
        setParseError('Could not parse sets — edit manually or retry.');
      } else {
        setParseError(null);
        setDraftExercises((prev) => [
          ...prev,
          { id: String(Date.now()), name: final.text.slice(0, 24) || 'Voice set', sets: '1', reps: '8' },
        ]);
      }
    } else {
      startListening();
      setListening(true);
      setPartial(appendPartial('bench three by eight').text);
    }
  }

  function handleImportMapped(text: string, exercises: { name: string; sets: number; reps: number }[]) {
    setOcrText(text);
    if (exercises.length > 0) {
      setDraftExercises(
        exercises.map((ex, i) => ({
          id: `import_${Date.now()}_${i}`,
          name: ex.name,
          sets: String(ex.sets),
          reps: String(ex.reps),
        })),
      );
    }
  }

  async function saveSession() {
    setSaving(true);
    const completedAt = new Date().toISOString();
    const id = `w_${Date.now()}`;
    upsertLocal('workouts', id, { exercises: draftExercises, startedAt: sessionStart.current, completedAt });
    track('workout_completed', { workoutId: id, exerciseCount: draftExercises.length });
    try {
      setSessionSummary(
        await fetchSessionSummary({
          sessionId: id,
          startedAt: sessionStart.current,
          completedAt,
          exercises: draftExercises.map((ex) => ({
            name: ex.name,
            sets: Array.from({ length: Number(ex.sets) || 1 }, () => ({
              reps: Number(ex.reps) || 0,
              weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
            })),
          })),
        }),
      );
      sessionStart.current = new Date().toISOString();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Workout</Text>
      <Text style={styles.subtitle}>
        Voice ({getWhisperEngineName()}), templates, import, and session summary
      </Text>
      <VoiceCaptureIndicator listening={listening} partial={partial} onToggle={toggleVoice} />
      {parseError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{parseError}</Text>
          <Text style={styles.hint}>Recovery: edit the template below (NL parse fallback).</Text>
        </View>
      ) : null}
      <Text style={styles.section}>Template builder</Text>
      {draftExercises.map((ex) => (
        <View key={ex.id} style={styles.card}>
          <TextInput
            style={styles.input}
            value={ex.name}
            onChangeText={(name) =>
              setDraftExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, name } : e)))
            }
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.small]}
              value={ex.sets}
              keyboardType="number-pad"
              onChangeText={(sets) =>
                setDraftExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, sets } : e)))
              }
            />
            <Text style={styles.x}>×</Text>
            <TextInput
              style={[styles.input, styles.small]}
              value={ex.reps}
              keyboardType="number-pad"
              onChangeText={(reps) =>
                setDraftExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, reps } : e)))
              }
            />
            <TextInput
              style={[styles.input, styles.medium]}
              value={ex.weightKg ?? ''}
              placeholder="kg"
              keyboardType="decimal-pad"
              onChangeText={(weightKg) =>
                setDraftExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, weightKg } : e)))
              }
            />
          </View>
        </View>
      ))}
      <Pressable
        style={styles.secondary}
        onPress={() =>
          setDraftExercises((prev) => [
            ...prev,
            { id: String(Date.now()), name: 'New exercise', sets: '3', reps: '10' },
          ])
        }>
        <Text style={styles.secondaryText}>Add exercise</Text>
      </Pressable>
      <Text style={styles.section}>Imported plan editor</Text>
      <PdfImportPanel onMapped={handleImportMapped} />
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Paste OCR text or imported plan…"
        value={ocrText}
        onChangeText={setOcrText}
      />
      <AnimatedExerciseDemo exerciseName="Back Squat" targetMuscle="Quads · Glutes" />
      <Pressable style={styles.primary} onPress={saveSession} disabled={saving}>
        <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Finish session'}</Text>
      </Pressable>
      {sessionSummary ? <SessionSummaryCard summary={sessionSummary} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  section: { fontSize: typography.fontSize.md, fontWeight: '700', color: palette.gray800, marginTop: spacing.sm },
  hint: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  card: { gap: spacing.xs, padding: spacing.sm, backgroundColor: palette.gray50, borderRadius: radii.md },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  small: { width: 64 },
  medium: { width: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  x: { fontWeight: '700', color: palette.gray600 },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: palette.white, fontWeight: '700' },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: palette.emeraldDark, fontWeight: '700' },
  errorBox: { backgroundColor: '#FEE2E2', padding: spacing.sm, borderRadius: radii.md, gap: 4 },
  errorText: { color: palette.red, fontWeight: '600' },
});
