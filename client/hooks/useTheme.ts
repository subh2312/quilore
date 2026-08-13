import { useMemo } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import { getThemeColors, type ColorSchemeName } from '@/constants/Colors';
import type { ThemeColors } from '@/constants/DesignTokens';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme() as ColorSchemeName | null | undefined;
  return useMemo(() => getThemeColors(scheme), [scheme]);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      // RN typings vary across versions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);
  return reduced;
}

/** Convenience: theme + reduced-motion + compact width hint for forms. */
export function useTheme() {
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const reduceMotion = usePrefersReducedMotion();
  const { width } = useWindowDimensions();
  return {
    colors,
    scheme: (scheme ?? 'light') as ColorSchemeName,
    isDark: scheme === 'dark',
    reduceMotion,
    isCompact: width < 380,
  };
}
