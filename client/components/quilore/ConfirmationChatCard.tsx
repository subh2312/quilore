import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, semantic, spacing, typography, touchTarget } from '@/constants/DesignTokens';

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
  return (
    <View style={styles.card} accessibilityLabel="Confirmation chat card">
      <Text style={styles.aiBadge}>AI observation — editable</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onToggle(item.id)}
          style={[styles.item, item.confirmed && styles.itemOn]}
          accessibilityRole="button">
          <Text style={styles.itemText}>{item.confirmed ? '✓ ' : '○ '}{item.label}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.cta} onPress={onConfirmAll} accessibilityRole="button">
        <Text style={styles.ctaText}>Confirm selection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderColor: palette.emeraldLight,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  aiBadge: { fontSize: typography.fontSize.xs, color: palette.emeraldDark, fontWeight: '700' },
  prompt: { fontSize: typography.fontSize.md, color: semantic.textPrimary },
  item: {
    minHeight: touchTarget.minHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.gray100,
  },
  itemOn: { backgroundColor: semantic.confirmSoft },
  itemText: { fontSize: typography.fontSize.md, color: semantic.textPrimary },
  cta: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: semantic.textOnPrimary, fontWeight: '700', fontSize: typography.fontSize.md },
});