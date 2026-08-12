package com.quilore.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Auditable permission-change / authorization events (Story 15.1).
 * Persisted in {@code permission_audit} (Flyway V2 + V6 actor_label).
 */
@Service
public class PermissionAuditService {

    private static final Logger log = LoggerFactory.getLogger(PermissionAuditService.class);
    private static final Pattern TARGET_UUID = Pattern.compile("target=([0-9a-fA-F-]{36})");

    private final PermissionAuditRepository repository;

    public PermissionAuditService(PermissionAuditRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(String actor, String actorRole, String action, String detail) {
        PermissionAuditEntity entity = new PermissionAuditEntity();
        String actorLabel = actor == null || actor.isBlank() ? "anonymous" : actor;
        entity.setActorLabel(actorLabel);
        try {
            entity.setActorUserId(UUID.fromString(actorLabel));
        } catch (IllegalArgumentException ignored) {
            // non-UUID principals (e.g. mock usernames) stay label-only
        }
        entity.setActorRole(actorRole == null || actorRole.isBlank() ? "UNKNOWN" : actorRole);
        entity.setAction(action);
        entity.setDetail(detail == null ? "" : detail);
        Matcher matcher = TARGET_UUID.matcher(entity.getDetail());
        if (matcher.find()) {
            try {
                entity.setTargetUserId(UUID.fromString(matcher.group(1)));
            } catch (IllegalArgumentException ignored) {
                // leave target unset
            }
        }
        repository.save(entity);
        log.info(
                "permission_audit actor={} role={} action={} detail={}",
                actorLabel,
                entity.getActorRole(),
                entity.getAction(),
                entity.getDetail()
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recentEvents() {
        return repository.findTop200ByOrderByCreatedAtAsc().stream()
                .map(this::toMap)
                .toList();
    }

    @Transactional
    public void clear() {
        repository.deleteAll();
    }

    private Map<String, Object> toMap(PermissionAuditEntity entity) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("actor", entity.getActorLabel() != null ? entity.getActorLabel() : "anonymous");
        event.put("actorRole", entity.getActorRole());
        event.put("action", entity.getAction());
        event.put("detail", entity.getDetail() == null ? "" : entity.getDetail());
        event.put("at", entity.getCreatedAt().toString());
        return event;
    }
}
