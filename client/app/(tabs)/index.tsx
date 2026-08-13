import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AnimatedExerciseDemo } from "@/components/quilore/AnimatedExerciseDemo";
import { PdfImportPanel } from "@/components/quilore/PdfImportPanel";
import { SessionSummaryCard } from "@/components/quilore/SessionSummaryCard";
import { VoiceCaptureIndicator } from "@/components/quilore/VoiceCaptureIndicator";
import { palette, radii, semantic, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { fetchSessionSummary } from "@/lib/api/workout";
import type { SessionSummaryResponse } from "@/lib/api/types";
import { appendPartial, getWhisperEngineName, startListening, stopListening } from "@/lib/voice/whisperStub";
import { parseVoiceSet } from "@/lib/voice/parseVoiceSet";
import { targetMuscleForExercise } from "@/lib/workout/exerciseTargets";
import { upsertLocal } from "@/lib/offline/store";
import { track } from "@/lib/analytics";
import { useMarkObserveInteractive } from "@/hooks/useMarkObserveInteractive";

type TemplateExercise = { id: string; name: string; sets: string; reps: string; weightKg?: string };

export default function WorkoutScreen() {
  useMarkObserveInteractive();
  const sessionStart = useRef(new Date().toISOString());
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [draftExercises, setDraftExercises] = useState<TemplateExercise[]>([
    { id: "1", name: "Back Squat", sets: "3", reps: "5", weightKg: "100" },
  ]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  function toggleVoice() {
    if (listening) {
      const final = stopListening();
      setListening(false);
      setPartial(final.text);
      const parsed = parseVoiceSet(final.text);
      if (!parsed) {
        setParseError("Could not parse sets — draft added for manual edit.");
        setDraftExercises((prev) => [
          ...prev,
          { id: String(Date.now()), name: final.text.slice(0, 32) || "Voice set", sets: "", reps: "" },
        ]);
      } else {
        setParseError(null);
        setDraftExercises((prev) => [
          ...prev,
          { id: String(Date.now()), name: parsed.name, sets: parsed.sets, reps: parsed.reps },
        ]);
      }
    } else {
      startListening();
      setListening(true);
      setParseError(null);
      setPartial(appendPartial("bench three by eight").text);
    }
  }

  function handleImportMapped(
    text: string,
    exercises: { name: string; sets: number; reps: number }[],
    notice?: string,
  ) {
    setOcrText(text);
    setOcrNotice(notice ?? null);
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
    setSummaryLoading(true);
    const completedAt = new Date().toISOString();
    const id = `w_${Date.now()}`;
    upsertLocal("workouts", id, { exercises: draftExercises, startedAt: sessionStart.current, completedAt });
    track("workout_completed", { workoutId: id, exerciseCount: draftExercises.length });
    try {
      const summary = await fetchSessionSummary({
        sessionId: id,
        startedAt: sessionStart.current,
        completedAt,
        exercises: draftExercises.map((ex) => ({
          name: ex.name,
          sets: Array.from({ length: Number(ex.sets) || 1 }, () => ({
            reps: Number(ex.reps) || 0,
            weightKg: Number(ex.weightKg) || 0,
          })),
        })),
      });
      setSessionSummary(summary);
    } finally {
      setSummaryLoading(false);
    }
  }

  const activeName = draftExercises[draftExercises.length - 1]?.name ?? draftExercises[0]?.name ?? "Squat";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.title}>Workout</Text>
        <Text style={styles.subtitle}>Voice · PDF import · {getWhisperEngineName()} engine</Text>
        <PdfImportPanel onImported={handleImportMapped} />
        {ocrText ? <Text style={styles.note}>OCR draft: {ocrText.slice(0, 80)}…</Text> : null}
        {ocrNotice ? <Text style={styles.note}>{ocrNotice}</Text> : null}
        <VoiceCaptureIndicator listening={listening} partial={partial} onToggle={toggleVoice} />
        <Pressable style={styles.primary} onPress={toggleVoice}>
          <Text style={styles.primaryText}>{listening ? "Stop voice" : "Start voice set"}</Text>
        </Pressable>
        {parseError ? <Text style={styles.error}>{parseError}</Text> : null}
        {draftExercises.map((ex) => (
          <View key={ex.id} style={styles.row}>
            <TextInput
              style={styles.input}
              value={ex.name}
              placeholderTextColor={semantic.inputPlaceholder}
              onChangeText={(t) => setDraftExercises((p) => p.map((e) => (e.id === ex.id ? { ...e, name: t } : e)))}
            />
            <TextInput
              style={styles.small}
              value={ex.sets}
              keyboardType="number-pad"
              placeholder="sets"
              placeholderTextColor={semantic.inputPlaceholder}
              onChangeText={(t) => setDraftExercises((p) => p.map((e) => (e.id === ex.id ? { ...e, sets: t } : e)))}
            />
            <Text style={styles.times}>×</Text>
            <TextInput
              style={styles.small}
              value={ex.reps}
              keyboardType="number-pad"
              placeholder="reps"
              placeholderTextColor={semantic.inputPlaceholder}
              onChangeText={(t) => setDraftExercises((p) => p.map((e) => (e.id === ex.id ? { ...e, reps: t } : e)))}
            />
          </View>
        ))}
        <AnimatedExerciseDemo exerciseName={activeName} targetMuscle={targetMuscleForExercise(activeName)} />
        <Pressable style={styles.primary} onPress={saveSession}>
          <Text style={styles.primaryText}>Complete session</Text>
        </Pressable>
        <SessionSummaryCard summary={sessionSummary} loading={summaryLoading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.surface },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: semantic.textPrimary },
  subtitle: { fontSize: typography.fontSize.sm, color: semantic.textMuted },
  note: { fontSize: typography.fontSize.sm, color: semantic.textSecondary },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: semantic.textOnPrimary, fontWeight: "700" },
  error: { color: semantic.textDanger, fontSize: typography.fontSize.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    color: semantic.inputText,
    backgroundColor: semantic.inputBg,
    minHeight: touchTarget.minHeight,
  },
  small: {
    width: 56,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    textAlign: "center",
    color: semantic.inputText,
    backgroundColor: semantic.inputBg,
    minHeight: touchTarget.minHeight,
  },
  times: { color: semantic.textSecondary },
});
