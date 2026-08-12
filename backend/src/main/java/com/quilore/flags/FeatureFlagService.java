package com.quilore.flags;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Release gating and staged rollout for high-risk features (Story 16.5).
 */
@Service
public class FeatureFlagService {

    public record Flag(String key, String description, boolean enabledGlobally, int rolloutPercent,
                       String environment) {}

    private final Map<String, Flag> flags = new ConcurrentHashMap<>();
    private final Map<String, Boolean> cohorts = new ConcurrentHashMap<>();

    public FeatureFlagService() {
        upsert(new Flag("meal_scan", "Food photo scan pipeline", false, 0, "all"));
        upsert(new Flag("advanced_coaching", "Advanced AI coaching chat", true, 100, "all"));
        upsert(new Flag("program_generation", "Personalized program generation", false, 10, "staging"));
        upsert(new Flag("voice_logging", "On-device voice workout logging", true, 100, "all"));
    }

    public void upsert(Flag flag) {
        flags.put(flag.key(), flag);
    }

    public List<Flag> list() {
        return new ArrayList<>(flags.values());
    }

    public void setCohort(String flagKey, UUID userId, boolean enabled) {
        cohorts.put(flagKey + ":" + userId, enabled);
    }

    public boolean isEnabled(String flagKey, UUID userId, String environment) {
        Flag flag = flags.get(flagKey);
        if (flag == null) {
            return false;
        }
        if (!"all".equalsIgnoreCase(flag.environment())
                && environment != null
                && !flag.environment().equalsIgnoreCase(environment)) {
            return false;
        }
        Boolean cohort = cohorts.get(flagKey + ":" + userId);
        if (cohort != null) {
            return cohort;
        }
        if (flag.enabledGlobally() && flag.rolloutPercent() >= 100) {
            return true;
        }
        if (!flag.enabledGlobally() && flag.rolloutPercent() <= 0) {
            return false;
        }
        int bucket = Math.floorMod(userId.hashCode(), 100);
        return bucket < Math.max(0, Math.min(100, flag.rolloutPercent()));
    }

    public Map<String, Object> evaluateAll(UUID userId, String environment) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Flag flag : flags.values()) {
            out.put(flag.key(), Map.of(
                    "enabled", isEnabled(flag.key(), userId, environment),
                    "rolloutPercent", flag.rolloutPercent(),
                    "environment", flag.environment()
            ));
        }
        return out;
    }

    public Map<String, Object> toMap(Flag flag) {
        return Map.of(
                "key", flag.key(),
                "description", flag.description(),
                "enabledGlobally", flag.enabledGlobally(),
                "rolloutPercent", flag.rolloutPercent(),
                "environment", flag.environment()
        );
    }
}
