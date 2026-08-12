import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';

export type MealLine = {
  id: string;
  foodName: string;
  amount: string;
  unit: string;
};

const UNITS = ['g', 'roti', 'katori', 'bowl', 'cup', 'tbsp', 'tsp', 'piece'];

export function ManualMealComposer({
  onSave,
}: {
  onSave: (lines: MealLine[]) => void;
}) {
  const [lines, setLines] = useState<MealLine[]>([
    { id: '1', foodName: 'Dalma', amount: '1', unit: 'katori' },
  ]);

  const canSave = useMemo(
    () => lines.length > 0 && lines.every((l) => l.foodName.trim() && Number(l.amount) > 0),
    [lines],
  );

  function update(id: string, patch: Partial<MealLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), foodName: '', amount: '100', unit: 'g' },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Manual meal composer">
      <Text style={styles.title}>Manual meal</Text>
      <Text style={styles.hint}>Indian household units supported — totals stay editable before save.</Text>
      {lines.map((line) => (
        <View key={line.id} style={styles.line}>
          <TextInput
            style={styles.input}
            placeholder="Food name"
            value={line.foodName}
            onChangeText={(foodName) => update(line.id, { foodName })}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.amount]}
              keyboardType="decimal-pad"
              value={line.amount}
              onChangeText={(amount) => update(line.id, { amount })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.units}>
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => update(line.id, { unit: u })}
                  style={[styles.unitChip, line.unit === u && styles.unitOn]}>
                  <Text style={styles.unitText}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Pressable onPress={() => removeLine(line.id)} accessibilityRole="button">
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.secondary} onPress={addLine}>
        <Text style={styles.secondaryText}>Add food</Text>
      </Pressable>
      <Pressable
        style={[styles.primary, !canSave && styles.disabled]}
        disabled={!canSave}
        onPress={() => onSave(lines)}>
        <Text style={styles.primaryText}>Save meal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: typography.fontSize.lg, fontWeight: '700', color: palette.gray900 },
  hint: { fontSize: typography.fontSize.xs, color: palette.gray500 },
  line: {
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
  },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
    fontSize: typography.fontSize.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  amount: { width: 72 },
  units: { flexGrow: 1 },
  unitChip: {
    paddingHorizontal: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: palette.gray200,
  },
  unitOn: { backgroundColor: palette.emeraldLight },
  unitText: { fontWeight: '600', color: palette.gray800 },
  remove: { color: palette.red, fontSize: typography.fontSize.sm },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: palette.emeraldDark, fontWeight: '700' },
  primary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    backgroundColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  primaryText: { color: palette.white, fontWeight: '700' },
});
