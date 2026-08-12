import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { enqueueFoodAlias, listFoodAliases } from '@/lib/api/admin';
import { fetchMe, isSupportOrAdmin } from '@/lib/api/auth';
import type { FoodAliasReview } from '@/lib/api/types';

export default function FoodAliasesAdminScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<FoodAliasReview[]>([]);
  const [active, setActive] = useState<Record<string, string>>({});
  const [rawName, setRawName] = useState('');
  const [candidateCode, setCandidateCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setRole(me.role);
      if (!isSupportOrAdmin(me.role)) return;
      const data = await listFoodAliases();
      setPending(data.pending);
      setActive(data.activeMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
      setRole('USER');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await fetchMe();
        if (!active) return;
        setRole(me.role);
        if (!isSupportOrAdmin(me.role)) return;
        const data = await listFoodAliases();
        if (!active) return;
        setPending(data.pending);
        setActive(data.activeMappings);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
        setRole('USER');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function submitAlias() {
    if (!rawName.trim() || !candidateCode.trim()) return;
    try {
      await enqueueFoodAlias(rawName.trim(), candidateCode.trim());
      setRawName('');
      setCandidateCode('');
      setStatus('Alias queued for review.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enqueue failed');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.emerald} />
      </View>
    );
  }

  if (!role || !isSupportOrAdmin(role)) {
    return <Redirect href="/profile" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Food alias review</Text>
      <Text style={styles.subtitle}>SUPPORT / ADMIN · maps regional names to IFCT codes</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.section}>Pending queue</Text>
      {pending.length === 0 ? (
        <Text style={styles.hint}>No pending aliases.</Text>
      ) : (
        pending.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.rawName}</Text>
            <Text style={styles.cardMeta}>→ {a.candidateCode || '—'} · {a.status}</Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Active mappings</Text>
      {Object.entries(active).map(([name, code]) => (
        <Text key={name} style={styles.mapping}>
          {name} → {code}
        </Text>
      ))}

      <Text style={styles.section}>Enqueue alias</Text>
      <TextInput
        style={styles.input}
        placeholder="Raw name (e.g. dalma)"
        value={rawName}
        onChangeText={setRawName}
      />
      <TextInput
        style={styles.input}
        placeholder="IFCT candidate code"
        value={candidateCode}
        onChangeText={setCandidateCode}
      />
      <Pressable style={styles.primary} onPress={submitAlias}>
        <Text style={styles.primaryText}>Submit for review</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 48 },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500 },
  section: { fontWeight: '700', color: palette.gray800, marginTop: spacing.md },
  hint: { color: palette.gray500, fontSize: typography.fontSize.sm },
  card: {
    backgroundColor: palette.gray50,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  cardTitle: { fontWeight: '700', color: palette.gray900 },
  cardMeta: { color: palette.gray600, fontSize: typography.fontSize.sm },
  mapping: { color: palette.gray700, fontSize: typography.fontSize.sm },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
  },
  primary: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: { color: palette.white, fontWeight: '700' },
  error: { color: palette.red },
  status: { color: palette.emeraldDark, fontSize: typography.fontSize.sm },
});
