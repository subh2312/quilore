package com.quilore.workout;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SessionSummaryService {

    public Map<String, Object> summarize(
            UUID userId,
            List<Map<String, Object>> exercises,
            long durationMinutes,
            String startedAt
    ) {
        int setCount = exercises.size();
        int exerciseCount = exercises.stream()
                .map(e -> String.valueOf(e.getOrDefault("name", "unknown")))
                .distinct()
                .toList()
                .size();
        long totalReps = exercises.stream()
                .filter(e -> e.get("reps") instanceof Number)
                .mapToLong(e -> ((Number) e.get("reps")).longValue())
                .sum();
        double totalVolume = 0.0;
        Map<String, Long> volumeByExercise = new HashMap<>();
        List<Map<String, Object>> personalRecords = new ArrayList<>();
        for (Map<String, Object> row : exercises) {
            String name = String.valueOf(row.getOrDefault("name", "unknown"));
            long reps = row.get("reps") instanceof Number n ? n.longValue() : 0L;
            double load = row.get("load") instanceof Number n ? n.doubleValue() : 0.0;
            totalVolume += reps * load;
            volumeByExercise.merge(name, reps, Long::sum);
            if (load > 0) {
                personalRecords.add(Map.of(
                        "exercise", name,
                        "newMax", load,
                        "metric", "weight"
                ));
            }
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("userId", userId.toString());
        summary.put("startedAt", startedAt);
        summary.put("durationMinutes", durationMinutes);
        summary.put("setCount", setCount);
        summary.put("exerciseCount", exerciseCount);
        summary.put("totalReps", totalReps);
        summary.put("totalVolume", totalVolume);
        summary.put("totalVolumeKg", totalVolume);
        summary.put("volumeByExercise", volumeByExercise);
        summary.put("personalRecords", personalRecords);
        summary.put("hasPersonalRecords", !personalRecords.isEmpty());
        summary.put(
                "headline",
                setCount == 0 ? "Session logged — add sets when ready." : "Session complete — review volume and edit before saving."
        );
        summary.put("disclaimer", "Coaching summary only — not a medical assessment.");
        summary.put("editable", true);
        summary.put("userConfirmationRequired", true);
        return summary;
    }
}
