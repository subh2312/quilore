import { getThemeColors } from '../constants/Colors';
import { themes } from '../constants/DesignTokens';

/** Relative luminance for WCAG contrast checks. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const rgb = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme contrast (WCAG AA text)', () => {
  it('light primary button text meets 4.5:1', () => {
    const t = themes.light;
    expect(contrastRatio(t.textOnPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('light body text on surface meets 4.5:1', () => {
    const t = themes.light;
    expect(contrastRatio(t.textPrimary, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.textDanger, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('dark body text on surface meets 4.5:1', () => {
    const t = themes.dark;
    expect(contrastRatio(t.textPrimary, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('getThemeColors switches schemes', () => {
    expect(getThemeColors('light').surface).toBe(themes.light.surface);
    expect(getThemeColors('dark').surface).toBe(themes.dark.surface);
  });
});
