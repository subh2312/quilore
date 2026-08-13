/** Client-side feature flag evaluation helper (Story 16.5). */

export type FlagState = {
  enabled: boolean;
  rolloutPercent: number;
  environment: string;
};

export type FlagMap = Record<string, FlagState>;

export function isFlagEnabled(flags: FlagMap, key: string): boolean {
  return Boolean(flags[key]?.enabled);
}

export const DEFAULT_FLAGS: FlagMap = {
  program_generation: { enabled: true, rolloutPercent: 100, environment: 'all' },
  meal_scan: { enabled: true, rolloutPercent: 100, environment: 'all' },
  advanced_coaching: { enabled: true, rolloutPercent: 100, environment: 'all' },
  voice_logging: { enabled: true, rolloutPercent: 100, environment: 'all' },
};
