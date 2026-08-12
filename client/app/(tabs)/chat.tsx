import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ConfirmationChatCard, ConfirmItem } from "@/components/quilore/ConfirmationChatCard";
import { palette, radii, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { sendCoachChat } from "@/lib/api/coach";
import { track } from "@/lib/analytics";
import { isFlagEnabled, DEFAULT_FLAGS } from "@/lib/featureFlags";

type Msg = { id: string; role: "user" | "coach"; text: string; ai?: boolean };

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { id: "1", role: "coach", ai: true, text: "Ask for supersets, plan tweaks, or program ideas. AI suggestions stay editable." },
  ]);
  const [foodItems, setFoodItems] = useState<ConfirmItem[]>([
    { id: "dalma", label: "Dalma", confirmed: true },
    { id: "rice", label: "Rice", confirmed: true },
    { id: "bhindi", label: "Bhindi sabzi", confirmed: false },
  ]);
  const coachingOn = isFlagEnabled(DEFAULT_FLAGS, "advanced_coaching");

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { id: String(Date.now()), role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);
    track("chat_message_sent", { length: userMsg.text.length });
    try {
      const res = await sendCoachChat({ message: userMsg.text });
      setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: "coach", ai: res.aiObservation, text: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coach chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Coach Chat</Text>
        <Text style={styles.subtitle}>{coachingOn ? "Advanced coaching enabled" : "Coaching limited by flag"}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.user : styles.coach]}>
            {m.ai ? <Text style={styles.ai}>AI observation</Text> : null}
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        ))}
        <ConfirmationChatCard
          prompt="I see dalma, rice, and bhindi sabzi — is this right?"
          items={foodItems}
          onToggle={(id) => setFoodItems((prev) => prev.map((i) => (i.id === id ? { ...i, confirmed: !i.confirmed } : i)))}
          onConfirmAll={() =>
            setMessages((prev) => [...prev, { id: String(Date.now()), role: "coach", ai: true, text: "Food list confirmed — still editable in Nutrition before macros save." }])
          }
        />
      </ScrollView>
      <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="e.g. Add a superset for chest day" value={input} onChangeText={setInput} editable={!loading} />
        <Pressable style={[styles.send, loading && styles.sendDisabled]} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.sendText}>Send</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 24 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: palette.gray900 },
  subtitle: { fontSize: typography.fontSize.sm, color: palette.gray500, marginBottom: spacing.sm },
  error: { color: palette.red, fontSize: typography.fontSize.sm },
  bubble: { padding: spacing.md, borderRadius: radii.lg, maxWidth: "92%" },
  user: { alignSelf: "flex-end", backgroundColor: palette.emerald },
  coach: { alignSelf: "flex-start", backgroundColor: palette.gray100 },
  ai: { fontSize: typography.fontSize.xs, color: palette.emeraldDark, fontWeight: "700", marginBottom: 4 },
  bubbleText: { color: palette.gray900, fontSize: typography.fontSize.md },
  composer: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: palette.gray200 },
  input: { flex: 1, minHeight: touchTarget.minHeight, borderWidth: 1, borderColor: palette.gray200, borderRadius: radii.md, paddingHorizontal: spacing.sm },
  send: { minWidth: 72, minHeight: touchTarget.minHeight, backgroundColor: palette.emerald, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.6 },
  sendText: { color: palette.white, fontWeight: "700" },
});
