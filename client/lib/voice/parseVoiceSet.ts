/**
 * Lightweight on-device set parser for voice stubs and typed drafts.
 * Accepts: "3x8", "3 x 8", "3 by 8", "three by eight", "bench three by eight".
 */

const WORD_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
};

function toNum(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return WORD_NUM[t] ?? null;
}

export type ParsedVoiceSet = {
  name: string;
  sets: string;
  reps: string;
  raw: string;
};

export function parseVoiceSet(raw: string): ParsedVoiceSet | null {
  const text = raw.trim();
  if (!text) return null;

  const digit = text.match(/(.+?)\s+(\d+)\s*[x×]\s*(\d+)/i);
  if (digit) {
    return {
      name: digit[1].trim() || 'Voice set',
      sets: digit[2],
      reps: digit[3],
      raw: text,
    };
  }

  const byDigits = text.match(/(.+?)\s+(\d+)\s+by\s+(\d+)/i);
  if (byDigits) {
    return {
      name: byDigits[1].trim() || 'Voice set',
      sets: byDigits[2],
      reps: byDigits[3],
      raw: text,
    };
  }

  const byWords = text.match(/(.+?)\s+([a-z]+)\s+by\s+([a-z]+)/i);
  if (byWords) {
    const sets = toNum(byWords[2]);
    const reps = toNum(byWords[3]);
    if (sets != null && reps != null) {
      return {
        name: byWords[1].trim() || 'Voice set',
        sets: String(sets),
        reps: String(reps),
        raw: text,
      };
    }
  }

  if (/\bset\b/i.test(text)) {
    return { name: text.slice(0, 32), sets: '1', reps: '8', raw: text };
  }

  return null;
}
