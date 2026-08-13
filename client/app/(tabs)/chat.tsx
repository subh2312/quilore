import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ConfirmationChatCard, ConfirmItem } from "@/components/quilore/ConfirmationChatCard";
import { palette, radii, semantic, spacing, typography, touchTarget } from "@/constants/DesignTokens";
import { sendCoachChat } from "@/lib/api/coach";
import { track } from "@/lib/analytics";
import { isFlagEnabled, DEFAULT_FLAGS } from "@/lib/featureFlags";
import { looksLikeMealLog, parseMealLogItems } from "@/lib/nutrition/parseMealLog";

type Msg = { id: string; role: "user" | "coach"; text: string; ai?: boolean };

export default function ChatScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "1",
      role: "coach",
      ai: true,
      text: "Ask for supersets, plan tweaks, or log a meal (e.g. “Log paratha and alu bhaji for breakfast”). I’ll reply with an editable draft.",
    },
  ]);
  const [foodItems, setFoodItems] = useState<ConfirmItem[]>([]);
  const [foodPrompt, setFoodPrompt] = useState<string | null>(null);
  const coachingOn = isFlagEnabled(DEFAULT_FLAGS, "advanced_coaching");

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setNotice(null);
    track("chat_message_sent", { length: userMsg.text.length });

    const mealItems = looksLikeMealLog(userText) ? parseMealLogItems(userText) : [];
    if (mealItems.length > 0) {
      setFoodItems(mealItems);
      setFoodPrompt(`Confirm these dishes from your message: ${mealItems.map((i) => i.label).join(", ")}`);
    } else {
      setFoodItems([]);
      setFoodPrompt(null);
    }

    // Always produce a coach bubble — sendCoachChat never throws empty-handed.
    const res = await sendCoachChat({ message: userMsg.text });
    if (res.degraded && res.message) {
      setNotice(res.message);
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        role: "coach",
        ai: true,
        text: res.reply?.trim() || "Draft coaching note — edit before applying.",
      },
    ]);
    setLoading(false);
    scrollToEnd();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.title}>Coach Chat</Text>
        <Text style={styles.subtitle}>{coachingOn ? "Advanced coaching enabled" : "Coaching limited by flag"}</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.user : styles.coach]}>
            {m.ai ? <Text style={styles.ai}>AI observation — editable</Text> : null}
            <Text style={m.role === "user" ? styles.userBubbleText : styles.bubbleText}>{m.text}</Text>
          </View>
        ))}
        {loading ? (
          <View style={[styles.bubble, styles.coach]}>
            <Text style={styles.ai}>Coach</Text>
            <Text style={styles.bubbleText}>Thinking…</Text>
          </View>
        ) : null}
        {foodPrompt && foodItems.length > 0 ? (
          <ConfirmationChatCard
            prompt={foodPrompt}
            items={foodItems}
            onToggle={(id) =>
              setFoodItems((prev) => prev.map((i) => (i.id === id ? { ...i, confirmed: !i.confirmed } : i)))
            }
            onConfirmAll={() => {
              const confirmed = foodItems.filter((i) => i.confirmed).map((i) => i.label);
              setMessages((prev) => [
                ...prev,
                {
                  id: `confirm_${Date.now()}`,
                  role: "coach",
                  ai: true,
                  text: `Confirmed: ${confirmed.join(", ") || "nothing"} — open Nutrition to adjust portions before macros save.`,
                },
              ]);
              scrollToEnd();
            }}
          />
        ) : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Log paratha and alu bhaji"
          placeholderTextColor={semantic.inputPlaceholder}
          value={input}
          onChangeText={setInput}
          editable={!loading}
          onSubmitEditing={send}
          returnKeyType="send"
          onFocus={scrollToEnd}
        />
        <Pressable style={[styles.send, loading && styles.sendDisabled]} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.sendText}>Send</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.surface },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 24 },
  title: { fontSize: typography.fontSize.xl, fontWeight: "700", color: semantic.textPrimary },
  subtitle: { fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing.sm },
  notice: { color: semantic.textSecondary, fontSize: typography.fontSize.sm },
  bubble: { padding: spacing.md, borderRadius: radii.lg, maxWidth: "92%" },
  user: { alignSelf: "flex-end", backgroundColor: palette.emerald },
  coach: { alignSelf: "flex-start", backgroundColor: palette.gray100 },
  ai: { fontSize: typography.fontSize.xs, color: palette.emeraldDark, fontWeight: "700", marginBottom: 4 },
  bubbleText: { color: semantic.textPrimary, fontSize: typography.fontSize.md },
  userBubbleText: { color: semantic.textOnUserBubble, fontSize: typography.fontSize.md },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: semantic.surface,
  },
  input: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    color: semantic.inputText,
    backgroundColor: semantic.inputBg,
  },
  send: {
    minWidth: 72,
    minHeight: touchTarget.minHeight,
    backgroundColor: palette.emerald,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.6 },
  sendText: { color: semantic.textOnPrimary, fontWeight: "700" },
});
