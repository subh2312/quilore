/**
 * Extract dish names from free-text meal logs ("Log paratha and alu bhaji for breakfast").
 */

const STOP = new Set([
  'log',
  'add',
  'ate',
  'had',
  'eat',
  'for',
  'my',
  'a',
  'an',
  'the',
  'with',
  'and',
  'plus',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'today',
  'please',
  'meal',
]);

export function looksLikeMealLog(text: string): boolean {
  return /\b(log|ate|had|add)\b/i.test(text) || /\b(breakfast|lunch|dinner|snack)\b/i.test(text);
}

export function parseMealLogItems(text: string): { id: string; label: string; confirmed: boolean }[] {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(please\s+)?(log|add|ate|had|eat)\s+/i, '');
  cleaned = cleaned.replace(/\s+for\s+(breakfast|lunch|dinner|snack)\b.*$/i, '');
  cleaned = cleaned.replace(/\b(breakfast|lunch|dinner|snack)\b/gi, ' ');

  const parts = cleaned
    .split(/\s*(?:,|&|\+| and |\s+with\s+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p
        .split(/\s+/)
        .filter((w) => !STOP.has(w.toLowerCase()))
        .join(' ')
        .trim(),
    )
    .filter((p) => p.length > 1);

  const unique: string[] = [];
  for (const part of parts) {
    const label = part.replace(/\s+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    if (!unique.some((u) => u.toLowerCase() === label.toLowerCase())) unique.push(label);
  }

  return unique.map((label, i) => ({
    id: `meal_${i}_${label.toLowerCase().replace(/\s+/g, '_')}`,
    label,
    confirmed: true,
  }));
}
