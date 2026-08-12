package com.quilore.coach;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/coach")
public class CoachController {
    private final CoachService coachService;
    public CoachController(CoachService coachService) { this.coachService = coachService; }
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
        return ResponseEntity.ok(coachService.generateProgram(
                userId,
                String.valueOf(body.getOrDefault("prompt", "Generate a program")),
                body.get("idempotencyKey") == null ? null : String.valueOf(body.get("idempotencyKey"))));
    }
}
