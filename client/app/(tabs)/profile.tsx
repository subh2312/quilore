import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SelectionChip } from '@/components/quilore/SelectionChip';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { fetchMe, isSupportOrAdmin } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { fetchEntitlements, mockPurchase, mockRestorePurchases } from '@/lib/api/billing';
import { setAnalyticsConsent, track } from '@/lib/analytics';
import { setCrashReportingEnabled } from '@/lib/crashReporting';
import {
  fetchCurrentGoal,
  fetchProfile,
  saveGoal,
  upsertProfile,
  type ProfileUpsertInput,
} from '@/lib/api/profile';
import { recalculateMacroTargets } from '@/lib/nutrition/macroTargets';
import { useAuth } from '@/context/AuthContext';

const GOALS = ['fat_loss', 'recomp', 'muscle_gain', 'maintain', 'performance'] as const;
const SEX_OPTIONS = ['female', 'male', 'other'] as const;
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;
const TONES = ['direct', 'supportive', 'detailed'] as const;
const SECONDARY = ['strength', 'mobility', 'endurance', 'nutrition_focus'] as const;

export default function ProfileScreen() {
  const c = useThemeColors();
  const { user, signOut } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [age, setAge] = useState('');
  const [sex, setSex] = useState<(typeof SEX_OPTIONS)[number]>('female');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [trainingExperience, setTrainingExperience] = useState<(typeof EXPERIENCE)[number]>('beginner');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [injuriesInfo, setInjuriesInfo] = useState('');
  const [equipmentAccess, setEquipmentAccess] = useState('');
  const [injuriesDisclaimer, setInjuriesDisclaimer] = useState('');

  const [primaryGoal, setPrimaryGoal] = useState<(typeof GOALS)[number]>('recomp');
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [coachingTone, setCoachingTone] = useState<(typeof TONES)[number]>('supportive');
  const [secondaryPrefs, setSecondaryPrefs] = useState<string[]>([]);

  const [analytics, setAnalytics] = useState(false);
  const [crash, setCrash] = useState(true);
  const [privacyNotifs, setPrivacyNotifs] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [plan, setPlan] = useState<'FREE' | 'PREMIUM'>('FREE');
  const [canAdmin, setCanAdmin] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      setProfileLoading(true);
      setStatus(null);
      try {
        const me = await fetchMe();
        if (!active) return;
        setCanAdmin(isSupportOrAdmin(me.role));
        const ent = await fetchEntitlements(me.id);
        if (ent?.plan) setPlan(ent.plan === 'PREMIUM' ? 'PREMIUM' : 'FREE');

        const profile = await fetchProfile(user.id);
        if (!active) return;
        if (profile) {
          if (profile.age) setAge(String(profile.age));
          if (profile.sex && (SEX_OPTIONS as readonly string[]).includes(profile.sex)) {
            setSex(profile.sex as (typeof SEX_OPTIONS)[number]);
          }
          if (profile.heightCm) setHeightCm(String(profile.heightCm));
          if (profile.weightKg) setWeightKg(String(profile.weightKg));
          if (
            profile.trainingExperience &&
            (EXPERIENCE as readonly string[]).includes(profile.trainingExperience)
          ) {
            setTrainingExperience(profile.trainingExperience as (typeof EXPERIENCE)[number]);
          }
          setDietaryPreferences(profile.dietaryPreferences ?? '');
          setInjuriesInfo(profile.injuriesInfo ?? '');
          setEquipmentAccess(profile.equipmentAccess ?? '');
          setInjuriesDisclaimer(profile.injuriesDisclaimer ?? '');
        }

        const goal = await fetchCurrentGoal(user.id);
        if (!active) return;
        if (goal.primaryGoal && (GOALS as readonly string[]).includes(goal.primaryGoal)) {
          setPrimaryGoal(goal.primaryGoal as (typeof GOALS)[number]);
        }
        if (goal.schedulePrefs && typeof goal.schedulePrefs.daysPerWeek === 'number') {
          setDaysPerWeek(String(goal.schedulePrefs.daysPerWeek));
        }
        if (goal.coachingTone && (TONES as readonly string[]).includes(goal.coachingTone)) {
          setCoachingTone(goal.coachingTone as (typeof TONES)[number]);
        }
        if (goal.secondaryPrefs?.length) setSecondaryPrefs(goal.secondaryPrefs);
      } catch (err) {
        if (active) {
          if (err instanceof ApiClientError && err.status === 401) {
            setStatus('Session expired — sign out and sign in again.');
          } else {
            setStatus(err instanceof Error ? err.message : 'Could not load profile.');
          }
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const baselineValid =
    Number(age) >= 13 &&
    Number(age) <= 100 &&
    Number(heightCm) > 0 &&
    Number(weightKg) > 0;

  function toggleSecondary(pref: string) {
    setSecondaryPrefs((prev) => (prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]));
  }

  async function saveProfile() {
    if (!user || !baselineValid || saving) return;
    setSaving(true);
    setStatus(null);
    const payload: ProfileUpsertInput = {
      age: Number(age),
      sex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      trainingExperience,
      dietaryPreferences,
      injuriesInfo,
      equipmentAccess,
    };
    try {
      await upsertProfile(user.id, payload);
      await saveGoal(user.id, {
        primaryGoal,
        coachingTone,
        secondaryPrefs,
        schedulePrefs: { daysPerWeek: Math.min(6, Math.max(2, Number(daysPerWeek) || 4)) },
      });
      const macros = await recalculateMacroTargets(user.id, {
        primaryGoal,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        age: payload.age,
        sex: payload.sex,
        activityLevel: 'moderate',
      });
      track('goal_set', { primaryGoal, coachingTone, source: 'profile' });
      setStatus(
        `Profile saved. Macro targets updated for ${primaryGoal.replace('_', ' ')}: ${macros.targetCalories} kcal · P ${Math.round(macros.targetProteinG)}g / C ${Math.round(macros.targetCarbsG)}g / F ${Math.round(macros.targetFatG)}g.`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed — try again when online.');
    } finally {
      setSaving(false);
    }
  }

  async function purchase() {
    setBillingBusy(true);
    setStatus(null);
    try {
      const ent = await mockPurchase('premium_monthly');
      setPlan(ent.plan === 'PREMIUM' ? 'PREMIUM' : 'FREE');
      track('subscription_started', { productId: 'premium_monthly' });
      setStatus(
        ent.plan === 'PREMIUM'
          ? 'Premium activated (UAT). You can change this anytime.'
          : 'Purchase completed — plan unchanged.',
      );
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setStatus('Session expired — sign in again to manage purchases.');
      } else {
        setStatus(err instanceof Error ? err.message : 'Purchase failed');
      }
    } finally {
      setBillingBusy(false);
    }
  }

  async function restore() {
    setBillingBusy(true);
    setStatus(null);
    try {
      const ent = await mockRestorePurchases();
      setPlan(ent.plan === 'PREMIUM' ? 'PREMIUM' : 'FREE');
      track('subscription_restored', { productId: 'premium_monthly' });
      setStatus(
        ent.plan === 'PREMIUM'
          ? 'Purchases restored — Premium is active.'
          : 'No Premium purchase found to restore.',
      );
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setStatus('Session expired — sign in again to restore purchases.');
      } else {
        setStatus(err instanceof Error ? err.message : 'Restore failed');
      }
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace('/(auth)/login');
  }

  if (!user) {
    return (
      <View style={[styles.loading, { backgroundColor: c.surface }]}>
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Sign in to view your profile.</Text>
      </View>
    );
  }

  if (profileLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.surface }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={[styles.title, { color: c.textPrimary }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Account, baseline, goals, privacy, and billing
        </Text>

        <View style={[styles.card, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
          <Text style={[styles.section, { color: c.textPrimary }]}>Account</Text>
          <InfoRow label="Name" value={user.displayName || '—'} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="User ID" value={user.id} />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Plan" value={plan} />
        </View>

        <Link href="/onboarding/welcome" style={[styles.link, { color: c.textLink }]}>
          Re-run onboarding & preferences
        </Link>
        {canAdmin ? (
          <Link href="/admin/food-aliases" style={[styles.link, { color: c.textLink }]}>
            Admin · food alias review
          </Link>
        ) : null}

        <Text style={[styles.section, { color: c.textPrimary }]}>Baseline (editable)</Text>
        <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
        <Text style={[styles.label, { color: c.textPrimary }]}>Sex</Text>
        <View style={styles.wrap}>
          {SEX_OPTIONS.map((opt) => (
            <SelectionChip
              key={opt}
              label={opt.replace('_', ' ')}
              selected={sex === opt}
              onPress={() => setSex(opt)}
            />
          ))}
        </View>
        <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
        <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
        <Text style={[styles.label, { color: c.textPrimary }]}>Training experience</Text>
        <View style={styles.wrap}>
          {EXPERIENCE.map((opt) => (
            <SelectionChip
              key={opt}
              label={opt.replace('_', ' ')}
              selected={trainingExperience === opt}
              onPress={() => setTrainingExperience(opt)}
            />
          ))}
        </View>
        <Field
          label="Dietary preferences"
          value={dietaryPreferences}
          onChangeText={setDietaryPreferences}
          placeholder="e.g. vegetarian, high protein"
        />
        <Field
          label="Injuries / limitations (risk flag only)"
          value={injuriesInfo}
          onChangeText={setInjuriesInfo}
          placeholder="Optional — not a diagnosis"
          multiline
        />
        {injuriesDisclaimer ? (
          <Text style={[styles.disclaimer, { color: c.textWarning }]}>{injuriesDisclaimer}</Text>
        ) : null}
        <Field
          label="Equipment access"
          value={equipmentAccess}
          onChangeText={setEquipmentAccess}
          placeholder="e.g. home dumbbells, full gym"
        />

        <Text style={[styles.section, { color: c.textPrimary }]}>Goals & coaching</Text>
        <Text style={[styles.label, { color: c.textPrimary }]}>Primary goal</Text>
        <View style={styles.wrap}>
          {GOALS.map((opt) => (
            <SelectionChip
              key={opt}
              label={opt.replace('_', ' ')}
              selected={primaryGoal === opt}
              onPress={() => setPrimaryGoal(opt)}
            />
          ))}
        </View>
        <Field
          label="Training days per week"
          value={daysPerWeek}
          onChangeText={setDaysPerWeek}
          keyboardType="number-pad"
          placeholder="2–6"
        />
        <Text style={[styles.label, { color: c.textPrimary }]}>Coaching tone</Text>
        <View style={styles.wrap}>
          {TONES.map((opt) => (
            <SelectionChip
              key={opt}
              label={opt}
              selected={coachingTone === opt}
              onPress={() => setCoachingTone(opt)}
            />
          ))}
        </View>
        <Text style={[styles.label, { color: c.textPrimary }]}>Secondary preferences (optional)</Text>
        <View style={styles.wrap}>
          {SECONDARY.map((s) => (
            <SelectionChip
              key={s}
              label={s.replace('_', ' ')}
              selected={secondaryPrefs.includes(s)}
              onPress={() => toggleSecondary(s)}
            />
          ))}
        </View>

        <Pressable
          style={[styles.primary, { backgroundColor: c.primary }, (!baselineValid || saving) && styles.disabled]}
          onPress={saveProfile}
          disabled={!baselineValid || saving}>
          <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>
            {saving ? 'Saving…' : 'Save profile & coaching prefs'}
          </Text>
        </Pressable>

        <Text style={[styles.section, { color: c.textPrimary }]}>Privacy preferences</Text>
        <Row
          label="Analytics opt-in"
          value={analytics}
          onChange={(v) => {
            setAnalytics(v);
            setAnalyticsConsent(v);
          }}
        />
        <Row
          label="Crash reporting"
          value={crash}
          onChange={(v) => {
            setCrash(v);
            setCrashReportingEnabled(v);
          }}
        />
        <Row label="Privacy-safe notifications" value={privacyNotifs} onChange={setPrivacyNotifs} />
        <Row label="Workout reminders" value={workoutReminders} onChange={setWorkoutReminders} />

        <Text style={[styles.section, { color: c.textPrimary }]}>Subscription · {plan}</Text>
        <Pressable
          style={[styles.primary, { backgroundColor: c.primary }, billingBusy && styles.disabled]}
          onPress={purchase}
          disabled={billingBusy}>
          <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>
            {billingBusy ? 'Processing…' : 'Start Premium'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondary, { borderColor: c.primary }]}
          onPress={restore}
          disabled={billingBusy}>
          <Text style={[styles.secondaryText, { color: c.textSuccess }]}>Restore purchases</Text>
        </Pressable>

        <Pressable
          style={[styles.logout, { backgroundColor: c.surfaceInverse }]}
          onPress={handleLogout}
          accessibilityRole="button">
          <Text style={[styles.logoutText, { color: c.textOnInverse }]}>Log out</Text>
        </Pressable>

        {status ? (
          <Text
            style={[
              styles.status,
              {
                color:
                  /expired|failed|could not|error/i.test(status) ? c.textDanger : c.textSecondary,
              },
            ]}>
            {status}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.textPrimary }]}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'number-pad' | 'decimal-pad';
  placeholder?: string;
  multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={c.inputPlaceholder}
        multiline={multiline}
      />
    </View>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  loadingText: { fontSize: typography.fontSize.md },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  subtitle: { fontSize: typography.fontSize.sm },
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
  },
  link: { fontWeight: '600' },
  section: { fontWeight: '700', marginTop: spacing.sm },
  label: { fontWeight: '700' },
  field: { gap: spacing.xs },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
  },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  disclaimer: { fontSize: typography.fontSize.sm, fontWeight: '600' },
  primary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontWeight: '700' },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '700' },
  logout: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { fontWeight: '800' },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: typography.fontSize.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs },
  infoLabel: { fontSize: typography.fontSize.sm, flex: 1 },
  infoValue: { fontSize: typography.fontSize.sm, fontWeight: '600', flex: 2, textAlign: 'right' },
  status: { fontSize: typography.fontSize.sm },
});
