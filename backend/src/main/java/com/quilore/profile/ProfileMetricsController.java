package com.quilore.profile;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ProfileMetricsController {

    private final ProfileMetricsService service;

    public ProfileMetricsController(ProfileMetricsService service) {
        this.service = service;
    }

    @PutMapping("/profiles/{userId}")
    public ResponseEntity<?> upsertProfile(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        var p = service.upsertProfile(userId, body);
        return ResponseEntity.ok(profileMap(p));
    }

    @GetMapping("/profiles/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(profileMap(service.getProfile(userId)));
    }

    @PostMapping("/body-metrics/{userId}")
    public ResponseEntity<?> logMetric(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        var m = service.logMetric(
                userId,
                LocalDate.parse(String.valueOf(body.get("recordedOn"))),
                body.get("weightKg") == null ? null : ((Number) body.get("weightKg")).doubleValue(),
                body.get("waistCm") == null ? null : ((Number) body.get("waistCm")).doubleValue(),
                body.get("photoObjectKey") == null ? null : String.valueOf(body.get("photoObjectKey"))
        );
        return ResponseEntity.ok(Map.of(
                "id", m.id().toString(),
                "recordedOn", m.recordedOn().toString(),
                "weightKg", m.weightKg() == null ? 0 : m.weightKg(),
                "photoObjectKey", m.photoObjectKey() == null ? "" : m.photoObjectKey()
        ));
    }

    @GetMapping("/body-metrics/{userId}")
    public ResponseEntity<?> listMetrics(
            @PathVariable UUID userId,
            @RequestParam String from,
            @RequestParam String to
    ) {
        return ResponseEntity.ok(service.metricsBetween(userId, LocalDate.parse(from), LocalDate.parse(to)).stream()
                .map(m -> Map.of(
                        "id", m.id().toString(),
                        "recordedOn", m.recordedOn().toString(),
                        "weightKg", m.weightKg() == null ? 0 : m.weightKg()
                )).toList());
    }

    @PostMapping("/check-ins/{userId}")
    public ResponseEntity<?> checkIn(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        var c = service.logCheckIn(
                userId,
                LocalDate.parse(String.valueOf(body.get("recordedOn"))),
                asInt(body.get("mood")),
                asInt(body.get("recovery")),
                asInt(body.get("hunger")),
                asInt(body.get("energy")),
                body.get("notes") == null ? null : String.valueOf(body.get("notes"))
        );
        return ResponseEntity.ok(Map.of("id", c.id().toString(), "mood", c.mood() == null ? 0 : c.mood()));
    }

    private static Integer asInt(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static Map<String, Object> profileMap(ProfileMetricsService.Profile p) {
        return Map.of(
                "userId", p.userId().toString(),
                "age", p.age(),
                "sex", p.sex(),
                "heightCm", p.heightCm(),
                "weightKg", p.weightKg(),
                "trainingExperience", p.trainingExperience(),
                "injuriesInfo", p.injuriesInfo(),
                "injuriesDisclaimer", p.injuriesDisclaimer()
        );
    }
}
