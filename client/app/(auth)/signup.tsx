import { useState } from 'react';
import { Link, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthScreenLayout } from '@/components/quilore/AuthScreenLayout';
import { radii, spacing, typography, touchTarget } from '@/constants/DesignTokens';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useMarkObserveInteractive } from '@/hooks/useMarkObserveInteractive';

export default function SignUpScreen() {
  useMarkObserveInteractive();
  const c = useThemeColors();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
      router.replace('/onboarding/welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: c.textPrimary }]}>Create your account</Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        Start with coaching estimates you can always edit.
      </Text>

      <Text style={[styles.label, { color: c.textPrimary }]}>Display name</Text>
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText }]}
        autoComplete="name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        placeholderTextColor={c.inputPlaceholder}
      />

      <Text style={[styles.label, { color: c.textPrimary }]}>Email</Text>
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText }]}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={c.inputPlaceholder}
      />

      <Text style={[styles.label, { color: c.textPrimary }]}>Password</Text>
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText }]}
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        placeholderTextColor={c.inputPlaceholder}
      />

      {error ? <Text style={[styles.error, { color: c.textDanger }]}>{error}</Text> : null}

      <Pressable
        style={[styles.primary, { backgroundColor: c.primary }, busy && styles.disabled]}
        disabled={busy || !email || !password || !displayName}
        onPress={submit}
        accessibilityRole="button">
        {busy ? (
          <ActivityIndicator color={c.textOnPrimary} />
        ) : (
          <Text style={[styles.primaryText, { color: c.textOnPrimary }]}>Sign up</Text>
        )}
      </Pressable>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.textMuted }]}>Already have an account?</Text>
        <Link href="/(auth)/login" style={[styles.link, { color: c.textSuccess }]}>
          Sign in
        </Link>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.fontSize.xl, fontWeight: '800' },
  subtitle: { fontSize: typography.fontSize.md, marginBottom: spacing.sm },
  label: { fontWeight: '700', marginTop: spacing.sm },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
  },
  primary: {
    marginTop: spacing.md,
    minHeight: touchTarget.minHeight + 4,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontWeight: '800', fontSize: typography.fontSize.md },
  disabled: { opacity: 0.6 },
  error: { fontWeight: '600' },
  footer: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.lg },
  footerText: {},
  link: { fontWeight: '800' },
});
