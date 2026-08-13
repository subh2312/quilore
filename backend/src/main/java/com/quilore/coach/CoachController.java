package com.quilore.coach;

import com.quilore.billing.EntitlementService;
import com.quilore.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/coach")
public class CoachController {
    private static final String AI_COACHING_QUOTA = "ai_advanced_coaching";

    private final CoachService coachService;
    private final EntitlementService entitlementService;

    public CoachController(CoachService coachService, EntitlementService entitlementService) {
        this.coachService = coachService;
        this.entitlementService = entitlementService;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> body) {
        UUID userId = CurrentUser.requireUserId();
        return chatForUser(userId, body);
    }

    @PostMapping("/{userId}/chat")
    public ResponseEntity<?> chatForPathUser(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        CurrentUser.requireSelfOrAdmin(userId);
        return chatForUser(userId, body);
    }

    private ResponseEntity<?> chatForUser(UUID userId, Map<String, Object> body) {
        ResponseEntity<Map<String, Object>> limited = consumeQuotaOr429(userId, "chat");
        if (limited != null) {
            return limited;
        }
        return ResponseEntity.ok(Map.of(
                "userId", userId.toString(),
                "envelope", coachService.chat(
                        userId,
                        String.valueOf(body.getOrDefault("prompt", body.getOrDefault("message", ""))),
                        Boolean.TRUE.equals(body.get("escalate"))),
                "editable", true,
                "userConfirmationRequired", true));
    }

    @PostMapping("/program")
    public ResponseEntity<?> program(@RequestBody Map<String, Object> body) {
        UUID userId = CurrentUser.requireUserId();
        return programForUser(userId, body);
    }

    @PostMapping("/{userId}/program")
    public ResponseEntity<?> programForPathUser(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        CurrentUser.requireSelfOrAdmin(userId);
        return programForUser(userId, body);
    }

    private ResponseEntity<?> programForUser(UUID userId, Map<String, Object> body) {
        ResponseEntity<Map<String, Object>> limited = consumeQuotaOr429(userId, "program");
        if (limited != null) {
            return limited;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> preferences = body.get("preferences") instanceof Map<?, ?> raw
                ? (Map<String, Object>) raw
                : Map.of();
        return ResponseEntity.ok(coachService.generateProgram(
                userId,
                String.valueOf(body.getOrDefault("prompt", "Generate a program from my preferences")),
                body.get("idempotencyKey") == null ? null : String.valueOf(body.get("idempotencyKey")),
                preferences));
    }

    private ResponseEntity<Map<String, Object>> consumeQuotaOr429(UUID userId, String task) {
        try {
            entitlementService.consumeQuota(userId, AI_COACHING_QUOTA);
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
                    "message", "AI coaching quota exceeded for this billing period. Please wait for reset or upgrade your plan."));
        }
    }
}
