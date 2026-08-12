import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { setAnalyticsConsent, track } from '@/lib/analytics';
import { setCrashReportingEnabled } from '@/lib/crashReporting';
import { recordConsent, savePrivacyPreferences } from '@/lib/api/profile';
import { saveOnboardingDraft } from '@/lib/onboarding/storage';
import { useAuth } from '@/context/AuthContext';

export default function ConsentOnboardingScreen() {
  const { user } = useAuth();
  const [terms, setTerms] = useState(false);
  const [aiDisclaimer, setAiDisclaimer] = useState(false);
  const [injuryDisclaimer, setInjuryDisclaimer] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [crash, setCrash] = useState(true);
  const [busy, setBusy] = useState(false);

  const requiredOk = terms && aiDisclaimer && injuryDisclaimer;

  useEffect(() => {
    void saveOnboardingDraft({ consentsAccepted: false });
  }, []);

  async function complete() {
    if (!requiredOk || busy) return;
    setBusy(true);
    try {
      setAnalyticsConsent(analytics);
      setCrashReportingEnabled(crash);

      if (user) {
        await Promise.all([
          recordConsent(user.id, 'terms_of_use', true),
          recordConsent(user.id, 'ai_editable_disclaimer', true),
          recordConsent(user.id, 'injury_risk_flag_disclaimer', true),
          savePrivacyPreferences(user.id, { analyticsOptIn: analytics, crashReportingOptIn: crash }),
        ]);
      }

      await saveOnboardingDraft({ consentsAccepted: true });
      track('onboarding_completed', { step: 'consent', analytics, crash });
      router.push('/onboarding/profile-baseline');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>Step 2 of 4</Text>
      <Text style={styles.title}>Consent & privacy</Text>
      <Text style={styles.body}>
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
        style={[styles.primary, (!requiredOk || busy) && styles.disabled]}
        disabled={!requiredOk || busy}
        onPress={complete}>
        <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Continue'}</Text>
      </Pressable>
    </ScrollView>
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
  return (
    <Pressable style={styles.row} onPress={() => onChange(!value)} accessibilityRole="checkbox">
      <Text style={styles.check}>{value ? '☑' : '☐'}</Text>
      <Text style={styles.rowLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  step: { color: palette.emeraldDark, fontWeight: '700', fontSize: typography.fontSize.sm },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  body: { fontSize: typography.fontSize.sm, color: palette.gray600, lineHeight: 20 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  check: { fontSize: 20, color: palette.emeraldDark },
  rowLabel: { flex: 1, color: palette.gray800, fontSize: typography.fontSize.md },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  disabled: { opacity: 0.5 },
  primaryText: { color: palette.white, fontWeight: '700' },
});
