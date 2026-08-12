package com.quilore.ai;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Component
public class AiEnvelopeValidator {

    private static final Set<String> REQUIRED = Set.of(
            "task", "provider", "fallback_used", "degraded", "content",
            "confidence", "message", "editable", "user_confirmation_required"
    );

    public Map<String, Object> validate(Map<String, Object> envelope) {
        if (envelope == null || envelope.isEmpty()) {
            throw new IllegalArgumentException("AI envelope missing");
        }
        for (String key : REQUIRED) {
            if (!envelope.containsKey(key)) {
                throw new IllegalArgumentException("AI envelope missing field: " + key);
            }
        }
        if (!Boolean.TRUE.equals(envelope.get("editable"))
                || !Boolean.TRUE.equals(envelope.get("user_confirmation_required"))) {
            throw new IllegalArgumentException("AI output must remain user-editable and require confirmation");
        }
        return envelope;
    }

    public Map<String, Object> degradedUnavailable(String task, String reason) {
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("status", "unavailable");
        content.put("reason", reason);
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("task", task);
        envelope.put("provider", null);
        envelope.put("fallback_used", false);
        envelope.put("degraded", true);
        envelope.put("content", content);
        envelope.put("confidence", null);
        envelope.put("message", "AI service unavailable — " + reason);
        envelope.put("editable", true);
        envelope.put("user_confirmation_required", true);
        return envelope;
    }
}
