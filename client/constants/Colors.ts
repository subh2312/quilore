import { palette } from './DesignTokens';

const tintColorLight = palette.emerald;
const tintColorDark = palette.emeraldLight;

export default {
  light: {
    text: palette.gray900,
    background: palette.white,
    tint: tintColorLight,
    tabIconDefault: palette.gray400,
    tabIconSelected: tintColorLight,
    card: palette.gray50,
    border: palette.gray200,
    subtitle: palette.gray500,
  },
  dark: {
    text: palette.white,
    background: palette.gray900,
    tint: tintColorDark,
    tabIconDefault: palette.gray500,
    tabIconSelected: tintColorDark,
    card: palette.gray800,
    border: palette.gray700,
    subtitle: palette.gray400,
  },
};
