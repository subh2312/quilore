import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

export type ConfirmItem = { id: string; label: string; confirmed: boolean };

export function ConfirmationChatCard({
  prompt,
  items,
  onToggle,
  onConfirmAll,
}: {
  prompt: string;
  items: ConfirmItem[];
  onToggle: (id: string) => void;
  onConfirmAll: () => void;
}) {
  const c = useThemeColors();
  return (
    <View
      style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.primaryMuted }]}
      accessibilityLabel="Confirmation chat card">
      <Text style={[styles.aiBadge, { color: c.textSuccess }]}>AI observation — editable</Text>
      <Text style={[styles.prompt, { color: c.textPrimary }]}>{prompt}</Text>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onToggle(item.id)}
          style={[
            styles.item,
            { backgroundColor: item.confirmed ? c.confirmSoft : c.surfaceMuted },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.confirmed }}
          accessibilityLabel={item.label}>
          <Text style={[styles.itemText, { color: c.textPrimary }]}>
            {item.confirmed ? '✓ ' : '○ '}
            {item.label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        style={[styles.cta, { backgroundColor: c.primary }]}
        onPress={onConfirmAll}
        accessibilityRole="button">
        <Text style={[styles.ctaText, { color: c.textOnPrimary }]}>Confirm selection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  aiBadge: { fontSize: typography.fontSize.xs, fontWeight: '700' },
  prompt: { fontSize: typography.fontSize.md },
  item: {
    minHeight: touchTarget.minHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  itemText: { fontSize: typography.fontSize.md },
  cta: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontWeight: '700', fontSize: typography.fontSize.md },
});
