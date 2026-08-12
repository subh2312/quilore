package com.quilore.workout;

import com.quilore.ai.AiGatewayClient;
import com.quilore.billing.EntitlementService;
import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workout")
public class WorkoutController {
    private static final String AI_MEAL_SCAN_QUOTA = "ai_meal_scan";

    private final AiGatewayClient aiGatewayClient;
    private final WorkoutSessionService sessionService;
    private final SessionSummaryService sessionSummaryService;
    private final EntitlementService entitlementService;

    public WorkoutController(
            AiGatewayClient aiGatewayClient,
            WorkoutSessionService sessionService,
            SessionSummaryService sessionSummaryService,
            EntitlementService entitlementService
    ) {
        this.aiGatewayClient = aiGatewayClient;
        this.sessionService = sessionService;
        this.sessionSummaryService = sessionSummaryService;
        this.entitlementService = entitlementService;
    }

    @PostMapping("/ocr-map")
    public ResponseEntity<?> ocrMap(@RequestBody Map<String, String> body) {
        UUID userId = CurrentUser.requireUserId();
        return ocrMapForUser(userId, body);
    }

    @PostMapping("/{userId}/ocr-map")
    public ResponseEntity<?> ocrMapForPathUser(@PathVariable UUID userId, @RequestBody Map<String, String> body) {
        CurrentUser.requireSelfOrAdmin(userId);
        return ocrMapForUser(userId, body);
    }

    private ResponseEntity<?> ocrMapForUser(UUID userId, Map<String, String> body) {
        ResponseEntity<Map<String, Object>> limited = consumeQuotaOr429(userId, "ocr-map");
        if (limited != null) {
            return limited;
        }
        String text = body.getOrDefault("text", "");
        String source = body.getOrDefault("source", "on_device_ocr");
        Map<String, Object> mapped = aiGatewayClient.ocrMapToSchema(text, source);
        return ResponseEntity.ok(flattenOcrResponse(userId, text, mapped));
    }

    @PostMapping("/{userId}/session-summary")
    public ResponseEntity<?> sessionSummary(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        CurrentUser.requireSelfOrAdmin(userId);
        List<Map<String, Object>> exercises = requireObjectList(body.get("exercises"), "exercises");
        long duration = readLong(body.get("durationMinutes"), "durationMinutes");
        String startedAt = readString(body.get("startedAt"), "startedAt", true);
        return ResponseEntity.ok(sessionSummaryService.summarize(userId, exercises, duration, startedAt));
    }

    @PostMapping("/sessions")
    public ResponseEntity<?> startSession(@RequestBody Map<String, String> body) {
        UUID userId = CurrentUser.requireUserId();
        return ResponseEntity.ok(sessionService.startSession(userId, body.get("notes")));
    }

    @PostMapping("/sessions/{sessionId}/sets")
    public ResponseEntity<?> addSet(
            @PathVariable UUID sessionId,
            @RequestBody Map<String, Object> body
    ) {
        UUID userId = CurrentUser.requireUserId();
        return ResponseEntity.ok(sessionService.addSet(userId, sessionId, body));
    }

    @PostMapping("/sessions/{sessionId}/complete")
    public ResponseEntity<?> completeSession(
            @PathVariable UUID sessionId,
            @RequestBody Map<String, Object> body
    ) {
        UUID userId = CurrentUser.requireUserId();
        long duration = readLong(body.get("durationMinutes"), "durationMinutes");
        return ResponseEntity.ok(sessionService.completeSession(userId, sessionId, duration));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable UUID sessionId) {
        UUID userId = CurrentUser.requireUserId();
        return ResponseEntity.ok(sessionService.getSession(userId, sessionId));
    }

    private Map<String, Object> flattenOcrResponse(UUID userId, String text, Map<String, Object> mapped) {
        List<Map<String, Object>> exercises = requireObjectList(mapped.get("exercises"), "exercises");
        return Map.of(
                "userId", userId.toString(),
                "exercises", exercises,
                "rawText", text,
                "editable", mapped.getOrDefault("editable", true),
                "provider", mapped.getOrDefault("source", "ai-gateway"),
                "envelope", mapped,
                "userConfirmationRequired", true
        );
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> requireObjectList(Object value, String field) {
        if (value == null) {
            return List.of();
        }
        if (!(value instanceof List<?> rawList)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an array of objects");
        }
        for (Object item : rawList) {
            if (!(item instanceof Map<?, ?>)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an array of objects");
            }
        }
        return (List<Map<String, Object>>) (List<?>) rawList;
    }

    private long readLong(Object value, String field) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be numeric");
    }

    private String readString(Object value, String field, boolean allowNull) {
        if (value == null && allowNull) {
            return "";
        }
        if (value instanceof String stringValue) {
            return stringValue;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a string");
    }

    private ResponseEntity<Map<String, Object>> consumeQuotaOr429(UUID userId, String task) {
        try {
            entitlementService.consumeQuota(userId, AI_MEAL_SCAN_QUOTA);
            return null;
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode() != HttpStatus.TOO_MANY_REQUESTS) {
                throw ex;
            }
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "userId", userId.toString(),
                    "task", task,
                    "editable", true,
                    "degraded", true,
                    "userConfirmationRequired", true,
                    "message", "AI scan quota exceeded for this billing period. Please wait for reset or upgrade your plan."));
        }
    }
}
