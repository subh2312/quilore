package com.quilore.billing;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EntitlementService {

    public record Plan(String code, String name, Map<String, Boolean> features, Map<String, Integer> monthlyQuotas) {}

    private final Map<String, Plan> catalog = new LinkedHashMap<>();
    private final Map<UUID, String> userPlans = new ConcurrentHashMap<>();
    private final Map<String, Integer> usage = new ConcurrentHashMap<>();

    public EntitlementService() {
        catalog.put("FREE", new Plan(
                "FREE",
                "Free",
                Map.of(
                        "workout_logging", true,
                        "meal_logging", true,
                        "ai_meal_scan", false,
                        "ai_advanced_coaching", false
                ),
                Map.of("ai_meal_scan", 0, "ai_advanced_coaching", 5)
        ));
        catalog.put("PREMIUM", new Plan(
                "PREMIUM",
                "Premium",
                Map.of(
                        "workout_logging", true,
                        "meal_logging", true,
                        "ai_meal_scan", true,
                        "ai_advanced_coaching", true
                ),
                Map.of("ai_meal_scan", 60, "ai_advanced_coaching", 300)
        ));
    }

    public List<Plan> catalog() {
        return List.copyOf(catalog.values());
    }

    public void assignPlan(UUID userId, String planCode) {
        if (!catalog.containsKey(planCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan");
        }
        userPlans.put(userId, planCode);
    }

    public Map<String, Object> entitlementState(UUID userId) {
        String code = userPlans.getOrDefault(userId, "FREE");
        Plan plan = catalog.get(code);
        Map<String, Object> remaining = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> q : plan.monthlyQuotas().entrySet()) {
            int used = usage.getOrDefault(usageKey(userId, q.getKey()), 0);
            remaining.put(q.getKey(), Map.of(
                    "limit", q.getValue(),
                    "used", used,
                    "remaining", Math.max(0, q.getValue() - used)
            ));
        }
        return Map.of(
                "userId", userId.toString(),
                "plan", code,
                "features", plan.features(),
                "quotas", remaining,
                "historicalDataAccess", true
        );
    }

    public boolean isFeatureEnabled(UUID userId, String featureKey) {
        String code = userPlans.getOrDefault(userId, "FREE");
        return Boolean.TRUE.equals(catalog.get(code).features().get(featureKey));
    }

    public Map<String, Object> consumeQuota(UUID userId, String featureKey) {
        if (!isFeatureEnabled(userId, featureKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Feature not entitled");
        }
        String code = userPlans.getOrDefault(userId, "FREE");
        int limit = catalog.get(code).monthlyQuotas().getOrDefault(featureKey, 0);
        String key = usageKey(userId, featureKey);
        int used = usage.merge(key, 1, Integer::sum);
        if (used > limit) {
            usage.merge(key, -1, Integer::sum);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quota exceeded");
        }
        return Map.of(
                "featureKey", featureKey,
                "used", used,
                "limit", limit,
                "remaining", Math.max(0, limit - used),
                "period", YearMonth.now().toString()
        );
    }

    private static String usageKey(UUID userId, String featureKey) {
        return userId + "|" + featureKey + "|" + LocalDate.now().withDayOfMonth(1);
    }
}
