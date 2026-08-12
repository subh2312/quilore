import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing, typography } from '@/constants/DesignTokens';

const FRAMES = ['◯ top', '↘ eccentric', '● bottom', '↗ concentric'];

export function AnimatedExerciseDemo({
  exerciseName,
  targetMuscle,
}: {
  exerciseName: string;
  targetMuscle: string;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.wrap} accessibilityLabel="Animated exercise demo">
      <Text style={styles.title}>{exerciseName}</Text>
      <View style={styles.stage}>
        <Text style={styles.frame}>{FRAMES[frame]}</Text>
      </View>
      <Text style={styles.muscle}>Target highlight: {targetMuscle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, padding: spacing.md, backgroundColor: palette.gray900, borderRadius: radii.lg },
  title: { color: palette.white, fontSize: typography.fontSize.lg, fontWeight: '700' },
  stage: {
    height: 120,
    borderRadius: radii.md,
    backgroundColor: palette.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { color: palette.emeraldLight, fontSize: typography.fontSize.xl, fontWeight: '700' },
  muscle: { color: palette.amberLight, fontSize: typography.fontSize.sm },
});
