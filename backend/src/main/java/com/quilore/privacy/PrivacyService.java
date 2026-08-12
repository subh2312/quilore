package com.quilore.privacy;

import com.quilore.observability.SensitiveDataRedactor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Consent, export/deletion, and privacy-aware notification helpers (Stories 1.4, 15.3, 15.4).
 */
@Service
public class PrivacyService {

    public record Consent(UUID id, UUID userId, String consentType, String version, boolean accepted,
                          String appVersion, Instant acceptedAt) {}

    public record PrivacyPrefs(UUID userId, boolean analyticsOptIn, boolean crashReportingOptIn,
                               boolean privacyModeNotifications) {}

    public record ExportRequest(UUID id, UUID userId, String status, String format, Instant createdAt) {}
    public record DeletionRequest(UUID id, UUID userId, String status, String reason, Instant createdAt) {}

    private final Map<String, Consent> consents = new ConcurrentHashMap<>();
    private final Map<UUID, PrivacyPrefs> prefs = new ConcurrentHashMap<>();
    private final Map<UUID, ExportRequest> exports = new ConcurrentHashMap<>();
    private final Map<UUID, DeletionRequest> deletions = new ConcurrentHashMap<>();

    public Consent recordConsent(UUID userId, String type, String version, boolean accepted, String appVersion) {
        Consent c = new Consent(UUID.randomUUID(), userId, type, version, accepted, appVersion, Instant.now());
        consents.put(userId + ":" + type + ":" + version, c);
        return c;
    }

    public List<Consent> consentsFor(UUID userId) {
        List<Consent> out = new ArrayList<>();
        for (Consent c : consents.values()) {
            if (c.userId().equals(userId)) {
                out.add(c);
            }
        }
        return out;
    }

    public PrivacyPrefs savePrefs(UUID userId, boolean analytics, boolean crash, boolean privacyMode) {
        PrivacyPrefs p = new PrivacyPrefs(userId, analytics, crash, privacyMode);
        prefs.put(userId, p);
        return p;
    }

    public PrivacyPrefs getPrefs(UUID userId) {
        return prefs.getOrDefault(userId, new PrivacyPrefs(userId, false, true, true));
    }

    public ExportRequest requestExport(UUID userId, String format) {
        ExportRequest req = new ExportRequest(UUID.randomUUID(), userId, "QUEUED", format, Instant.now());
        exports.put(req.id(), req);
        return req;
    }

    public Map<String, Object> buildExportPayload(UUID userId) {
        PrivacyPrefs p = getPrefs(userId);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", userId.toString());
        payload.put("exportedAt", Instant.now().toString());
        payload.put("format", "json");
        payload.put("consents", consentsFor(userId).stream().map(this::consentMap).toList());
        payload.put("privacyPreferences", Map.of(
                "analyticsOptIn", p.analyticsOptIn(),
                "crashReportingOptIn", p.crashReportingOptIn(),
                "privacyModeNotifications", p.privacyModeNotifications()
        ));
        payload.put("note", "Export includes account preferences and consent history. Media blobs are referenced separately.");
        return payload;
    }

    public DeletionRequest requestDeletion(UUID userId, String reason) {
        DeletionRequest req = new DeletionRequest(UUID.randomUUID(), userId, "QUEUED", reason, Instant.now());
        deletions.put(req.id(), req);
        return req;
    }

    public String sanitizeNotificationBody(UUID userId, String sensitiveBody, String safeBody) {
        PrivacyPrefs p = getPrefs(userId);
        if (p.privacyModeNotifications()) {
            return safeBody;
        }
        return SensitiveDataRedactor.redactText(sensitiveBody);
    }

    public Map<String, Object> consentMap(Consent c) {
        return Map.of(
                "id", c.id().toString(),
                "consentType", c.consentType(),
                "version", c.version(),
                "accepted", c.accepted(),
                "appVersion", c.appVersion() == null ? "" : c.appVersion(),
                "acceptedAt", c.acceptedAt().toString()
        );
    }
}
