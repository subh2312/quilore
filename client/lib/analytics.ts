/**
 * Product analytics event taxonomy (Story 9.4).
 * Consent must be checked before emission.
 */

export const ANALYTICS_TAXONOMY = [
  'onboarding_started',
  'onboarding_completed',
  'goal_set',
  'workout_started',
  'workout_completed',
  'meal_logged',
  'meal_scan_started',
  'chat_message_sent',
  'subscription_started',
  'subscription_restored',
  'injury_triage_viewed',
  'feature_flag_evaluated',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_TAXONOMY)[number];

const DISALLOWED = new Set([
  'injuryNotes',
  'rawTranscript',
  'mealPhotoBase64',
  'password',
  'healthDiagnosis',
]);

export type AnalyticsSink = (event: AnalyticsEventName, props: Record<string, unknown>) => void;

let analyticsOptIn = false;
let sink: AnalyticsSink = () => undefined;

export function setAnalyticsConsent(optIn: boolean) {
  analyticsOptIn = optIn;
}

export function setAnalyticsSink(next: AnalyticsSink) {
  sink = next;
}

export function track(event: AnalyticsEventName, properties: Record<string, unknown> = {}) {
  if (!analyticsOptIn) {
    return { accepted: false as const, reason: 'consent_required' as const };
  }
  if (!(ANALYTICS_TAXONOMY as readonly string[]).includes(event)) {
    return { accepted: false as const, reason: 'unknown_event' as const };
  }
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (!DISALLOWED.has(k)) cleaned[k] = v;
  }
  cleaned.timestamp = new Date().toISOString();
  sink(event, cleaned);
  return { accepted: true as const, event, properties: cleaned };
}
