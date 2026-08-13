import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { MacroProgressCard } from "@/components/quilore/MacroProgressCard";
import { ManualMealComposer, MealLine } from "@/components/quilore/ManualMealComposer";
import { PortionRangeSlider } from "@/components/quilore/PortionRangeSlider";
import { ConfirmationChatCard, ConfirmItem } from "@/components/quilore/ConfirmationChatCard";
import { palette, radii, semantic, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { calculateMeal, fetchFoodQuality } from "@/lib/api/nutrition";
import { pushPendingMutations } from "@/lib/api/sync";
import { upsertLocal } from "@/lib/offline/store";
import { track } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import {
  fetchLatestMacroTargets,
  getCachedMacroTargets,
  type MacroTargetSnapshot,
} from "@/lib/nutrition/macroTargets";

type MacroRow = { label: string; consumed: number; target: number; unit?: string };
type CaptureMode = "manual" | "meal" | "label" | "packaged";

const DEFAULT_TARGETS: MacroTargetSnapshot = {
  goalType: "maintain",
  primaryGoal: "maintain",
  targetCalories: 2200,
  targetProteinG: 140,
  targetCarbsG: 220,
  targetFatG: 70,
  policyVersion: "macro-policy-v1",
  source: "local",
};

const CAPTURE_MODES: { id: CaptureMode; label: string; hint: string }[] = [
  { id: "manual", label: "Manual", hint: "Type dishes + household units" },
  { id: "meal", label: "Meal photo", hint: "Plate / home-cooked meal" },
  { id: "label", label: "Nutrition label", hint: "Back-of-pack macros" },
  { id: "packaged", label: "Packaged / drink", hint: "Bar, bottle, packaged food" },
];

function rowsFromTargets(
  consumed: { calories: number; protein: number; carbs: number; fat: number },
  targets: MacroTargetSnapshot,
): MacroRow[] {
  return [
    { label: "Calories", consumed: consumed.calories, target: Math.round(targets.targetCalories) },
    { label: "Protein", consumed: consumed.protein, target: Math.round(targets.targetProteinG), unit: "g" },
    { label: "Carbs", consumed: consumed.carbs, target: Math.round(targets.targetCarbsG), unit: "g" },
    { label: "Fat", consumed: consumed.fat, target: Math.round(targets.targetFatG), unit: "g" },
  ];
}

function defaultLabelForMode(mode: CaptureMode, fileName?: string): string {
  const hint = fileName?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (hint && hint.length > 1) return hint;
  switch (mode) {
    case "label":
      return "Nutrition label item";
    case "packaged":
      return "Packaged food / drink";
    case "meal":
      return "Scanned meal";
    default:
      return "Food item";
  }
}

export default function NutritionScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<CaptureMode>("manual");
  const [grams, setGrams] = useState(180);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [qualityNote, setQualityNote] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);
  const [targets, setTargets] = useState<MacroTargetSnapshot>(getCachedMacroTargets() ?? DEFAULT_TARGETS);
  const [macros, setMacros] = useState<MacroRow[]>(
    rowsFromTargets({ calories: 0, protein: 0, carbs: 0, fat: 0 }, getCachedMacroTargets() ?? DEFAULT_TARGETS),
  );
  const [scanItems, setScanItems] = useState<ConfirmItem[]>([]);
  const [scanPrompt, setScanPrompt] = useState<string | null>(null);
  const calLow = grams * 1.1;
  const calHigh = grams * 1.4;

  useEffect(() => {
    void pushPendingMutations();
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const latest = await fetchLatestMacroTargets(user.id);
      if (latest) {
        setTargets(latest);
        setMacros((prev) => {
          const consumed = {
            calories: prev.find((m) => m.label === "Calories")?.consumed ?? 0,
            protein: prev.find((m) => m.label === "Protein")?.consumed ?? 0,
            carbs: prev.find((m) => m.label === "Carbs")?.consumed ?? 0,
            fat: prev.find((m) => m.label === "Fat")?.consumed ?? 0,
          };
          return rowsFromTargets(consumed, latest);
        });
      }
    })();
  }, [user]);

  async function applyTotals(
    totals: { calories: number; proteinG: number; carbsG: number; fatG: number; disclaimer?: string },
    note: string,
  ) {
    setMacros(
      rowsFromTargets(
        {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.proteinG),
          carbs: Math.round(totals.carbsG),
          fat: Math.round(totals.fatG),
        },
        targets,
      ),
    );
    setSavedNote(totals.disclaimer ? `${note} · ${totals.disclaimer}` : note);
  }

  async function pickPhoto(capture: Exclude<CaptureMode, "manual">) {
    setScanBusy(true);
    setSavedNote(null);
    setQualityNote(null);
    try {
      track("meal_scan_started", { mode: capture });
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      const label = defaultLabelForMode(capture, asset?.name);
      setMode(capture);
      setScanItems([{ id: `${capture}_1`, label, confirmed: true }]);
      setScanPrompt(
        capture === "label"
          ? `Label photo draft: “${label}” — confirm name, then AI estimates macros from portion.`
          : capture === "packaged"
            ? `Packaged item draft: “${label}” — confirm, then AI calculates from estimate grams.`
            : `Meal photo draft: “${label}” — confirm dishes, then AI calculates macros.`,
      );
      setSavedNote("Photo attached — confirm items below. Macros calculate after confirm (editable).");
    } catch (err) {
      setSavedNote(err instanceof Error ? err.message : "Could not open camera roll / files.");
    } finally {
      setScanBusy(false);
    }
  }

  async function saveManual(lines: MealLine[]) {
    const id = `meal_${Date.now()}`;
    upsertLocal("meals", id, { lines, source: "manual" });
    track("meal_logged", { mealId: id, itemCount: lines.length, source: "manual" });
    setSavedNote(`Saved ${lines.length} items — calculating macros…`);
    try {
      const totals = await calculateMeal(
        lines.map((line) => ({
          name: line.foodName,
          grams: line.unit === "g" ? Number(line.amount) || 100 : undefined,
        })),
      );
      await applyTotals(totals, `${lines.length} manual items queued for sync`);
    } catch {
      setSavedNote(`Saved ${lines.length} items offline — will sync via Spring Boot.`);
    }
  }

  async function confirmScan() {
    const confirmed = scanItems.filter((i) => i.confirmed);
    if (!confirmed.length) {
      setSavedNote("Select at least one item to calculate.");
      return;
    }
    setCalcBusy(true);
    setSavedNote("AI calculating macros…");
    try {
      const totals = await calculateMeal(confirmed.map((i) => ({ name: i.label, grams })));
      await applyTotals(
        totals,
        `Calculated from ${mode} capture (${confirmed.map((i) => i.label).join(", ")})`,
      );
      upsertLocal(
        "meals",
        `meal_scan_${Date.now()}`,
        { items: confirmed, grams, source: mode },
        true,
      );
      track("meal_logged", { mealId: `scan_${Date.now()}`, itemCount: confirmed.length, source: mode });

      const quality = await fetchFoodQuality({
        items: confirmed.map((i) => ({ name: i.label, grams })),
        mealType: mode === "packaged" ? "snack" : "meal",
      });
      setQualityNote(quality.feedback);
      if (quality.degraded && quality.message) {
        setSavedNote(quality.message);
      }
    } catch (err) {
      setSavedNote(err instanceof Error ? err.message : "Macro calculation failed — edit and retry.");
    } finally {
      setCalcBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.subtitle}>
          Log manually or from photos — AI estimates macros · goal:{" "}
          {(targets.primaryGoal || "maintain").replace("_", " ")}
        </Text>
        <MacroProgressCard macros={macros} />

        <Text style={styles.section}>How do you want to log?</Text>
        <View style={styles.modeGrid}>
          {CAPTURE_MODES.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.modeChip, mode === m.id && styles.modeChipOn]}
              onPress={() => {
                setMode(m.id);
                if (m.id === "manual") {
                  setScanItems([]);
                  setScanPrompt(null);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={m.label}>
              <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelOn]}>{m.label}</Text>
              <Text style={styles.modeHint}>{m.hint}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "manual" ? (
          <>
            <Text style={styles.section}>Manual log</Text>
            <ManualMealComposer onSave={saveManual} />
          </>
        ) : (
          <>
            <Text style={styles.section}>
              {mode === "meal" ? "Meal photo" : mode === "label" ? "Nutrition label" : "Packaged food / drink"}
            </Text>
            <Text style={styles.hint}>
              Capture a photo — confirm what AI detected — macros calculate automatically (still editable).
            </Text>
            <Pressable
              style={[styles.primary, scanBusy && styles.disabled]}
              onPress={() => pickPhoto(mode)}
              disabled={scanBusy}
              accessibilityRole="button">
              {scanBusy ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.primaryText}>
                  {mode === "meal"
                    ? "Take / pick meal photo"
                    : mode === "label"
                      ? "Take / pick label photo"
                      : "Take / pick packaged item photo"}
                </Text>
              )}
            </Pressable>

            {scanItems.length > 0 ? (
              <>
                <PortionRangeSlider grams={grams} calLow={calLow} calHigh={calHigh} onChangeGrams={setGrams} />
                {scanPrompt ? (
                  <ConfirmationChatCard
                    prompt={scanPrompt}
                    items={scanItems}
                    onToggle={(id) =>
                      setScanItems((prev) =>
                        prev.map((i) => (i.id === id ? { ...i, confirmed: !i.confirmed } : i)),
                      )
                    }
                    onConfirmAll={confirmScan}
                  />
                ) : null}
                {calcBusy ? <Text style={styles.note}>Calculating macros…</Text> : null}
              </>
            ) : null}
          </>
        )}

        {qualityNote ? <Text style={styles.note}>{qualityNote}</Text> : null}
        {savedNote ? <Text style={styles.note}>{savedNote}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.surface },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: semantic.textPrimary },
  subtitle: { fontSize: typography.fontSize.sm, color: semantic.textMuted },
  section: { fontSize: typography.fontSize.md, fontWeight: "700", color: semantic.textPrimary },
  hint: { fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: -spacing.sm },
  note: { color: palette.emeraldDark, fontSize: typography.fontSize.sm },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  modeChip: {
    width: "48%",
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: semantic.border,
    backgroundColor: semantic.surfaceMuted,
    padding: spacing.sm,
    justifyContent: "center",
    gap: 2,
  },
  modeChipOn: { borderColor: palette.emerald, backgroundColor: semantic.confirmSoft },
  modeLabel: { fontWeight: "700", color: semantic.textPrimary },
  modeLabelOn: { color: palette.emeraldDark },
  modeHint: { fontSize: typography.fontSize.xs, color: semantic.textMuted },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: semantic.textOnPrimary, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
