import { Pressable, StyleSheet, Text } from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

type SelectionChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Accessible selectable chip — 48px min height, radio/selected state announced. */
export function SelectionChip({ label, selected, onPress, accessibilityLabel }: SelectionChipProps) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        { backgroundColor: selected ? c.chipBgSelected : c.chipBg, borderColor: selected ? c.primary : c.border },
      ]}>
      <Text style={[styles.text, { color: selected ? c.chipTextSelected : c.chipText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    fontSize: typography.fontSize.sm,
    textTransform: 'capitalize',
  },
});
