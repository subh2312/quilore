/**
 * Quilore Design System Tokens
 *
 * High-contrast, large-touch-target UI for mid-workout use (docs §4).
 * Prefer `themes.light` / `themes.dark` (or `useThemeColors`) over raw palette.
 */

// ─── Palette (raw swatches) ─────────────────────────────────
export const palette = {
  // Primary — darker fills for WCAG AA white-on-primary (≥4.5:1)
  emerald: '#047857', // primary CTA fill / text on light
  emeraldMid: '#059669',
  emeraldLight: '#34D399',
  emeraldSoft: '#D1FAE5',
  emeraldDark: '#065F46',

  // Accent
  amber: '#B45309', // text-safe on light
  amberFill: '#D97706',
  amberLight: '#FBBF24',
  amberSoft: '#FEF3C7',

  // Feedback
  red: '#B91C1C', // text-safe danger on light
  redFill: '#DC2626', // button fill with white text
  redSoft: '#FEE2E2',
  blue: '#1D4ED8', // link text
  blueLight: '#93C5FD',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',
} as const;

export type ThemeColors = {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  textOnUserBubble: string;
  textOnInverse: string;
  textDanger: string;
  textWarning: string;
  textLink: string;
  textSuccess: string;
  surface: string;
  surfaceMuted: string;
  surfaceInverse: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  primary: string;
  primaryMuted: string;
  primarySoft: string;
  danger: string;
  dangerFill: string;
  chipBg: string;
  chipBgSelected: string;
  chipText: string;
  chipTextSelected: string;
  userBubble: string;
  coachBubble: string;
  confirmSoft: string;
  tabIconDefault: string;
  tabIconSelected: string;
  overlay: string;
};

export const themes: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    textPrimary: palette.gray900,
    textSecondary: palette.gray700,
    textMuted: palette.gray600,
    textOnPrimary: palette.white,
    textOnUserBubble: palette.white,
    textOnInverse: palette.white, // light theme: inverse surface is dark
    textDanger: palette.red,
    textWarning: palette.amber,
    textLink: palette.blue,
    textSuccess: palette.emerald,
    surface: palette.white,
    surfaceMuted: palette.gray50,
    surfaceInverse: palette.gray900,
    surfaceElevated: palette.white,
    border: palette.gray300,
    borderStrong: palette.gray400,
    inputBg: palette.white,
    inputText: palette.gray900,
    inputPlaceholder: palette.gray500,
    primary: palette.emerald,
    primaryMuted: palette.emeraldMid,
    primarySoft: palette.emeraldSoft,
    danger: palette.red,
    dangerFill: palette.redFill,
    chipBg: palette.gray200,
    chipBgSelected: palette.emeraldSoft,
    chipText: palette.gray800,
    chipTextSelected: palette.emeraldDark,
    userBubble: palette.emerald,
    coachBubble: palette.gray100,
    confirmSoft: palette.emeraldSoft,
    tabIconDefault: palette.gray500,
    tabIconSelected: palette.emerald,
    overlay: 'rgba(17, 24, 39, 0.55)',
  },
  dark: {
    textPrimary: palette.gray50,
    textSecondary: palette.gray300,
    textMuted: palette.gray400,
    textOnPrimary: palette.white,
    textOnUserBubble: palette.white,
    textOnInverse: palette.gray900, // dark theme: inverse surface is light
    textDanger: '#FCA5A5',
    textWarning: '#FCD34D',
    textLink: palette.blueLight,
    textSuccess: palette.emeraldLight,
    surface: palette.gray900,
    surfaceMuted: palette.gray800,
    surfaceInverse: palette.gray50,
    surfaceElevated: '#1F2937',
    border: palette.gray700,
    borderStrong: palette.gray600,
    inputBg: palette.gray800,
    inputText: palette.gray50,
    inputPlaceholder: palette.gray400,
    primary: '#059669',
    primaryMuted: palette.emeraldLight,
    primarySoft: '#064E3B',
    danger: '#FCA5A5',
    dangerFill: palette.redFill,
    chipBg: palette.gray700,
    chipBgSelected: '#064E3B',
    chipText: palette.gray100,
    chipTextSelected: palette.emeraldLight,
    userBubble: '#047857',
    coachBubble: palette.gray800,
    confirmSoft: '#064E3B',
    tabIconDefault: palette.gray500,
    tabIconSelected: palette.emeraldLight,
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
};

/** @deprecated Prefer themes.light / useThemeColors() — light-only snapshot for legacy imports. */
export const semantic: ThemeColors = themes.light;

// ─── Spacing (4px base grid) ────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Typography ─────────────────────────────────────────────
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    display: 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─── Border Radius ──────────────────────────────────────────
export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ─── Touch Targets (§4.3 — large targets for sweaty hands) ─
export const touchTarget = {
  minHeight: 48,
  minWidth: 48,
} as const;

// ─── Shadows ────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
