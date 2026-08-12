package com.quilore.coach;

import com.quilore.ai.AiGatewayClient;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class CoachService {
    private final AiGatewayClient aiGatewayClient;
    public CoachService(AiGatewayClient aiGatewayClient) { this.aiGatewayClient = aiGatewayClient; }
    public Map<String, Object> chat(UUID userId, String prompt, boolean escalate) {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("prompt", prompt);
        input.put("escalate", escalate);
        return aiGatewayClient.coachChat(input);
    }
    public Map<String, Object> generateProgram(UUID userId, String prompt, String idempotencyKey) {
        Map<String, Object> queued = aiGatewayClient.enqueueProgram(Map.of("prompt", prompt), idempotencyKey);
        Map<String, Object> draft = aiGatewayClient.coachChat(Map.of("prompt", "Draft program: " + prompt, "escalate", true));
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", userId.toString());
        response.put("queued", queued);
        response.put("draft", draft);
        response.put("editable", true);
        response.put("userConfirmationRequired", true);
        return response;
    }
}
