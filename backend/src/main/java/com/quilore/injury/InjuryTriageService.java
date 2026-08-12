package com.quilore.injury;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fatigue vs injury risk-flag triage — never a diagnosis (Story 5.5).
 */
@Service
public class InjuryTriageService {

    public static final String DISCLAIMER =
            "Risk flag only — not a medical diagnosis. Seek a qualified clinician for persistent or severe pain.";

    public record TriageResult(UUID id, UUID userId, String muscleRegion, List<String> descriptors,
                               String riskFlag, String message, String disclaimer, Instant at) {}

    private static final Set<String> INJURY_CUES = Set.of(
            "sharp", "sudden", "swelling", "numbness", "locking", "instability", "pop"
    );
    private static final Set<String> FATIGUE_CUES = Set.of(
            "sore", "tight", "fatigue", "delayed", "aching", "stiff"
    );

    private final Map<UUID, TriageResult> events = new ConcurrentHashMap<>();

    public TriageResult evaluate(UUID userId, String region, List<String> descriptors) {
        List<String> desc = descriptors == null ? List.of() : descriptors.stream()
                .map(d -> d.toLowerCase(Locale.ROOT).trim())
                .toList();
        long injuryHits = desc.stream().filter(d -> INJURY_CUES.stream().anyMatch(d::contains)).count();
        long fatigueHits = desc.stream().filter(d -> FATIGUE_CUES.stream().anyMatch(d::contains)).count();

        String flag;
        String message;
        if (injuryHits > 0 && injuryHits >= fatigueHits) {
            flag = "INJURY_RISK";
            message = "Symptoms include markers more consistent with injury risk than ordinary training fatigue. "
                    + "Reduce load on " + region + " and consider professional assessment.";
        } else if (fatigueHits > 0) {
            flag = "FATIGUE";
            message = "Symptoms align more with training fatigue/soreness for " + region
                    + ". Consider deload, mobility, and recovery before pushing intensity.";
        } else {
            flag = "INCONCLUSIVE";
            message = "Not enough detail to separate fatigue from injury risk for " + region
                    + ". Log more descriptors or rest and reassess.";
        }
        TriageResult result = new TriageResult(
                UUID.randomUUID(), userId, region, desc, flag, message, DISCLAIMER, Instant.now()
        );
        events.put(result.id(), result);
        return result;
    }

    public List<TriageResult> history(UUID userId) {
        List<TriageResult> out = new ArrayList<>();
        for (TriageResult r : events.values()) {
            if (r.userId().equals(userId)) {
                out.add(r);
            }
        }
        return out;
    }

    public Map<String, Object> toMap(TriageResult r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.id().toString());
        m.put("muscleRegion", r.muscleRegion());
        m.put("painDescriptors", r.descriptors());
        m.put("riskFlag", r.riskFlag());
        m.put("message", r.message());
        m.put("disclaimer", r.disclaimer());
        m.put("diagnosis", false);
        m.put("createdAt", r.at().toString());
        return m;
    }
}
