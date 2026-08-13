import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

export type MealLine = {
  id: string;
  foodName: string;
  amount: string;
  unit: string;
};

const UNITS = ['g', 'roti', 'katori', 'bowl', 'cup', 'tbsp', 'tsp', 'piece'];

function emptyLine(): MealLine {
  return { id: String(Date.now()), foodName: '', amount: '100', unit: 'g' };
}

export function ManualMealComposer({
  onSave,
  initialLines,
}: {
  onSave: (lines: MealLine[]) => void;
  initialLines?: MealLine[];
}) {
  const c = useThemeColors();
  const [lines, setLines] = useState<MealLine[]>(initialLines?.length ? initialLines : [emptyLine()]);

  const canSave = useMemo(
    () => lines.length > 0 && lines.every((l) => l.foodName.trim() && Number(l.amount) > 0),
    [lines],
  );

  function update(id: string, patch: Partial<MealLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((l) => l.id !== id)));
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Manual meal composer">
      <Text style={[styles.title, { color: c.textPrimary }]}>Manual meal</Text>
      <Text style={[styles.hint, { color: c.textMuted }]}>
        Indian household units supported — totals stay editable before save.
      </Text>
      {lines.map((line) => (
        <View key={line.id} style={[styles.line, { backgroundColor: c.surfaceMuted }]}>
          <TextInput
            style={[
              styles.input,
              { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText },
            ]}
            placeholder="Food name (e.g. paratha)"
            placeholderTextColor={c.inputPlaceholder}
            value={line.foodName}
            onChangeText={(foodName) => update(line.id, { foodName })}
          />
          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                styles.amount,
                { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText },
              ]}
              keyboardType="decimal-pad"
              placeholderTextColor={c.inputPlaceholder}
              value={line.amount}
              onChangeText={(amount) => update(line.id, { amount })}
              accessibilityLabel="Amount"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.units}>
              {UNITS.map((u) => {
                const on = line.unit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => update(line.id, { unit: u })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Unit ${u}`}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor: on ? c.primary : c.chipBg,
                        borderColor: on ? c.primary : c.border,
                      },
                    ]}>
                    <Text style={[styles.unitText, { color: on ? c.textOnPrimary : c.chipText }]}>{u}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <Pressable
            onPress={() => removeLine(line.id)}
            accessibilityRole="button"
            style={styles.removeHit}
            accessibilityLabel="Remove food line">
            <Text style={[styles.remove, { color: c.textDanger }]}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={[styles.secondary, { borderColor: c.primary }]}
        onPress={addLine}
        accessibilityRole="button">
        <Text style={[styles.secondaryText, { color: c.textSuccess }]}>Add food</Text>
      </Pressable>
      <Pressable
        style={[styles.primary, { backgroundColor: c.primary }, !canSave && styles.disabled]}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        onPress={() => onSave(lines)}>
        <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>
          {canSave ? 'Save meal' : 'Enter food name and amount'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  hint: { fontSize: typography.fontSize.xs },
  line: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.fontSize.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  amount: { width: 72 },
  units: { flexGrow: 1 },
  unitChip: {
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  unitText: { fontWeight: '700' },
  removeHit: { minHeight: touchTarget.minHeight, justifyContent: 'center' },
  remove: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '700' },
  primary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  disabled: { opacity: 0.45 },
  primaryText: { fontWeight: '700', textAlign: 'center' },
});
