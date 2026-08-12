package com.quilore.workout;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class SessionSummaryService {
    public Map<String, Object> summarize(UUID userId, List<Map<String, Object>> exercises, long durationMinutes, String startedAt) {
        int setCount = exercises.size();
        long totalReps = exercises.stream().filter(e -> e.get("reps") instanceof Number).mapToLong(e -> ((Number)e.get("reps")).longValue()).sum();
        Map<String, Long> volumeByExercise = new HashMap<>();
        for (Map<String, Object> row : exercises) {
            String name = String.valueOf(row.getOrDefault("name", "unknown"));
            long reps = row.get("reps") instanceof Number n ? n.longValue() : 0L;
            volumeByExercise.merge(name, reps, Long::sum);
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("userId", userId.toString());
        summary.put("startedAt", startedAt);
        summary.put("durationMinutes", durationMinutes);
        summary.put("setCount", setCount);
        summary.put("totalReps", totalReps);
        summary.put("volumeByExercise", volumeByExercise);
        summary.put("headline", setCount == 0 ? "Session logged — add sets when ready." : "Session complete — review volume and edit before saving.");
        summary.put("disclaimer", "Coaching summary only — not a medical assessment.");
        summary.put("editable", true);
        summary.put("userConfirmationRequired", true);
        return summary;
    }
}
