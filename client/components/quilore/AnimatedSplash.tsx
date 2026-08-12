import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette, typography } from '@/constants/DesignTokens';

type AnimatedSplashProps = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.82);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 450 }),
      withDelay(550, withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })),
    );
    scale.value = withSequence(
      withTiming(1, { duration: 500 }),
      withTiming(1.06, { duration: 280 }),
      withTiming(1, { duration: 220 }),
    );
    labelOpacity.value = withDelay(250, withTiming(1, { duration: 350 }));
  }, [labelOpacity, onFinish, opacity, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <View style={styles.container} accessibilityLabel="Quilore splash">
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.Text style={[styles.brand, labelStyle]}>Quilore</Animated.Text>
      <Animated.Text style={[styles.tagline, labelStyle]}>Train smarter. Eat better.</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.emeraldDark,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  logoWrap: {
    marginBottom: 16,
  },
  logo: {
    width: 140,
    height: 140,
  },
  brand: {
    color: palette.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 8,
    color: palette.emeraldLight,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
});
