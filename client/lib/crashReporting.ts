/**
 * Crash reporting + perf breadcrumbs (Story 16.2).
 * Optional Sentry when EXPO_PUBLIC_SENTRY_DSN is set.
 */

import { getSentryDsn } from "./api/config";

type CrashPayload = { message: string; release: string; device?: string; stack?: string };
type SentryModule = {
  init: (options: Record<string, unknown>) => void;
  addBreadcrumb: (crumb: { message: string }) => void;
  captureMessage: (message: string) => void;
};

const breadcrumbs: string[] = [];
let enabled = true;
let screenMarks: Record<string, number> = {};
let sentryReady = false;
const SENTRY_MODULE_NAME = "@sentry/react-native";

function loadSentryModule(): SentryModule | null {
  try {
    const runtimeRequire = Function("return require")() as (moduleName: string) => SentryModule;
    return runtimeRequire(SENTRY_MODULE_NAME);
  } catch {
    return null;
  }
}

async function ensureSentry() {
  if (sentryReady || !getSentryDsn() || !enabled) return;
  try {
    const Sentry = loadSentryModule();
    if (!Sentry) {
      sentryReady = false;
      return;
    }
    Sentry.init({ dsn: getSentryDsn(), enableInExpoDevelopment: false });
    sentryReady = true;
  } catch {
    sentryReady = false;
  }
}

export function setCrashReportingEnabled(optIn: boolean) {
  enabled = optIn;
  if (optIn) void ensureSentry();
}

export function leaveBreadcrumb(label: string) {
  if (!enabled) return;
  breadcrumbs.push(`${Date.now()}:${label}`);
  if (breadcrumbs.length > 50) breadcrumbs.shift();
  if (getSentryDsn()) {
    Promise.resolve(loadSentryModule()).then((Sentry) => {
      if (!Sentry) return;
      Sentry.addBreadcrumb({ message: label });
    }).catch(() => undefined);
  }
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
  if (!enabled) return { accepted: false as const, reason: "consent_required" as const };
  if (getSentryDsn()) {
    Promise.resolve(loadSentryModule()).then((Sentry) => {
      if (!Sentry) return;
      Sentry.captureMessage(payload.message);
    }).catch(() => undefined);
  }
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
  sentryReady = false;
}
