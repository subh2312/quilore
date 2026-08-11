package com.quilore.content;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class ExerciseContentController {

    private final ExerciseContentService service;

    public ExerciseContentController(ExerciseContentService service) {
        this.service = service;
    }

    @GetMapping("/exercises")
    public ResponseEntity<?> listPublished() {
        return ResponseEntity.ok(service.listPublished().stream().map(ExerciseContent::toMap).toList());
    }

    @PostMapping("/admin/exercises")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> upsert(@RequestBody Map<String, Object> body, Authentication auth) {
        ExerciseContent saved = service.upsert(
                String.valueOf(body.getOrDefault("slug", "")),
                String.valueOf(body.getOrDefault("name", "")),
                String.valueOf(body.getOrDefault("instructions", "")),
                String.valueOf(body.getOrDefault("coachingCues", "")),
                body.get("demoAssetUrl") == null ? null : String.valueOf(body.get("demoAssetUrl")),
                Boolean.TRUE.equals(body.get("published")) || "true".equalsIgnoreCase(String.valueOf(body.get("published"))),
                auth.getName()
        );
        return ResponseEntity.ok(saved.toMap());
    }

    @GetMapping("/admin/exercises/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> audit() {
        return ResponseEntity.ok(service.auditTrail());
    }
}
