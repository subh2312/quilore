package com.quilore.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Auditable permission-change / authorization events (Story 15.1).
 * Persisted audit table is defined in V2; this service emits structured logs
 * and keeps an in-memory ring buffer for tests until the JPA repository lands.
 */
@Service
public class PermissionAuditService {

    private static final Logger log = LoggerFactory.getLogger(PermissionAuditService.class);
    private static final int MAX_BUFFER = 200;

    private final List<Map<String, Object>> recent = Collections.synchronizedList(new ArrayList<>());

    public void record(String actor, String actorRole, String action, String detail) {
        Map<String, Object> event = Map.of(
                "actor", actor == null ? "anonymous" : actor,
                "actorRole", actorRole == null ? "UNKNOWN" : actorRole,
                "action", action,
                "detail", detail == null ? "" : detail,
                "at", Instant.now().toString()
        );
        synchronized (recent) {
            recent.add(event);
            while (recent.size() > MAX_BUFFER) {
                recent.remove(0);
            }
        }
        log.info(
                "permission_audit actor={} role={} action={} detail={}",
                event.get("actor"),
                event.get("actorRole"),
                event.get("action"),
                event.get("detail")
        );
    }

    public List<Map<String, Object>> recentEvents() {
        synchronized (recent) {
            return List.copyOf(recent);
        }
    }

    public void clear() {
        recent.clear();
    }
}
