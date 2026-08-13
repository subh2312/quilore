import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';

export function VoiceCaptureIndicator({
  listening,
  partial,
  onToggle,
}: {
  listening: boolean;
  partial: string;
  onToggle: () => void;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[
          styles.mic,
          { backgroundColor: listening ? c.dangerFill : c.surfaceInverse },
        ]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel="Voice capture">
        <Text style={[styles.micText, { color: c.textOnPrimary }]}>
          {listening ? '● Listening' : '🎤 Voice log'}
        </Text>
      </Pressable>
      {listening || partial ? (
        <View style={[styles.overlay, { backgroundColor: c.surfaceInverse }]}>
          <Text style={[styles.partial, { color: c.textOnPrimary }]}>{partial || '…'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  mic: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  micText: { fontWeight: '700', fontSize: typography.fontSize.md },
  overlay: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  partial: { fontSize: typography.fontSize.sm },
});
