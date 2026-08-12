import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MacroProgressCard } from '@/components/quilore/MacroProgressCard';
import { ManualMealComposer, MealLine } from '@/components/quilore/ManualMealComposer';
import { PortionRangeSlider } from '@/components/quilore/PortionRangeSlider';
import { ConfirmationChatCard, ConfirmItem } from '@/components/quilore/ConfirmationChatCard';
import { palette, spacing, typography } from '@/constants/DesignTokens';
import { upsertLocal } from '@/lib/offline/store';
import { track } from '@/lib/analytics';

export default function NutritionScreen() {
  const [grams, setGrams] = useState(180);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [scanItems, setScanItems] = useState<ConfirmItem[]>([
    { id: '1', label: 'Dalma', confirmed: true },
    { id: '2', label: 'Jeera rice', confirmed: true },
  ]);
  const calLow = grams * 1.1;
  const calHigh = grams * 1.4;

  function saveManual(lines: MealLine[]) {
    const id = `meal_${Date.now()}`;
    upsertLocal('meals', id, { lines, source: 'manual' });
    track('meal_logged', { mealId: id, itemCount: lines.length, source: 'manual' });
    setSavedNote(`Saved ${lines.length} items offline — will sync via Spring Boot.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nutrition</Text>
      <Text style={styles.subtitle}>Daily macros, scan confirm, and manual composer</Text>

      <MacroProgressCard
        macros={[
          { label: 'Calories', consumed: 1420, target: 2200 },
          { label: 'Protein', consumed: 86, target: 140, unit: 'g' },
          { label: 'Carbs', consumed: 160, target: 220, unit: 'g' },
          { label: 'Fat', consumed: 48, target: 70, unit: 'g' },
        ]}
      />

      <Text style={styles.section}>Scanned meal estimate</Text>
      <PortionRangeSlider
        grams={grams}
        calLow={calLow}
        calHigh={calHigh}
        onChangeGrams={setGrams}
      />
      <ConfirmationChatCard
        prompt="I see dalma and jeera rice — confirm before macros persist."
        items={scanItems}
        onToggle={(id) =>
          setScanItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, confirmed: !i.confirmed } : i)),
          )
        }
        onConfirmAll={() => setSavedNote('Scan list confirmed — still editable.')}
      />

      <Text style={styles.section}>Manual composer</Text>
      <ManualMealComposer onSave={saveManual} />
      {savedNote ? <Text style={styles.note}>{savedNote}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  section: { fontSize: typography.fontSize.md, fontWeight: '700', color: palette.gray800 },
  note: { color: palette.emeraldDark, fontSize: typography.fontSize.sm },
});
