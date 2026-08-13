import { useState } from 'react';
import { Link, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthScreenLayout } from '@/components/quilore/AuthScreenLayout';
import { palette, radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useAuth } from '@/context/AuthContext';
import { useMarkObserveInteractive } from '@/hooks/useMarkObserveInteractive';

export default function LoginScreen() {
  useMarkObserveInteractive();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const complete = await signIn(email.trim(), password);
      router.replace(complete ? '/(tabs)' : '/onboarding/welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue coaching and nutrition tracking.</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={palette.gray400}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={palette.gray400}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.primary, busy && styles.disabled]}
        disabled={busy || !email || !password}
        onPress={submit}
        accessibilityRole="button">
        {busy ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryText}>Sign in</Text>}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Quilore?</Text>
        <Link href="/(auth)/signup" style={styles.link}>
          Create account
        </Link>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.fontSize.xl, fontWeight: '800', color: palette.gray900 },
  subtitle: { color: palette.gray600, fontSize: typography.fontSize.md, marginBottom: spacing.sm },
  label: { fontWeight: '700', color: palette.gray800, marginTop: spacing.sm },
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
  primary: {
    marginTop: spacing.md,
    minHeight: touchTarget.minHeight + 4,
    backgroundColor: palette.emerald,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: palette.white, fontWeight: '800', fontSize: typography.fontSize.md },
  disabled: { opacity: 0.6 },
  error: { color: palette.red, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: palette.gray600 },
  link: { color: palette.emeraldDark, fontWeight: '800' },
});
