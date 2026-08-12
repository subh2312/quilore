package com.quilore.workout;

import com.quilore.ai.AiGatewayClient;
import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workout")
public class WorkoutController {

    private final AiGatewayClient aiGatewayClient;
    private final WorkoutSessionService sessionService;
    private final SessionSummaryService sessionSummaryService;

    public WorkoutController(
            AiGatewayClient aiGatewayClient,
            WorkoutSessionService sessionService,
            SessionSummaryService sessionSummaryService
    ) {
        this.aiGatewayClient = aiGatewayClient;
        this.sessionService = sessionService;
        this.sessionSummaryService = sessionSummaryService;
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
        String text = body.getOrDefault("text", "");
        String source = body.getOrDefault("source", "on_device_ocr");
        Map<String, Object> mapped = aiGatewayClient.ocrMapToSchema(text, source);
        return ResponseEntity.ok(flattenOcrResponse(userId, text, mapped));
    }

    @PostMapping("/{userId}/session-summary")
    public ResponseEntity<?> sessionSummary(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        CurrentUser.requireSelfOrAdmin(userId);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> exercises = (List<Map<String, Object>>) body.getOrDefault("exercises", List.of());
        long duration = body.get("durationMinutes") instanceof Number n ? n.longValue() : 0L;
        String startedAt = String.valueOf(body.getOrDefault("startedAt", ""));
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
        long duration = body.get("durationMinutes") instanceof Number n ? n.longValue() : 0L;
        return ResponseEntity.ok(sessionService.completeSession(userId, sessionId, duration));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable UUID sessionId) {
        UUID userId = CurrentUser.requireUserId();
        return ResponseEntity.ok(sessionService.getSession(userId, sessionId));
    }

    private Map<String, Object> flattenOcrResponse(UUID userId, String text, Map<String, Object> mapped) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> exercises = (List<Map<String, Object>>) mapped.getOrDefault("exercises", List.of());
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
}
