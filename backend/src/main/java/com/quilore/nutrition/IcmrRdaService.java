package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * ICMR-NIN RDA inspired core micronutrient targets (Story: Derive core micronutrient targets).
 * Values are coaching estimates, not medical prescriptions.
 */
@Service
public class IcmrRdaService {

    public record ProfileInput(int age, String sex, boolean pregnant, boolean lactating) {}

    public Map<String, Double> targetsFor(ProfileInput profile) {
        String sex = profile.sex() == null ? "other" : profile.sex().toLowerCase(Locale.ROOT);
        boolean female = sex.startsWith("f");
        Map<String, Double> targets = new LinkedHashMap<>();
        // Core ICMR-NIN aligned adult baselines (approximate table subset for v1).
        targets.put("iron_mg", female ? 29.0 : 19.0);
        targets.put("calcium_mg", profile.age() >= 60 ? 1200.0 : 1000.0);
        targets.put("vitamin_a_ug", female ? 840.0 : 1000.0);
        targets.put("vitamin_c_mg", 80.0);
        targets.put("vitamin_d_ug", 10.0);
        targets.put("vitamin_b12_ug", 2.2);
        targets.put("folate_ug", profile.pregnant() ? 570.0 : 300.0);
        targets.put("zinc_mg", female ? 13.2 : 17.0);
        targets.put("iodine_ug", profile.pregnant() || profile.lactating() ? 250.0 : 140.0);
        if (profile.lactating()) {
            targets.put("calcium_mg", Math.max(targets.get("calcium_mg"), 1200.0));
            targets.put("vitamin_a_ug", targets.get("vitamin_a_ug") + 350.0);
        }
        return targets;
    }
}
