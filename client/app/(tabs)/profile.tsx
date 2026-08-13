import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { fetchMe, isSupportOrAdmin } from '@/lib/api/auth';
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
        if (goal.coachingTone && (TONES as readonly string[]).includes(goal.coachingTone)) {
          setCoachingTone(goal.coachingTone as (typeof TONES)[number]);
        }
        if (goal.secondaryPrefs?.length) setSecondaryPrefs(goal.secondaryPrefs);
      } catch (err) {
        if (active) setStatus(err instanceof Error ? err.message : 'Could not load profile.');
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
        schedulePrefs: { daysPerWeek: 4 },
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
    try {
      const ent = await mockPurchase('premium_monthly');
      setPlan(ent.plan === 'PREMIUM' ? 'PREMIUM' : 'FREE');
      track('subscription_started', { productId: 'premium_monthly' });
      setStatus('Subscription activated via mock IAP (UAT receipt).');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBillingBusy(false);
    }
  }

  async function restore() {
    setBillingBusy(true);
    try {
      const ent = await mockRestorePurchases();
      setPlan(ent.plan === 'PREMIUM' ? 'PREMIUM' : 'FREE');
      track('subscription_restored', { productId: 'premium_monthly' });
      setStatus('Purchases restored.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Restore failed');
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
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Sign in to view your profile.</Text>
      </View>
    );
  }

  if (profileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.emerald} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account, baseline, goals, privacy, and billing</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Account</Text>
        <InfoRow label="Name" value={user.displayName || '—'} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="User ID" value={user.id} />
        <InfoRow label="Role" value={user.role} />
        <InfoRow label="Plan" value={plan} />
      </View>

      <Link href="/onboarding/welcome" style={styles.link}>
        Re-run onboarding & preferences
      </Link>
      {canAdmin ? (
        <Link href="/admin/food-aliases" style={styles.link}>
          Admin · food alias review
        </Link>
      ) : null}

      <Text style={styles.section}>Baseline (editable)</Text>
      <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Text style={styles.label}>Sex</Text>
      <ChipRow options={SEX_OPTIONS} value={sex} onChange={setSex} />
      <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
      <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
      <Text style={styles.label}>Training experience</Text>
      <ChipRow options={EXPERIENCE} value={trainingExperience} onChange={setTrainingExperience} />
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
      {injuriesDisclaimer ? <Text style={styles.disclaimer}>{injuriesDisclaimer}</Text> : null}
      <Field
        label="Equipment access"
        value={equipmentAccess}
        onChangeText={setEquipmentAccess}
        placeholder="e.g. home dumbbells, full gym"
      />

      <Text style={styles.section}>Goals & coaching</Text>
      <Text style={styles.label}>Primary goal</Text>
      <ChipRow options={GOALS} value={primaryGoal} onChange={setPrimaryGoal} />
      <Text style={styles.label}>Coaching tone</Text>
      <ChipRow options={TONES} value={coachingTone} onChange={setCoachingTone} />
      <Text style={styles.label}>Secondary preferences (optional)</Text>
      <View style={styles.wrap}>
        {SECONDARY.map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, secondaryPrefs.includes(s) && styles.chipOn]}
            onPress={() => toggleSecondary(s)}>
            <Text style={styles.chipText}>{s.replace('_', ' ')}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.primary, (!baselineValid || saving) && styles.disabled]}
        onPress={saveProfile}
        disabled={!baselineValid || saving}>
        <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save profile & coaching prefs'}</Text>
      </Pressable>

      <Text style={styles.section}>Privacy preferences</Text>
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

      <Text style={styles.section}>Subscription · {plan}</Text>
      <Pressable style={[styles.primary, billingBusy && styles.disabled]} onPress={purchase} disabled={billingBusy}>
        <Text style={styles.primaryText}>{billingBusy ? 'Processing…' : 'Start Premium'}</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={restore} disabled={billingBusy}>
        <Text style={styles.secondaryText}>Restore purchases</Text>
      </Pressable>

      <Pressable style={styles.logout} onPress={handleLogout} accessibilityRole="button">
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={palette.gray400}
        multiline={multiline}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[styles.chip, value === opt && styles.chipOn]}
          onPress={() => onChange(opt)}>
          <Text style={styles.chipText}>{opt.replace('_', ' ')}</Text>
        </Pressable>
      ))}
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
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  loadingText: { color: palette.gray600, fontSize: typography.fontSize.md },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  card: {
    backgroundColor: palette.gray50,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  link: { color: palette.blue, fontWeight: '600' },
  section: { fontWeight: '700', color: palette.gray800, marginTop: spacing.sm },
  label: { fontWeight: '700', color: palette.gray800 },
  field: { gap: spacing.xs },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: palette.gray300,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
    fontSize: typography.fontSize.md,
    color: palette.gray900,
  },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: palette.gray200,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: palette.emeraldLight },
  chipText: { fontWeight: '700', color: palette.gray800, textTransform: 'capitalize' },
  disclaimer: { color: palette.amber, fontSize: typography.fontSize.sm, fontWeight: '600' },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: palette.white, fontWeight: '700' },
  secondary: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: palette.emeraldDark, fontWeight: '700' },
  logout: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    backgroundColor: palette.gray800,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { color: palette.white, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: palette.gray800, fontSize: typography.fontSize.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs },
  infoLabel: { color: palette.gray500, fontSize: typography.fontSize.sm, flex: 1 },
  infoValue: { color: palette.gray900, fontSize: typography.fontSize.sm, fontWeight: '600', flex: 2, textAlign: 'right' },
  status: { color: palette.gray700, fontSize: typography.fontSize.sm },
});
