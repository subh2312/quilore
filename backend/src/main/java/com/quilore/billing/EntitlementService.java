package com.quilore.billing;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class EntitlementService {

    public record Plan(String code, String name, Map<String, Boolean> features, Map<String, Integer> monthlyQuotas) {}

    private static final UUID FREE_PLAN_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID PREMIUM_PLAN_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private final PlanRepository planRepository;
    private final PlanEntitlementRepository planEntitlementRepository;
    private final UsageQuotaRepository usageQuotaRepository;
    private final UserEntitlementRepository userEntitlementRepository;
    private final UsageCounterRepository usageCounterRepository;

    public EntitlementService(
            PlanRepository planRepository,
            PlanEntitlementRepository planEntitlementRepository,
            UsageQuotaRepository usageQuotaRepository,
            UserEntitlementRepository userEntitlementRepository,
            UsageCounterRepository usageCounterRepository
    ) {
        this.planRepository = planRepository;
        this.planEntitlementRepository = planEntitlementRepository;
        this.usageQuotaRepository = usageQuotaRepository;
        this.userEntitlementRepository = userEntitlementRepository;
        this.usageCounterRepository = usageCounterRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedPlansIfNeeded() {
        ensurePlan(FREE_PLAN_ID, "FREE", "Free", "Core logging features",
                Map.of(
                        "workout_logging", true,
                        "meal_logging", true,
                        "ai_meal_scan", false,
                        "ai_advanced_coaching", false
                ),
                Map.of("ai_meal_scan", 0, "ai_advanced_coaching", 5));
        ensurePlan(PREMIUM_PLAN_ID, "PREMIUM", "Premium", "AI coaching and scans",
                Map.of(
                        "workout_logging", true,
                        "meal_logging", true,
                        "ai_meal_scan", true,
                        "ai_advanced_coaching", true
                ),
                Map.of("ai_meal_scan", 60, "ai_advanced_coaching", 300));
    }

    private void ensurePlan(UUID id, String code, String name, String description,
                            Map<String, Boolean> features, Map<String, Integer> quotas) {
        PlanEntity plan = planRepository.findByCodeIgnoreCase(code).orElseGet(() -> {
            PlanEntity created = new PlanEntity();
            created.setId(id);
            created.setCode(code);
            created.setName(name);
            created.setDescription(description);
            created.setActive(true);
            return planRepository.save(created);
        });
        if (planEntitlementRepository.findByPlanId(plan.getId()).isEmpty()) {
            for (Map.Entry<String, Boolean> entry : features.entrySet()) {
                PlanEntitlementEntity entitlement = new PlanEntitlementEntity();
                entitlement.setPlanId(plan.getId());
                entitlement.setFeatureKey(entry.getKey());
                entitlement.setEnabled(entry.getValue());
                planEntitlementRepository.save(entitlement);
            }
        }
        if (usageQuotaRepository.findByPlanId(plan.getId()).isEmpty()) {
            for (Map.Entry<String, Integer> entry : quotas.entrySet()) {
                UsageQuotaEntity quota = new UsageQuotaEntity();
                quota.setPlanId(plan.getId());
                quota.setFeatureKey(entry.getKey());
                quota.setLimitCount(entry.getValue());
                quota.setPeriod("MONTHLY");
                usageQuotaRepository.save(quota);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Plan> catalog() {
        return planRepository.findAll().stream()
                .filter(PlanEntity::isActive)
                .map(this::toPlan)
                .toList();
    }

    @Transactional
    public void assignPlan(UUID userId, String planCode) {
        PlanEntity plan = planRepository.findByCodeIgnoreCase(planCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown plan"));
        UserEntitlementEntity entitlement = userEntitlementRepository.findById(userId)
                .orElseGet(UserEntitlementEntity::new);
        entitlement.setUserId(userId);
        entitlement.setPlanId(plan.getId());
        entitlement.setStatus("ACTIVE");
        userEntitlementRepository.save(entitlement);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> entitlementState(UUID userId) {
        PlanEntity planEntity = resolvePlan(userId);
        Plan plan = toPlan(planEntity);
        LocalDate periodStart = LocalDate.now().withDayOfMonth(1);
        Map<String, Object> remaining = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> q : plan.monthlyQuotas().entrySet()) {
            int used = usageCounterRepository
                    .findByUserIdAndFeatureKeyAndPeriodStart(userId, q.getKey(), periodStart)
                    .map(UsageCounterEntity::getUsedCount)
                    .orElse(0);
            remaining.put(q.getKey(), Map.of(
                    "limit", q.getValue(),
                    "used", used,
                    "remaining", Math.max(0, q.getValue() - used)
            ));
        }
        return Map.of(
                "userId", userId.toString(),
                "plan", plan.code(),
                "features", plan.features(),
                "quotas", remaining,
                "historicalDataAccess", true
        );
    }

    @Transactional(readOnly = true)
    public boolean isFeatureEnabled(UUID userId, String featureKey) {
        return Boolean.TRUE.equals(toPlan(resolvePlan(userId)).features().get(featureKey));
    }

    @Transactional
    public Map<String, Object> consumeQuota(UUID userId, String featureKey) {
        if (!isFeatureEnabled(userId, featureKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Feature not entitled");
        }
        Plan plan = toPlan(resolvePlan(userId));
        int limit = plan.monthlyQuotas().getOrDefault(featureKey, 0);
        LocalDate periodStart = LocalDate.now().withDayOfMonth(1);
        UsageCounterEntity counter = usageCounterRepository
                .findByUserIdAndFeatureKeyAndPeriodStart(userId, featureKey, periodStart)
                .orElseGet(() -> {
                    UsageCounterEntity created = new UsageCounterEntity();
                    created.setUserId(userId);
                    created.setFeatureKey(featureKey);
                    created.setPeriodStart(periodStart);
                    created.setUsedCount(0);
                    return created;
                });
        int used = counter.getUsedCount() + 1;
        if (used > limit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quota exceeded");
        }
        counter.setUsedCount(used);
        usageCounterRepository.save(counter);
        return Map.of(
                "featureKey", featureKey,
                "used", used,
                "limit", limit,
                "remaining", Math.max(0, limit - used),
                "period", YearMonth.now().toString()
        );
    }

    private PlanEntity resolvePlan(UUID userId) {
        return userEntitlementRepository.findById(userId)
                .flatMap(ue -> planRepository.findById(ue.getPlanId()))
                .orElseGet(() -> planRepository.findByCodeIgnoreCase("FREE")
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "FREE plan missing")));
    }

    private Plan toPlan(PlanEntity entity) {
        Map<String, Boolean> features = new LinkedHashMap<>();
        for (PlanEntitlementEntity pe : planEntitlementRepository.findByPlanId(entity.getId())) {
            features.put(pe.getFeatureKey(), pe.isEnabled());
        }
        Map<String, Integer> quotas = new LinkedHashMap<>();
        for (UsageQuotaEntity q : usageQuotaRepository.findByPlanId(entity.getId())) {
            quotas.put(q.getFeatureKey(), q.getLimitCount());
        }
        return new Plan(entity.getCode(), entity.getName(), features, quotas);
    }
}
