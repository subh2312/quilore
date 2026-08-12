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
        return ResponseEntity.ok(Map.of("userId", userId.toString(), "envelope",
                coachService.chat(userId, String.valueOf(body.getOrDefault("prompt", "")),
                        Boolean.TRUE.equals(body.get("escalate"))),
                "editable", true, "userConfirmationRequired", true));
    }
    @PostMapping("/program")
    public ResponseEntity<?> program(@RequestBody Map<String, Object> body) {
        UUID userId = CurrentUser.requireUserId();
        return ResponseEntity.ok(coachService.generateProgram(userId,
                String.valueOf(body.getOrDefault("prompt", "Generate a program")),
                body.get("idempotencyKey") == null ? null : String.valueOf(body.get("idempotencyKey"))));
    }
}
