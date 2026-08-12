package com.quilore.injury;

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
@RequestMapping("/api/injury")
public class InjuryTriageController {

    private final InjuryTriageService service;

    public InjuryTriageController(InjuryTriageService service) {
        this.service = service;
    }

    @PostMapping("/triage/{userId}")
    public ResponseEntity<?> triage(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        @SuppressWarnings("unchecked")
        List<String> descriptors = (List<String>) body.getOrDefault("painDescriptors", List.of());
        var result = service.evaluate(owner, String.valueOf(body.getOrDefault("muscleRegion", "unknown")), descriptors);
        return ResponseEntity.ok(service.toMap(result));
    }

    @GetMapping("/triage/{userId}")
    public ResponseEntity<?> history(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(service.history(owner).stream().map(service::toMap).toList());
    }
}
