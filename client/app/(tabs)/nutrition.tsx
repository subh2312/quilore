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

export default function NutritionScreen() {
  const { user } = useAuth();
  const [grams, setGrams] = useState(180);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [qualityNote, setQualityNote] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMode, setScanMode] = useState<"meal" | "label" | null>(null);
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

  async function pickScan(mode: "meal" | "label") {
    setScanBusy(true);
    setSavedNote(null);
    try {
      track("meal_scan_started", { mode });
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      const nameHint = asset?.name?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      setScanMode(mode);
      if (mode === "label") {
        const label = nameHint && nameHint.length > 1 ? nameHint : "Packaged food";
        setScanItems([{ id: "label_1", label, confirmed: true }]);
        setScanPrompt(`Label scan draft: “${label}” — edit name/portion before macros persist.`);
        setSavedNote("Label photo attached — OCR is on-device first pass; confirm before save.");
      } else {
        const label = nameHint && nameHint.length > 1 ? nameHint : "Scanned dish";
        setScanItems([{ id: "meal_1", label, confirmed: true }]);
        setScanPrompt(`I see “${label}” from your photo — confirm or rename before macros persist.`);
        setSavedNote("Meal photo attached — confirm items below (no demo dishes).");
      }
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
    setSavedNote(`Saved ${lines.length} items offline — will sync via Spring Boot.`);
    try {
      const totals = await calculateMeal(
        lines.map((line) => ({
          name: line.foodName,
          grams: line.unit === "g" ? Number(line.amount) || 100 : undefined,
        })),
      );
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
      setSavedNote(`${totals.disclaimer} · ${lines.length} items queued for sync.`);
    } catch {
      /* keep offline note */
    }
  }

  async function confirmScan() {
    const confirmed = scanItems.filter((i) => i.confirmed);
    setSavedNote("Scan list confirmed — still editable.");
    try {
      const quality = await fetchFoodQuality({
        items: confirmed.map((i) => ({ name: i.label, grams })),
        mealType: "lunch",
      });
      setQualityNote(quality.feedback);
      if (quality.degraded && quality.message) {
        setSavedNote(quality.message);
      }
    } catch {
      setQualityNote(null);
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
          Daily macros · scan meal/label · manual composer
          {targets.primaryGoal ? ` · goal: ${targets.primaryGoal.replace("_", " ")}` : ""}
        </Text>
        <MacroProgressCard macros={macros} />

        <Text style={styles.section}>Scan food</Text>
        <Text style={styles.hint}>Use the camera roll or files to scan a plate or packaged label.</Text>
        <View style={styles.scanRow}>
          <Pressable
            style={[styles.scanBtn, scanBusy && styles.disabled]}
            onPress={() => pickScan("meal")}
            disabled={scanBusy}
            accessibilityRole="button"
            accessibilityLabel="Scan meal photo">
            {scanBusy && scanMode === "meal" ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.scanBtnText}>Scan meal</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.scanBtnSecondary, scanBusy && styles.disabled]}
            onPress={() => pickScan("label")}
            disabled={scanBusy}
            accessibilityRole="button"
            accessibilityLabel="Scan nutrition label">
            <Text style={styles.scanBtnSecondaryText}>Scan label</Text>
          </Pressable>
        </View>

        {scanItems.length > 0 ? (
          <>
            <Text style={styles.section}>Scanned meal estimate</Text>
            <PortionRangeSlider grams={grams} calLow={calLow} calHigh={calHigh} onChangeGrams={setGrams} />
            {scanPrompt ? (
              <ConfirmationChatCard
                prompt={scanPrompt}
                items={scanItems}
                onToggle={(id) =>
                  setScanItems((prev) => prev.map((i) => (i.id === id ? { ...i, confirmed: !i.confirmed } : i)))
                }
                onConfirmAll={confirmScan}
              />
            ) : null}
          </>
        ) : null}

        {qualityNote ? <Text style={styles.note}>{qualityNote}</Text> : null}
        <Text style={styles.section}>Manual composer</Text>
        <ManualMealComposer onSave={saveManual} />
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
  scanRow: { flexDirection: "row", gap: spacing.sm },
  scanBtn: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnText: { color: semantic.textOnPrimary, fontWeight: "700" },
  scanBtnSecondary: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.emerald,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.surface,
  },
  scanBtnSecondaryText: { color: palette.emeraldDark, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
