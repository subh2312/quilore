import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { setAnalyticsConsent, track } from '@/lib/analytics';
import { setCrashReportingEnabled } from '@/lib/crashReporting';
import { recordConsent, savePrivacyPreferences } from '@/lib/api/profile';
import { saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

export default function ConsentOnboardingScreen() {
  const { user } = useAuth();
  const c = useThemeColors();
  const [terms, setTerms] = useState(false);
  const [aiDisclaimer, setAiDisclaimer] = useState(false);
  const [injuryDisclaimer, setInjuryDisclaimer] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [crash, setCrash] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredOk = terms && aiDisclaimer && injuryDisclaimer;

  useEffect(() => {
    if (!user) return;
    void saveOnboardingDraft(user.id, { consentsAccepted: false });
  }, [user]);

  async function complete() {
    if (!requiredOk || busy || !user) return;
    setBusy(true);
    setError(null);
    try {
      setAnalyticsConsent(analytics);
      setCrashReportingEnabled(crash);

      await Promise.all([
        recordConsent(user.id, 'terms_of_use', true),
        recordConsent(user.id, 'ai_editable_disclaimer', true),
        recordConsent(user.id, 'injury_risk_flag_disclaimer', true),
      ]);
      await savePrivacyPreferences(user.id, { analyticsOptIn: analytics, crashReportingOptIn: crash });

      await saveOnboardingDraft(user.id, { consentsAccepted: true });
      track('onboarding_completed', { step: 'consent', analytics, crash });
      router.push('/onboarding/profile-baseline');
    } catch (err) {
      const message =
        err instanceof Error && /network|offline|unavailable/i.test(err.message)
          ? 'Server unavailable. Required consents must be saved online before continuing.'
          : err instanceof Error
            ? err.message
            : 'Could not save consent. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.back, { borderColor: c.border }]}>
            <Text style={[styles.backText, { color: c.textPrimary }]}>Back</Text>
          </Pressable>
          <Text style={[styles.step, { color: c.textSuccess }]}>Step 2 of 4</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>Consent & privacy</Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Required terms must be accepted before onboarding continues. Medical-risk features are
            non-diagnostic risk flags only.
          </Text>

          <ToggleRow label="I accept Terms of Use (v1.0)" value={terms} onChange={setTerms} required />
          <ToggleRow
            label="I understand AI outputs are editable coaching suggestions"
            value={aiDisclaimer}
            onChange={setAiDisclaimer}
            required
          />
          <ToggleRow
            label="I understand injury triage is a risk flag, not a diagnosis"
            value={injuryDisclaimer}
            onChange={setInjuryDisclaimer}
            required
          />
          <ToggleRow label="Optional: analytics" value={analytics} onChange={setAnalytics} />
          <ToggleRow label="Optional: crash reporting" value={crash} onChange={setCrash} />

          <Pressable
            style={[styles.primary, { backgroundColor: c.primary }, (!requiredOk || busy) && styles.disabled]}
            disabled={!requiredOk || busy}
            onPress={complete}
            accessibilityRole="button"
            accessibilityState={{ disabled: !requiredOk || busy }}>
            <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>
              {busy ? 'Saving…' : requiredOk ? 'Continue' : 'Accept required items to continue'}
            </Text>
          </Pressable>
          {error ? <Text style={[styles.error, { color: c.textDanger }]}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      style={[styles.row, { minHeight: touchTarget.minHeight }]}
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}>
      <Text style={[styles.check, { color: c.textSuccess }]}>{value ? '☑' : '☐'}</Text>
      <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
        {label}
        {required ? ' *' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  back: {
    alignSelf: 'flex-start',
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  backText: { fontWeight: '700' },
  step: { fontWeight: '700', fontSize: typography.fontSize.sm },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  body: { fontSize: typography.fontSize.sm, lineHeight: 20 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  check: { fontSize: 22, width: 28 },
  rowLabel: { flex: 1, fontSize: typography.fontSize.md },
  primary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  disabled: { opacity: 0.45 },
  primaryText: { fontWeight: '700', textAlign: 'center' },
  error: { fontWeight: '600' },
});
