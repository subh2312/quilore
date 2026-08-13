package com.quilore.goals;

import com.quilore.nutrition.MacroTargetService;
import com.quilore.profile.ProfileMetricsService;
import com.quilore.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService service;
    private final ProfileMetricsService profileMetricsService;
    private final MacroTargetService macroTargetService;

    public GoalController(
            GoalService service,
            ProfileMetricsService profileMetricsService,
            MacroTargetService macroTargetService
    ) {
        this.service = service;
        this.profileMetricsService = profileMetricsService;
        this.macroTargetService = macroTargetService;
    }

    @PostMapping("/{userId}")
    public ResponseEntity<?> save(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        @SuppressWarnings("unchecked")
        List<String> secondary = (List<String>) body.getOrDefault("secondaryPrefs", List.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> schedule = (Map<String, Object>) body.getOrDefault("schedulePrefs", Map.of());
        var goal = service.save(
                owner,
                String.valueOf(body.getOrDefault("primaryGoal", "maintain")),
                secondary,
                String.valueOf(body.getOrDefault("coachingTone", "supportive")),
                schedule
        );
        Map<String, Object> response = new LinkedHashMap<>(service.toMap(goal));
        response.put("recalculationTriggered", false);
        try {
            var profile = profileMetricsService.getProfile(owner);
            if (profile.weightKg() != null && profile.heightCm() != null
                    && profile.age() != null && profile.sex() != null) {
                var snapshot = macroTargetService.calculate(
                        owner,
                        goal.primaryGoal(),
                        profile.weightKg(),
                        profile.heightCm(),
                        profile.age(),
                        profile.sex(),
                        "moderate"
                );
                response.put("macroTargets", macroTargetService.toMap(snapshot));
                response.put("recalculationTriggered", true);
            }
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode() != HttpStatus.NOT_FOUND) {
                throw ex;
            }
            // Profile not set yet — goal saved; macros wait until baseline exists.
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/current")
    public ResponseEntity<?> current(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var goal = service.current(owner);
        if (goal == null) {
            return ResponseEntity.ok(Map.of("hasGoal", false));
        }
        return ResponseEntity.ok(service.toMap(goal));
    }

    @GetMapping("/{userId}/history")
    public ResponseEntity<?> history(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(service.history(owner).stream().map(service::toMap).toList());
    }

    @GetMapping("/{userId}/progress")
    public ResponseEntity<?> progress(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "week") String range
    ) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(service.progressDashboard(owner, range));
    }
}
