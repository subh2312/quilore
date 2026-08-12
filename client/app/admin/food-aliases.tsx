import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { palette, radii, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { listFoodAliases, submitFoodAlias } from "@/lib/api/admin";
import type { FoodAlias } from "@/lib/api/types";

export default function FoodAliasesAdminScreen() {
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Food alias queue</Text>
      <Text style={styles.sub}>Support/Admin — IFCT mapping proposals (editable).</Text>
      {loading ? <ActivityIndicator /> : null}
      {rows.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={styles.alias}>{r.alias}</Text>
          <Text style={styles.meta}>{r.foodCode ?? "—"} · {r.status ?? "pending"}</Text>
        </View>
      ))}
      <TextInput style={styles.input} placeholder="Alias" value={alias} onChangeText={setAlias} />
      <TextInput style={styles.input} placeholder="IFCT food code" value={foodCode} onChangeText={setFoodCode} />
      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Submit alias</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700" },
  sub: { color: palette.gray500, marginBottom: spacing.md },
  row: { padding: spacing.sm, backgroundColor: palette.gray100, borderRadius: radii.md },
  alias: { fontWeight: "700" },
  meta: { color: palette.gray600, fontSize: typography.fontSize.sm },
  input: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  btn: {
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: palette.white, fontWeight: "700" },
  status: { color: palette.emeraldDark },
});
