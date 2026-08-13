package com.quilore.coach;

import com.quilore.ai.AiGatewayClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CoachService {
    private final AiGatewayClient aiGatewayClient;

    public CoachService(AiGatewayClient aiGatewayClient) {
        this.aiGatewayClient = aiGatewayClient;
    }

    public Map<String, Object> chat(UUID userId, String prompt, boolean escalate) {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("prompt", prompt);
        input.put("escalate", escalate);
        return aiGatewayClient.coachChat(input);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> generateProgram(UUID userId, String prompt, String idempotencyKey,
                                               Map<String, Object> preferences) {
        Map<String, Object> prefs = preferences == null ? Map.of() : preferences;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("prompt", prompt);
        payload.put("preferences", prefs);
        payload.put("primaryGoal", prefs.getOrDefault("primaryGoal", "recomp"));
        payload.put("trainingExperience", prefs.getOrDefault("trainingExperience", "beginner"));
        payload.put("equipmentAccess", prefs.getOrDefault("equipmentAccess", ""));
        payload.put("daysPerWeek", prefs.getOrDefault("daysPerWeek", 4));

        Map<String, Object> queued = aiGatewayClient.enqueueProgram(payload, idempotencyKey);
        Map<String, Object> draft = aiGatewayClient.coachChat(Map.of(
                "prompt", "Draft program from prefs: " + prompt + " | " + prefs,
                "escalate", true
        ));

        Map<String, Object> program = structuredProgramFromPrefs(prefs);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", userId.toString());
        response.put("queued", queued);
        response.put("draft", draft);
        response.put("program", program);
        response.put("editable", true);
        response.put("userConfirmationRequired", true);
        response.put("message", "Preference-based routine draft — edit before training. Import/voice/manual can update it.");
        return response;
    }

    /** Immediate editable structure so mobile is not blocked on the async queue. */
    @SuppressWarnings("unchecked")
    Map<String, Object> structuredProgramFromPrefs(Map<String, Object> prefs) {
        String goal = String.valueOf(prefs.getOrDefault("primaryGoal", "recomp"));
        String experience = String.valueOf(prefs.getOrDefault("trainingExperience", "beginner"));
        Object daysObj = prefs.getOrDefault("daysPerWeek", 4);
        int days = daysObj instanceof Number ? ((Number) daysObj).intValue() : 4;
        days = Math.max(2, Math.min(6, days));

        int sets = "beginner".equals(experience) ? 3 : "advanced".equals(experience) ? 4 : 3;
        int reps = "beginner".equals(experience) ? 10 : "advanced".equals(experience) ? 6 : 8;

        List<Map<String, Object>> day1 = List.of(
                exercise("Back Squat", sets, reps),
                exercise("Romanian Deadlift", sets, 8),
                exercise("Walking Lunge", 3, 10),
                exercise("Plank", 3, 30)
        );
        List<Map<String, Object>> day2 = List.of(
                exercise("Bench Press", sets, reps),
                exercise("Barbell Row", sets, 8),
                exercise("Overhead Press", 3, 8),
                exercise("Lat Pulldown", 3, 10)
        );
        if ("fat_loss".equals(goal)) {
            day1 = new ArrayList<>(day1);
            day1.add(exercise("Bike finisher", 1, 12));
        }
        if ("muscle_gain".equals(goal)) {
            day2 = new ArrayList<>(day2);
            day2.add(exercise("Dumbbell Curl", 3, 10));
        }

        List<Map<String, Object>> sessions = new ArrayList<>();
        sessions.add(Map.of("dayLabel", "Day 1", "focus", "Lower / hinge", "exercises", day1));
        sessions.add(Map.of("dayLabel", "Day 2", "focus", "Push / pull", "exercises", day2));
        if (days >= 3) {
            sessions.add(Map.of(
                    "dayLabel", "Day 3",
                    "focus", "Full body",
                    "exercises", List.of(
                            exercise("Goblet Squat", sets, 10),
                            exercise("Push-Up", 3, 12),
                            exercise("One-Arm Row", 3, 10),
                            exercise("Hip Bridge", 3, 12)
                    )
            ));
        }
        while (sessions.size() < days) {
            sessions.add(Map.of(
                    "dayLabel", "Day " + (sessions.size() + 1),
                    "focus", "Accessory / conditioning",
                    "exercises", List.of(
                            exercise("Split Squat", 3, 10),
                            exercise("Face Pull", 3, 12),
                            exercise("Core Dead Bug", 3, 10)
                    )
            ));
        }

        Map<String, Object> program = new LinkedHashMap<>();
        program.put("title", days + "-day " + goal.replace('_', ' ') + " routine");
        program.put("sessions", sessions);
        program.put("editable", true);
        return program;
    }

    private static Map<String, Object> exercise(String name, int sets, int reps) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("sets", sets);
        m.put("reps", reps);
        return m;
    }
}
