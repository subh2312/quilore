/**
 * Client backlog gap contracts — analytics, offline, crash, flags, OCR/voice stubs.
 */

import {
  ANALYTICS_TAXONOMY,
  setAnalyticsConsent,
  setAnalyticsSink,
  track,
} from '../../lib/analytics';
import { DEFAULT_FLAGS, isFlagEnabled } from '../../lib/featureFlags';
import {
  leaveBreadcrumb,
  markScreenEnd,
  markScreenStart,
  reportCrash,
  resetCrashStateForTests,
  setCrashReportingEnabled,
} from '../../lib/crashReporting';
import {
  getOfflineSnapshot,
  listLocal,
  markSynced,
  migrateIfNeeded,
  pendingMutations,
  resetOfflineStore,
  upsertLocal,
  LOCAL_SCHEMA_VERSION,
} from '../../lib/offline/store';
import { runOnDeviceOcr } from '../../lib/ocr/onDeviceOcr';
import { appendPartial, startListening, stopListening } from '../../lib/voice/whisperStub';
import type { AnalyticsEventName } from '../../lib/analytics';
import type { PendingMutation } from '../../lib/offline/store';

describe('Analytics taxonomy', () => {
  it('blocks emission without consent and strips sensitive props', () => {
    setAnalyticsConsent(false);
    expect(track('meal_logged')).toEqual(
      expect.objectContaining({ accepted: false, reason: 'consent_required' }),
    );
    const emitted: unknown[] = [];
    setAnalyticsSink((e: AnalyticsEventName, p: Record<string, unknown>) => emitted.push({ e, p }));
    setAnalyticsConsent(true);
    const res = track('meal_logged', { mealId: 'm1', injuryNotes: 'secret' });
    expect(res.accepted).toBe(true);
    expect((res as { properties: Record<string, unknown> }).properties.injuryNotes).toBeUndefined();
    expect(ANALYTICS_TAXONOMY).toContain('goal_set');
  });
});

describe('Feature flags', () => {
  it('reads default high-risk gates', () => {
    expect(isFlagEnabled(DEFAULT_FLAGS, 'meal_scan')).toBe(true);
    expect(isFlagEnabled(DEFAULT_FLAGS, 'program_generation')).toBe(true);
    expect(isFlagEnabled(DEFAULT_FLAGS, 'advanced_coaching')).toBe(true);
  });
});

describe('Crash reporting consent', () => {
  beforeEach(() => resetCrashStateForTests());

  it('records perf breadcrumbs when enabled', () => {
    setCrashReportingEnabled(true);
    markScreenStart('nutrition');
    leaveBreadcrumb('open');
    markScreenEnd('nutrition');
    const crash = reportCrash({ message: 'boom', release: '1.0.0' });
    expect(crash.accepted).toBe(true);
    expect(crash.groupedBy).toContain('1.0.0');
  });

  it('respects opt-out', () => {
    setCrashReportingEnabled(false);
    expect(reportCrash({ message: 'boom', release: '1.0.0' }).accepted).toBe(false);
  });
});

describe('Offline-first store', () => {
  beforeEach(() => resetOfflineStore());

  it('queues mutations and migrates schema', () => {
    upsertLocal('meals', 'm1', { calories: 100 });
    expect(listLocal('meals')).toHaveLength(1);
    expect(pendingMutations()).toHaveLength(1);
    markSynced(pendingMutations().map((m: PendingMutation) => m.id));
    expect(pendingMutations()).toHaveLength(0);
    expect(migrateIfNeeded(0)).toBe(LOCAL_SCHEMA_VERSION);
    expect(getOfflineSnapshot().collections.plans).toBeDefined();
  });
});

describe('On-device OCR and Whisper contracts', () => {
  it('returns editable OCR text stub', async () => {
    const ocr = await runOnDeviceOcr('file://plate.jpg');
    expect(ocr.engine).toBe('stub');
    expect(ocr.text.length).toBeGreaterThan(0);
  });

  it('captures partial then final transcript', () => {
    startListening();
    expect(appendPartial('three by eight').text).toContain('three');
    expect(stopListening().isFinal).toBe(true);
  });
});
