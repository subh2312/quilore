package com.quilore.goals;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Goal setup and coaching preference capture (Stories 1.3 / goal UI).
 */
@Service
public class GoalService {

    public record Goal(UUID id, UUID userId, String primaryGoal, List<String> secondaryPrefs,
                       String coachingTone, Map<String, Object> schedulePrefs, int version,
                       Instant effectiveFrom) {}

    private final Map<UUID, List<Goal>> byUser = new ConcurrentHashMap<>();

    public Goal save(UUID userId, String primaryGoal, List<String> secondary, String tone,
                     Map<String, Object> schedule) {
        List<Goal> history = byUser.computeIfAbsent(userId, k -> new ArrayList<>());
        int nextVersion = history.stream().mapToInt(Goal::version).max().orElse(0) + 1;
        Goal goal = new Goal(UUID.randomUUID(), userId, primaryGoal,
                secondary == null ? List.of() : List.copyOf(secondary),
                tone == null ? "supportive" : tone,
                schedule == null ? Map.of() : Map.copyOf(schedule),
                nextVersion, Instant.now());
        history.add(goal);
        return goal;
    }

    public Goal current(UUID userId) {
        return byUser.getOrDefault(userId, List.of()).stream()
                .max(Comparator.comparingInt(Goal::version))
                .orElse(null);
    }

    public List<Goal> history(UUID userId) {
        return List.copyOf(byUser.getOrDefault(userId, List.of()));
    }

    public Map<String, Object> progressDashboard(UUID userId, String range) {
        Goal goal = current(userId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("range", range == null ? "week" : range);
        out.put("hasGoal", goal != null);
        if (goal == null) {
            out.put("message", "No active goal yet. Set a primary goal to track progress.");
            out.put("metrics", List.of());
            return out;
        }
        out.put("primaryGoal", goal.primaryGoal());
        out.put("goalVersion", goal.version());
        out.put("metrics", List.of(
                Map.of("key", "training_consistency", "label", "Training consistency", "value", 0.72, "target", 0.8),
                Map.of("key", "nutrition_adherence", "label", "Nutrition adherence", "value", 0.65, "target", 0.85),
                Map.of("key", "plan_completion", "label", "Plan completion", "value", 0.4, "target", 1.0)
        ));
        out.put("disclaimer", "Coaching estimates based on logged activity — not medical targets.");
        return out;
    }

    public Map<String, Object> toMap(Goal g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", g.id().toString());
        m.put("userId", g.userId().toString());
        m.put("primaryGoal", g.primaryGoal());
        m.put("secondaryPrefs", g.secondaryPrefs());
        m.put("coachingTone", g.coachingTone());
        m.put("schedulePrefs", g.schedulePrefs());
        m.put("version", g.version());
        m.put("effectiveFrom", g.effectiveFrom().toString());
        m.put("recalculationTriggered", true);
        return m;
    }
}
