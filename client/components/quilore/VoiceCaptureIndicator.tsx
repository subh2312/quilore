import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';

export function VoiceCaptureIndicator({
  listening,
  partial,
  onToggle,
}: {
  listening: boolean;
  partial: string;
  onToggle: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.mic, listening && styles.micOn]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel="Voice capture">
        <Text style={styles.micText}>{listening ? '● Listening' : '🎤 Voice log'}</Text>
      </Pressable>
      {listening || partial ? (
        <View style={styles.overlay}>
          <Text style={styles.partial}>{partial || '…'}</Text>
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
    backgroundColor: palette.gray800,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  micOn: { backgroundColor: palette.red },
  micText: { color: palette.white, fontWeight: '700', fontSize: typography.fontSize.md },
  overlay: {
    backgroundColor: palette.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  partial: { color: palette.white, fontSize: typography.fontSize.sm },
});
