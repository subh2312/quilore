/**
 * Crash reporting + mobile performance monitoring scaffold (Story 16.2).
 * Respects crashReportingOptIn consent; no PII in breadcrumbs by default.
 */

type CrashPayload = {
  message: string;
  release: string;
  device?: string;
  stack?: string;
};

const breadcrumbs: string[] = [];
let enabled = true;
let screenMarks: Record<string, number> = {};

export function setCrashReportingEnabled(optIn: boolean) {
  enabled = optIn;
}

export function leaveBreadcrumb(label: string) {
  if (!enabled) return;
  breadcrumbs.push(`${Date.now()}:${label}`);
  if (breadcrumbs.length > 50) breadcrumbs.shift();
}

export function markScreenStart(screen: string) {
  screenMarks[screen] = Date.now();
}

export function markScreenEnd(screen: string) {
  const start = screenMarks[screen];
  if (!start) return null;
  const ms = Date.now() - start;
  leaveBreadcrumb(`perf:${screen}:${ms}ms`);
  return ms;
}

export function reportCrash(payload: CrashPayload) {
  if (!enabled) return { accepted: false as const, reason: 'consent_required' as const };
  // SDK wiring (Sentry/Bugsnag) is deferred; keep a local grouped sink for tests.
  return {
    accepted: true as const,
    groupedBy: `${payload.release}:${payload.message}`,
    breadcrumbs: [...breadcrumbs],
  };
}

export function resetCrashStateForTests() {
  breadcrumbs.length = 0;
  screenMarks = {};
  enabled = true;
}
