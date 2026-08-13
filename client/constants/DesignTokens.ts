/**
 * Quilore Design System Tokens
 *
 * Based on docs/quilore_document_set.md §4 — Design System.
 * High-contrast, large-touch-target UI for use mid-workout.
 */

// ─── Colors ─────────────────────────────────────────────────
export const palette = {
  // Primary
  emerald: '#10B981',
  emeraldLight: '#34D399',
  emeraldDark: '#059669',

  // Accent
  amber: '#F59E0B',
  amberLight: '#FBBF24',

  // Feedback
  red: '#EF4444',
  blue: '#3B82F6',

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

/** Semantic colors — prefer these over raw palette for text/surfaces. */
export const semantic = {
  textPrimary: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  textOnPrimary: palette.white,
  textOnUserBubble: palette.white,
  textDanger: palette.red,
  textWarning: palette.amber,
  textLink: palette.blue,
  surface: palette.white,
  surfaceMuted: palette.gray50,
  surfaceInverse: palette.gray900,
  border: palette.gray200,
  inputBg: palette.white,
  inputText: palette.gray900,
  inputPlaceholder: palette.gray400,
  confirmSoft: '#D1FAE5',
} as const;

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
