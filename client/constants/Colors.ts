import { themes, type ThemeColors } from './DesignTokens';

export type ColorSchemeName = 'light' | 'dark';

export function getThemeColors(scheme: ColorSchemeName | null | undefined): ThemeColors {
  return scheme === 'dark' ? themes.dark : themes.light;
}

export default {
  light: {
    text: themes.light.textPrimary,
    background: themes.light.surface,
    tint: themes.light.tabIconSelected,
    tabIconDefault: themes.light.tabIconDefault,
    tabIconSelected: themes.light.tabIconSelected,
    card: themes.light.surfaceMuted,
    border: themes.light.border,
    subtitle: themes.light.textMuted,
  },
  dark: {
    text: themes.dark.textPrimary,
    background: themes.dark.surface,
    tint: themes.dark.tabIconSelected,
    tabIconDefault: themes.dark.tabIconDefault,
    tabIconSelected: themes.dark.tabIconSelected,
    card: themes.dark.surfaceMuted,
    border: themes.dark.border,
    subtitle: themes.dark.textMuted,
  },
};
