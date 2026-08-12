package com.quilore.ai;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiGatewayClient {

    private final WebClient webClient;
    private final AiGatewayProperties properties;
    private final AiEnvelopeValidator validator;

    public AiGatewayClient(WebClient aiServiceWebClient, AiGatewayProperties properties, AiEnvelopeValidator validator) {
        this.webClient = aiServiceWebClient;
        this.properties = properties;
        this.validator = validator;
    }

    public Map<String, Object> coachChat(Map<String, Object> input) {
        return invokeTask("chat", input);
    }

    public Map<String, Object> enqueueProgram(Map<String, Object> payload, String idempotencyKey) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("task_type", "program_generation");
        body.put("payload", payload == null ? Map.of() : payload);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            body.put("idempotency_key", idempotencyKey);
        }
        return postJson("/ai/queue/jobs", body);
    }

    public Map<String, Object> foodQuality(List<String> dishes, String notes) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("dishes", dishes == null ? List.of() : dishes);
        if (notes != null) {
            body.put("notes", notes);
        }
        Map<String, Object> result = postJson("/ai/nutrition/food-quality", body);
        result.putIfAbsent("editable", true);
        result.putIfAbsent("user_confirmation_required", true);
        return result;
    }

    public Map<String, Object> ocrMapToSchema(String text, String source) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", text);
        body.put("source", source == null ? "on_device_ocr" : source);
        return postJson("/ai/ocr/map-to-schema", body);
    }

    public Map<String, Object> invokeTask(String task, Map<String, Object> input) {
        Map<String, Object> body = Map.of("input", input == null ? Map.of() : input);
        try {
            Map<String, Object> envelope = webClient.post()
                    .uri("/ai/tasks/{task}/invoke", task)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofMillis(properties.readTimeoutMs()));
            return validator.validate(envelope);
        } catch (Exception ex) {
            return validator.degradedUnavailable(task, ex.getClass().getSimpleName());
        }
    }

    private Map<String, Object> postJson(String path, Map<String, Object> body) {
        try {
            return webClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofMillis(properties.readTimeoutMs()));
        } catch (Exception ex) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("degraded", true);
            fallback.put("editable", true);
            fallback.put("user_confirmation_required", true);
            fallback.put("message", "AI service unavailable — " + ex.getClass().getSimpleName());
            return fallback;
        }
    }
}
