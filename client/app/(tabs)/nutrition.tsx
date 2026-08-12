import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { MacroProgressCard } from "@/components/quilore/MacroProgressCard";
import { ManualMealComposer, MealLine } from "@/components/quilore/ManualMealComposer";
import { PortionRangeSlider } from "@/components/quilore/PortionRangeSlider";
import { ConfirmationChatCard, ConfirmItem } from "@/components/quilore/ConfirmationChatCard";
import { palette, spacing, typography } from "@/constants/DesignTokens";
import { calculateMeal, fetchFoodQuality } from "@/lib/api/nutrition";
import { pushPendingMutations } from "@/lib/api/sync";
import { upsertLocal } from "@/lib/offline/store";
import { track } from "@/lib/analytics";

type MacroRow = { label: string; consumed: number; target: number; unit?: string };

export default function NutritionScreen() {
  const [grams, setGrams] = useState(180);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [qualityNote, setQualityNote] = useState<string | null>(null);
  const [macros, setMacros] = useState<MacroRow[]>([
    { label: "Calories", consumed: 1420, target: 2200 },
    { label: "Protein", consumed: 86, target: 140, unit: "g" },
    { label: "Carbs", consumed: 160, target: 220, unit: "g" },
    { label: "Fat", consumed: 48, target: 70, unit: "g" },
  ]);
  const [scanItems, setScanItems] = useState<ConfirmItem[]>([
    { id: "1", label: "Dalma", confirmed: true },
    { id: "2", label: "Jeera rice", confirmed: true },
  ]);
  const calLow = grams * 1.1;
  const calHigh = grams * 1.4;

  useEffect(() => {
    void pushPendingMutations();
  }, []);

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
      setMacros([
        { label: "Calories", consumed: Math.round(totals.calories), target: 2200 },
        { label: "Protein", consumed: Math.round(totals.proteinG), target: 140, unit: "g" },
        { label: "Carbs", consumed: Math.round(totals.carbsG), target: 220, unit: "g" },
        { label: "Fat", consumed: Math.round(totals.fatG), target: 70, unit: "g" },
      ]);
      setSavedNote(`${totals.disclaimer} · ${lines.length} items queued for sync.`);
    } catch {
      /* keep offline note */
    }
  }

  async function confirmScan() {
    const confirmed = scanItems.filter((i) => i.confirmed);
    setSavedNote("Scan list confirmed — still editable.");
    try {
      const quality = await fetchFoodQuality({ items: confirmed.map((i) => ({ name: i.label, grams })), mealType: "lunch" });
      setQualityNote(quality.feedback);
      if (quality.degraded && quality.message) {
        setSavedNote(quality.message);
      }
    } catch {
      setQualityNote(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nutrition</Text>
      <Text style={styles.subtitle}>Daily macros, scan confirm, and manual composer</Text>
      <MacroProgressCard macros={macros} />
      <Text style={styles.section}>Scanned meal estimate</Text>
      <PortionRangeSlider grams={grams} calLow={calLow} calHigh={calHigh} onChangeGrams={setGrams} />
      <ConfirmationChatCard
        prompt="I see dalma and jeera rice — confirm before macros persist."
        items={scanItems}
        onToggle={(id) => setScanItems((prev) => prev.map((i) => (i.id === id ? { ...i, confirmed: !i.confirmed } : i)))}
        onConfirmAll={confirmScan}
      />
      {qualityNote ? <Text style={styles.note}>{qualityNote}</Text> : null}
      <Text style={styles.section}>Manual composer</Text>
      <ManualMealComposer onSave={saveManual} />
      {savedNote ? <Text style={styles.note}>{savedNote}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  section: { fontSize: typography.fontSize.md, fontWeight: "700", color: palette.gray800 },
  note: { color: palette.emeraldDark, fontSize: typography.fontSize.sm },
});
