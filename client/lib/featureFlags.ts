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
  meal_scan: { enabled: false, rolloutPercent: 0, environment: 'all' },
  advanced_coaching: { enabled: true, rolloutPercent: 100, environment: 'all' },
  program_generation: { enabled: false, rolloutPercent: 10, environment: 'staging' },
  voice_logging: { enabled: true, rolloutPercent: 100, environment: 'all' },
};
