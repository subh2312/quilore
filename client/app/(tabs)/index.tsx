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
import { radii, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { useThemeColors } from "@/hooks/useTheme";
import { fetchSessionSummary } from "@/lib/api/workout";
import { requestProgramGeneration } from "@/lib/api/coach";
import { fetchCurrentGoal, fetchProfile } from "@/lib/api/profile";
import type { SessionSummaryResponse } from "@/lib/api/types";
import { appendPartial, getWhisperEngineName, startListening, stopListening } from "@/lib/voice/whisperStub";
import { parseVoiceSet } from "@/lib/voice/parseVoiceSet";
import { targetMuscleForExercise } from "@/lib/workout/exerciseTargets";
import { exercisesToDraftRows } from "@/lib/workout/generateFromPreferences";
import { listLocal, upsertLocal } from "@/lib/offline/store";
import { getOnboardingDraft } from "@/lib/onboarding/storage";
import { track } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import { useMarkObserveInteractive } from "@/hooks/useMarkObserveInteractive";

type TemplateExercise = { id: string; name: string; sets: string; reps: string; weightKg?: string };

export default function WorkoutScreen() {
  useMarkObserveInteractive();
  const c = useThemeColors();
  const { user } = useAuth();
  const sessionStart = useRef(new Date().toISOString());
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [draftExercises, setDraftExercises] = useState<TemplateExercise[]>([]);
  const [routineTitle, setRoutineTitle] = useState<string | null>(null);
  const [routineNote, setRoutineNote] = useState<string | null>(null);
  const signedOutSummary = "Sign in so routines can use your goals and equipment.";
  const [prefsSummary, setPrefsSummary] = useState("Loading preferences…");
  const [generating, setGenerating] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [profile, goal] = await Promise.all([fetchProfile(user.id), fetchCurrentGoal(user.id)]);
        const primary = goal.primaryGoal?.replace(/_/g, " ") ?? "goal not set";
        const exp = profile?.trainingExperience ?? "experience n/a";
        const equip = profile?.equipmentAccess?.trim() || "equipment not set";
        const days = Number(goal.schedulePrefs?.daysPerWeek ?? 4);
        if (!cancelled) {
          setPrefsSummary(`${primary} · ${exp} · ${equip} · ${days} days/week`);
        }
      } catch {
        if (!cancelled) {
          setPrefsSummary("Could not load preferences — generation still uses local defaults.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function generateFromPreferences() {
    if (!user || generating) return;
    setGenerating(true);
    setRoutineNote(null);
    try {
      const [profile, goal, draft] = await Promise.all([
        fetchProfile(user.id),
        fetchCurrentGoal(user.id),
        getOnboardingDraft(user.id),
      ]);
      const primaryGoal = goal.primaryGoal ?? "recomp";
      const daysPerWeek = Number(goal.schedulePrefs?.daysPerWeek ?? 4);
      const schedule = goal.schedulePrefs ?? {};
      const asStringList = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      const currentPhysique = draft.currentPhysique?.length
        ? draft.currentPhysique
        : asStringList(schedule.currentPhysique);
      const goalPhysique = draft.goalPhysique?.length
        ? draft.goalPhysique
        : asStringList(schedule.goalPhysique);
      const healthConditions = draft.healthConditions?.length
        ? draft.healthConditions
        : asStringList(schedule.healthConditions);
      const painRegions = draft.painRegions?.length
        ? draft.painRegions
        : asStringList(schedule.painRegions);
      const triage = listLocal("plans").find((p) => p.id === "triage_modify");
      const avoidRegions = Array.isArray(triage?.avoidRegions)
        ? (triage?.avoidRegions as string[])
        : [];
      const prompt = [
        `Generate a ${daysPerWeek}-day training routine`,
        `goal=${primaryGoal}`,
        `experience=${profile?.trainingExperience ?? "beginner"}`,
        `equipment=${profile?.equipmentAccess ?? "gym"}`,
        goalPhysique.length ? `goal_physique=${goalPhysique.join(",")}` : null,
        currentPhysique.length ? `current_physique=${currentPhysique.join(",")}` : null,
        profile?.injuriesInfo ? `injuries_risk_flag=${profile.injuriesInfo}` : null,
        avoidRegions.length ? `avoid_regions=${avoidRegions.join(",")}` : null,
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
          injuriesInfo: profile?.injuriesInfo ?? draft.injuriesInfo,
          currentPhysique,
          goalPhysique,
          healthConditions,
          painRegions,
          avoidRegions,
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
  const inputStyle = [
    styles.input,
    { borderColor: c.border, color: c.inputText, backgroundColor: c.inputBg },
  ];
  const smallStyle = [
    styles.small,
    { borderColor: c.border, color: c.inputText, backgroundColor: c.inputBg },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={[styles.title, { color: c.textPrimary }]}>Workout</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Routines from your preferences — import/voice/manual to refine
        </Text>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: c.surfaceMuted, borderColor: c.border },
          ]}>
          <Text style={[styles.section, { color: c.textPrimary }]}>Generate from preferences</Text>
          <Text style={[styles.prefs, { color: c.textSecondary }]}>
            {user ? prefsSummary : signedOutSummary}
          </Text>
          <Pressable
            style={[styles.primary, { backgroundColor: c.primary }, generating && styles.disabled]}
            onPress={generateFromPreferences}
            disabled={generating || !user}
            accessibilityRole="button"
            accessibilityLabel="Generate routine from preferences">
            {generating ? (
              <ActivityIndicator color={c.textOnPrimary} />
            ) : (
              <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>Generate my routine</Text>
            )}
          </Pressable>
          {routineTitle ? (
            <Text style={[styles.routineTitle, { color: c.textSuccess }]}>{routineTitle}</Text>
          ) : null}
          {routineNote ? <Text style={[styles.note, { color: c.textSecondary }]}>{routineNote}</Text> : null}
        </View>

        <Text style={[styles.section, { color: c.textPrimary }]}>Today’s draft (editable)</Text>
        {draftExercises.length === 0 ? (
          <Text style={[styles.hint, { color: c.textMuted }]}>
            No exercises yet — generate from preferences, or add via the tools below.
          </Text>
        ) : null}
        {draftExercises.map((ex) => (
          <View key={ex.id} style={styles.row}>
            <TextInput
              style={inputStyle}
              value={ex.name}
              placeholder="Exercise"
              placeholderTextColor={c.inputPlaceholder}
              onChangeText={(t) => setDraftExercises((p) => p.map((e) => (e.id === ex.id ? { ...e, name: t } : e)))}
            />
            <TextInput
              style={smallStyle}
              value={ex.sets}
              keyboardType="number-pad"
              placeholder="sets"
              placeholderTextColor={c.inputPlaceholder}
              onChangeText={(t) => setDraftExercises((p) => p.map((e) => (e.id === ex.id ? { ...e, sets: t } : e)))}
            />
            <Text style={[styles.times, { color: c.textSecondary }]}>×</Text>
            <TextInput
              style={smallStyle}
              value={ex.reps}
              keyboardType="number-pad"
              placeholder="reps"
              placeholderTextColor={c.inputPlaceholder}
              onChangeText={(t) => setDraftExercises((p) => p.map((e) => (e.id === ex.id ? { ...e, reps: t } : e)))}
            />
          </View>
        ))}

        {draftExercises.length > 0 ? (
          <AnimatedExerciseDemo exerciseName={activeName} targetMuscle={targetMuscleForExercise(activeName)} />
        ) : null}

        <Pressable style={[styles.primary, { backgroundColor: c.primary }]} onPress={saveSession}>
          <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>Complete session</Text>
        </Pressable>
        <SessionSummaryCard summary={sessionSummary} loading={summaryLoading} />

        <Pressable
          style={[styles.secondary, { borderColor: c.primary }]}
          onPress={() => setManageOpen((v) => !v)}>
          <Text style={[styles.secondaryText, { color: c.textSuccess }]}>
            {manageOpen ? "Hide" : "Show"} add / update tools (PDF · photo · voice · manual)
          </Text>
        </Pressable>

        {manageOpen ? (
          <View style={styles.manageBox}>
            <Text style={[styles.hint, { color: c.textMuted }]}>
              These update the same editable draft — they do not replace preference-based generation.
            </Text>
            <PdfImportPanel onImported={handleImportMapped} />
            {ocrText ? (
              <Text style={[styles.note, { color: c.textSecondary }]}>OCR draft: {ocrText.slice(0, 80)}…</Text>
            ) : null}
            {ocrNotice ? <Text style={[styles.note, { color: c.textSecondary }]}>{ocrNotice}</Text> : null}
            <VoiceCaptureIndicator listening={listening} partial={partial} onToggle={toggleVoice} />
            <Text style={[styles.engine, { color: c.textMuted }]}>Voice engine: {getWhisperEngineName()}</Text>
            {parseError ? <Text style={[styles.error, { color: c.textDanger }]}>{parseError}</Text> : null}
            <Pressable style={[styles.secondary, { borderColor: c.primary }]} onPress={addBlankExercise}>
              <Text style={[styles.secondaryText, { color: c.textSuccess }]}>Add exercise manually</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700" },
  subtitle: { fontSize: typography.fontSize.sm },
  heroCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  section: { fontSize: typography.fontSize.md, fontWeight: "700" },
  prefs: { fontSize: typography.fontSize.sm },
  hint: { fontSize: typography.fontSize.sm },
  note: { fontSize: typography.fontSize.sm },
  routineTitle: { fontWeight: "700", fontSize: typography.fontSize.md },
  engine: { fontSize: typography.fontSize.xs },
  primary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontWeight: "700" },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryText: { fontWeight: "700", textAlign: "center" },
  disabled: { opacity: 0.6 },
  error: { fontSize: typography.fontSize.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  small: {
    width: 56,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    textAlign: "center",
    minHeight: touchTarget.minHeight,
  },
  times: {},
  manageBox: { gap: spacing.md, paddingTop: spacing.sm },
});
