import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedExerciseDemo } from '@/components/quilore/AnimatedExerciseDemo';
import { VoiceCaptureIndicator } from '@/components/quilore/VoiceCaptureIndicator';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { appendPartial, startListening, stopListening } from '@/lib/voice/whisperStub';
import { upsertLocal } from '@/lib/offline/store';
import { track } from '@/lib/analytics';

type TemplateExercise = { id: string; name: string; sets: string; reps: string };

export default function WorkoutScreen() {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [draftExercises, setDraftExercises] = useState<TemplateExercise[]>([
    { id: '1', name: 'Back Squat', sets: '3', reps: '5' },
  ]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [pdfName, setPdfName] = useState<string | null>(null);

  function toggleVoice() {
    if (listening) {
      const final = stopListening();
      setListening(false);
      setPartial(final.text);
      if (!final.text.toLowerCase().includes('set')) {
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
      const p = appendPartial('bench three by eight');
      setPartial(p.text);
    }
  }

  function saveSession() {
    const id = `w_${Date.now()}`;
    upsertLocal('workouts', id, { exercises: draftExercises, completedAt: new Date().toISOString() });
    track('workout_completed', { workoutId: id, exerciseCount: draftExercises.length });
    setSessionSummary(
      `Session saved · ${draftExercises.length} exercises · offline queue pending sync`,
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Workout</Text>
      <Text style={styles.subtitle}>Voice logging, templates, import, and session summary</Text>

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
              onChangeText={(sets) =>
                setDraftExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, sets } : e)))
              }
            />
            <Text style={styles.x}>×</Text>
            <TextInput
              style={[styles.input, styles.small]}
              value={ex.reps}
              onChangeText={(reps) =>
                setDraftExercises((prev) => prev.map((e) => (e.id === ex.id ? { ...e, reps } : e)))
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
      <Text style={styles.hint}>Edit OCR/PDF imports before save — AI drafts are never final.</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Paste OCR text or imported plan…"
        value={ocrText}
        onChangeText={setOcrText}
      />
      <Pressable
        style={styles.secondary}
        onPress={() => {
          setPdfName('program.pdf');
          setOcrText((t) => t || 'Squat 3x5\nRDL 3x8');
        }}>
        <Text style={styles.secondaryText}>{pdfName ? `PDF: ${pdfName}` : 'Import PDF / OCR draft'}</Text>
      </Pressable>

      <AnimatedExerciseDemo exerciseName="Back Squat" targetMuscle="Quads · Glutes" />

      <Pressable style={styles.primary} onPress={saveSession}>
        <Text style={styles.primaryText}>Finish session</Text>
      </Pressable>
      {sessionSummary ? <Text style={styles.summary}>{sessionSummary}</Text> : null}
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
  summary: { color: palette.gray700, fontSize: typography.fontSize.sm },
});
