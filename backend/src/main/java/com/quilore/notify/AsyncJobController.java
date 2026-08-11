package com.quilore.notify;

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
@RequestMapping("/api")
public class AsyncJobController {

    private final AsyncJobNotificationService service;

    public AsyncJobController(AsyncJobNotificationService service) {
        this.service = service;
    }

    @PostMapping("/ai-jobs")
    public ResponseEntity<?> enqueue(@RequestBody Map<String, String> body) {
        var job = service.enqueue(
                UUID.fromString(body.get("userId")),
                body.get("jobType"),
                body.getOrDefault("deepLink", "/progress")
        );
        return ResponseEntity.ok(toMap(job));
    }

    @PostMapping("/ai-jobs/{id}/running")
    public ResponseEntity<?> running(@PathVariable UUID id) {
        return ResponseEntity.ok(toMap(service.markRunning(id)));
    }

    @PostMapping("/ai-jobs/{id}/complete")
    public ResponseEntity<?> complete(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(toMap(service.complete(id, body.get("resultRef"))));
    }

    @PostMapping("/ai-jobs/{id}/fail")
    public ResponseEntity<?> fail(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(toMap(service.fail(id, body.get("errorMessage"))));
    }

    @GetMapping("/ai-jobs/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        return ResponseEntity.ok(toMap(service.get(id)));
    }

    @GetMapping("/notifications/{userId}")
    public ResponseEntity<?> notifications(@PathVariable UUID userId) {
        return ResponseEntity.ok(service.forUser(userId).stream().map(n -> Map.of(
                "id", n.id().toString(),
                "title", n.title(),
                "body", n.body(),
                "deepLink", n.deepLink() == null ? "" : n.deepLink(),
                "privacySafe", n.privacySafe(),
                "deliveryStatus", n.deliveryStatus()
        )).toList());
    }

    private static Map<String, Object> toMap(AsyncJobNotificationService.AiJob job) {
        return Map.of(
                "id", job.id().toString(),
                "userId", job.userId().toString(),
                "jobType", job.jobType(),
                "status", job.status().name(),
                "resultRef", job.resultRef() == null ? "" : job.resultRef(),
                "errorMessage", job.errorMessage() == null ? "" : job.errorMessage(),
                "deepLink", job.deepLink() == null ? "" : job.deepLink()
        );
    }
}
