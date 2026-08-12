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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workout")
public class WorkoutController {

    private final AiGatewayClient aiGatewayClient;
    private final WorkoutSessionService sessionService;

    public WorkoutController(AiGatewayClient aiGatewayClient, WorkoutSessionService sessionService) {
        this.aiGatewayClient = aiGatewayClient;
        this.sessionService = sessionService;
    }

    @PostMapping("/ocr-map")
    public ResponseEntity<?> ocrMap(@RequestBody Map<String, String> body) {
        UUID userId = CurrentUser.requireUserId();
        String text = body.getOrDefault("text", "");
        String source = body.getOrDefault("source", "on_device_ocr");
        Map<String, Object> mapped = aiGatewayClient.ocrMapToSchema(text, source);
        return ResponseEntity.ok(Map.of(
                "userId", userId.toString(),
                "envelope", mapped,
                "editable", true,
                "userConfirmationRequired", true
        ));
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
}
