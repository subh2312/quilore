import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { requestProgramGeneration } from "@/lib/api/coach";
import { fetchCurrentGoal, fetchProfile } from "@/lib/api/profile";
import type { SessionSummaryResponse } from "@/lib/api/types";
import { appendPartial, getWhisperEngineName, startListening, stopListening } from "@/lib/voice/whisperStub";
import { parseVoiceSet } from "@/lib/voice/parseVoiceSet";
import { targetMuscleForExercise } from "@/lib/workout/exerciseTargets";
import { exercisesToDraftRows } from "@/lib/workout/generateFromPreferences";
import { upsertLocal } from "@/lib/offline/store";
import { track } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import { useMarkObserveInteractive } from "@/hooks/useMarkObserveInteractive";

type TemplateExercise = { id: string; name: string; sets: string; reps: string; weightKg?: string };

export default function WorkoutScreen() {
  useMarkObserveInteractive();
  const { user } = useAuth();
  const sessionStart = useRef(new Date().toISOString());
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [draftExercises, setDraftExercises] = useState<TemplateExercise[]>([]);
  const [routineTitle, setRoutineTitle] = useState<string | null>(null);
  const [routineNote, setRoutineNote] = useState<string | null>(null);
  const [prefsSummary, setPrefsSummary] = useState("Loading preferences…");
  const [generating, setGenerating] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setPrefsSummary("Sign in so routines can use your goals and equipment.");
      return;
    }
    void (async () => {
      try {
        const [profile, goal] = await Promise.all([fetchProfile(user.id), fetchCurrentGoal(user.id)]);
        const primary = goal.primaryGoal?.replace(/_/g, " ") ?? "goal not set";
        const exp = profile?.trainingExperience ?? "experience n/a";
        const equip = profile?.equipmentAccess?.trim() || "equipment not set";
        const days = Number(goal.schedulePrefs?.daysPerWeek ?? 4);
        setPrefsSummary(`${primary} · ${exp} · ${equip} · ${days} days/week`);
      } catch {
        setPrefsSummary("Could not load preferences — generation still uses local defaults.");
      }
    })();
  }, [user]);

  async function generateFromPreferences() {
    if (!user || generating) return;
    setGenerating(true);
    setRoutineNote(null);
    try {
      const [profile, goal] = await Promise.all([fetchProfile(user.id), fetchCurrentGoal(user.id)]);
      const primaryGoal = goal.primaryGoal ?? "recomp";
      const daysPerWeek = Number(goal.schedulePrefs?.daysPerWeek ?? 4);
      const prompt = [
        `Generate a ${daysPerWeek}-day training routine`,
        `goal=${primaryGoal}`,
        `experience=${profile?.trainingExperience ?? "beginner"}`,
        `equipment=${profile?.equipmentAccess ?? "gym"}`,
        profile?.injuriesInfo ? `injuries_risk_flag=${profile.injuriesInfo}` : null,
      ]
        .filter(Boolean)
        .join("; ");

      const res = await requestProgramGeneration({
        prompt,
        goalType: primaryGoal,
        preferences: {
          primaryGoal,
          trainingExperience: profile?.trainingExperience ?? "beginner",
          equipmentAccess: profile?.equipmentAccess,
          daysPerWeek,
          secondaryPrefs: goal.secondaryPrefs,
          injuriesInfo: profile?.injuriesInfo,
        },
      });

      const session =
        res.sessions?.[0] ??
        ({
          dayLabel: "Day 1",
          focus: "Generated",
          exercises: res.exercises ?? [],
        } as const);

      const rows =
        session.exercises?.length > 0
          ? session.exercises.map((ex, i) => ({
              id: `gen_${Date.now()}_${i}`,
              name: ex.name,
              sets: String(ex.sets),
              reps: String(ex.reps),
            }))
          : exercisesToDraftRows({
              dayLabel: "Day 1",
              focus: "Generated",
              exercises: [],
            });

      setDraftExercises(rows);
      setRoutineTitle(res.title ?? "Preference routine");
      setRoutineNote(res.message);
      track("workout_started", { workoutId: res.jobId, exerciseCount: rows.length });
    } catch (err) {
      setRoutineNote(err instanceof Error ? err.message : "Could not generate routine.");
    } finally {
      setGenerating(false);
    }
  }

  function addBlankExercise() {
    setDraftExercises((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", sets: "3", reps: "8" },
    ]);
    setManageOpen(true);
  }

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
      setRoutineTitle("Imported workout (editable)");
    }
  }

  async function saveSession() {
    if (draftExercises.length === 0) {
      setRoutineNote("Generate or add exercises before completing a session.");
      return;
    }
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
        <Text style={styles.subtitle}>Routines from your preferences — import/voice/manual to refine</Text>

        <View style={styles.heroCard}>
          <Text style={styles.section}>Generate from preferences</Text>
          <Text style={styles.prefs}>{prefsSummary}</Text>
          <Pressable
            style={[styles.primary, generating && styles.disabled]}
            onPress={generateFromPreferences}
            disabled={generating || !user}
            accessibilityRole="button"
            accessibilityLabel="Generate routine from preferences">
            {generating ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.primaryText}>Generate my routine</Text>
            )}
          </Pressable>
          {routineTitle ? <Text style={styles.routineTitle}>{routineTitle}</Text> : null}
          {routineNote ? <Text style={styles.note}>{routineNote}</Text> : null}
        </View>

        <Text style={styles.section}>Today’s draft (editable)</Text>
        {draftExercises.length === 0 ? (
          <Text style={styles.hint}>No exercises yet — generate from preferences, or add via the tools below.</Text>
        ) : null}
        {draftExercises.map((ex) => (
          <View key={ex.id} style={styles.row}>
            <TextInput
              style={styles.input}
              value={ex.name}
              placeholder="Exercise"
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

        {draftExercises.length > 0 ? (
          <AnimatedExerciseDemo exerciseName={activeName} targetMuscle={targetMuscleForExercise(activeName)} />
        ) : null}

        <Pressable style={styles.primary} onPress={saveSession}>
          <Text style={styles.primaryText}>Complete session</Text>
        </Pressable>
        <SessionSummaryCard summary={sessionSummary} loading={summaryLoading} />

        <Pressable style={styles.secondary} onPress={() => setManageOpen((v) => !v)}>
          <Text style={styles.secondaryText}>
            {manageOpen ? "Hide" : "Show"} add / update tools (PDF · photo · voice · manual)
          </Text>
        </Pressable>

        {manageOpen ? (
          <View style={styles.manageBox}>
            <Text style={styles.hint}>
              These update the same editable draft — they do not replace preference-based generation.
            </Text>
            <PdfImportPanel onImported={handleImportMapped} />
            {ocrText ? <Text style={styles.note}>OCR draft: {ocrText.slice(0, 80)}…</Text> : null}
            {ocrNotice ? <Text style={styles.note}>{ocrNotice}</Text> : null}
            <VoiceCaptureIndicator listening={listening} partial={partial} onToggle={toggleVoice} />
            <Text style={styles.engine}>Voice engine: {getWhisperEngineName()}</Text>
            {parseError ? <Text style={styles.error}>{parseError}</Text> : null}
            <Pressable style={styles.secondary} onPress={addBlankExercise}>
              <Text style={styles.secondaryText}>Add exercise manually</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.surface },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: semantic.textPrimary },
  subtitle: { fontSize: typography.fontSize.sm, color: semantic.textMuted },
  heroCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: semantic.surfaceMuted,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  section: { fontSize: typography.fontSize.md, fontWeight: "700", color: semantic.textPrimary },
  prefs: { fontSize: typography.fontSize.sm, color: semantic.textSecondary },
  hint: { fontSize: typography.fontSize.sm, color: semantic.textMuted },
  note: { fontSize: typography.fontSize.sm, color: semantic.textSecondary },
  routineTitle: { fontWeight: "700", color: palette.emeraldDark, fontSize: typography.fontSize.md },
  engine: { fontSize: typography.fontSize.xs, color: semantic.textMuted },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: semantic.textOnPrimary, fontWeight: "700" },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.emerald,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryText: { color: palette.emeraldDark, fontWeight: "700", textAlign: "center" },
  disabled: { opacity: 0.6 },
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
  manageBox: { gap: spacing.md, paddingTop: spacing.sm },
});
