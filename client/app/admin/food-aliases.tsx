import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { radii, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { useThemeColors } from "@/hooks/useTheme";
import { listFoodAliases, submitFoodAlias } from "@/lib/api/admin";
import type { FoodAlias } from "@/lib/api/types";

export default function FoodAliasesAdminScreen() {
  const c = useThemeColors();
  const [rows, setRows] = useState<FoodAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [alias, setAlias] = useState("");
  const [foodCode, setFoodCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await listFoodAliases());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    setStatus(null);
    try {
      await submitFoodAlias(alias.trim(), foodCode.trim());
      setRows(await listFoodAliases());
      setStatus("Alias submitted for review.");
      setAlias("");
      setFoodCode("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Submit failed");
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: c.surface }}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Food alias queue</Text>
      <Text style={[styles.sub, { color: c.textMuted }]}>
        Support/Admin — IFCT mapping proposals (editable).
      </Text>
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      {rows.map((r) => (
        <View key={r.id} style={[styles.row, { backgroundColor: c.surfaceMuted }]}>
          <Text style={[styles.alias, { color: c.textPrimary }]}>{r.alias}</Text>
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            {r.foodCode ?? "—"} · {r.status ?? "pending"}
          </Text>
        </View>
      ))}
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText }]}
        placeholder="Alias"
        placeholderTextColor={c.inputPlaceholder}
        value={alias}
        onChangeText={setAlias}
      />
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.inputBg, color: c.inputText }]}
        placeholder="IFCT food code"
        placeholderTextColor={c.inputPlaceholder}
        value={foodCode}
        onChangeText={setFoodCode}
      />
      <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={submit}>
        <Text style={[styles.btnText, { color: c.textOnPrimary }]}>Submit alias</Text>
      </Pressable>
      {status ? <Text style={[styles.status, { color: c.textSuccess }]}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700" },
  sub: { marginBottom: spacing.md },
  row: { padding: spacing.sm, borderRadius: radii.md },
  alias: { fontWeight: "700" },
  meta: { fontSize: typography.fontSize.sm },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  btn: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "700" },
  status: {},
});
