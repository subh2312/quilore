import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, Switch, View } from "react-native";
import { Link } from "expo-router";
import { palette, radii, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { fetchMe, isSupportOrAdmin } from "@/lib/api/auth";
import { fetchEntitlements, mockPurchase, mockRestorePurchases } from "@/lib/api/billing";
import { setAnalyticsConsent, track } from "@/lib/analytics";
import { setCrashReportingEnabled } from "@/lib/crashReporting";

const GOALS = ["fat_loss", "recomp", "muscle_gain", "maintain", "performance"] as const;

export default function ProfileScreen() {
  const [primaryGoal, setPrimaryGoal] = useState<(typeof GOALS)[number]>("recomp");
  const [analytics, setAnalytics] = useState(false);
  const [crash, setCrash] = useState(true);
  const [privacyNotifs, setPrivacyNotifs] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [plan, setPlan] = useState<"FREE" | "PREMIUM">("FREE");
  const [status, setStatus] = useState<string | null>(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchMe();
        setCanAdmin(isSupportOrAdmin(me.role));
        const ent = await fetchEntitlements(me.id);
        if (ent?.plan) setPlan(ent.plan === "PREMIUM" ? "PREMIUM" : "FREE");
      } catch {
        /* not logged in */
      }
    })();
  }, []);

  function saveGoal() {
    track("goal_set", { primaryGoal });
    setStatus(`Goal saved: ${primaryGoal} (versioned; triggers target recalculation).`);
  }

  async function purchase() {
    setBillingBusy(true);
    try {
      const ent = await mockPurchase("premium_monthly");
      setPlan(ent.plan === "PREMIUM" ? "PREMIUM" : "FREE");
      track("subscription_started", { productId: "premium_monthly" });
      setStatus("Subscription activated via mock IAP (UAT receipt).");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBillingBusy(false);
    }
  }

  async function restore() {
    setBillingBusy(true);
    try {
      const ent = await mockRestorePurchases();
      setPlan(ent.plan === "PREMIUM" ? "PREMIUM" : "FREE");
      track("subscription_restored", { productId: "premium_monthly" });
      setStatus("Purchases restored.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBillingBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Goals, consent, privacy, billing, reminders</Text>
      <Link href="/onboarding/consent" style={styles.link}>Open consent & disclaimer onboarding</Link>
      {canAdmin ? (
        <Link href="/admin/food-aliases" style={styles.link}>Open admin food aliases</Link>
      ) : null}
      <Text style={styles.section}>Primary goal</Text>
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <Pressable key={g} style={[styles.chip, primaryGoal === g && styles.chipOn]} onPress={() => setPrimaryGoal(g)}>
            <Text style={styles.chipText}>{g.replace("_", " ")}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.primary} onPress={saveGoal}><Text style={styles.primaryText}>Save goal & coaching prefs</Text></Pressable>
      <Text style={styles.section}>Privacy preferences</Text>
      <Row label="Analytics opt-in" value={analytics} onChange={(v) => { setAnalytics(v); setAnalyticsConsent(v); }} />
      <Row label="Crash reporting" value={crash} onChange={(v) => { setCrash(v); setCrashReportingEnabled(v); }} />
      <Row label="Privacy-safe notifications" value={privacyNotifs} onChange={setPrivacyNotifs} />
      <Row label="Workout reminders" value={workoutReminders} onChange={setWorkoutReminders} />
      <Text style={styles.section}>Subscription · {plan}</Text>
      <Pressable style={[styles.primary, billingBusy && { opacity: 0.6 }]} onPress={purchase} disabled={billingBusy}>
        <Text style={styles.primaryText}>Start Premium</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={restore}><Text style={styles.secondaryText}>Restore purchases</Text></Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  link: { color: palette.blue, fontWeight: "600" },
  section: { fontWeight: "700", color: palette.gray800, marginTop: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: touchTarget.minHeight, paddingHorizontal: spacing.md, borderRadius: radii.full, backgroundColor: palette.gray200, justifyContent: "center" },
  chipOn: { backgroundColor: palette.emeraldLight },
  chipText: { fontWeight: "700", color: palette.gray800, textTransform: "capitalize" },
  primary: { minHeight: touchTarget.minHeight, backgroundColor: palette.emerald, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  primaryText: { color: palette.white, fontWeight: "700" },
  secondary: { minHeight: touchTarget.minHeight, borderRadius: radii.md, borderWidth: 1, borderColor: palette.emerald, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: palette.emeraldDark, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: palette.gray800, fontSize: typography.fontSize.md },
  status: { color: palette.gray700, fontSize: typography.fontSize.sm },
});
