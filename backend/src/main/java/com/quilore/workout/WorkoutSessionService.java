package com.quilore.workout;

import com.quilore.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkoutSessionService {

    private final WorkoutSessionRepository sessionRepository;
    private final WorkoutSetRepository setRepository;
    private final SessionSummaryService summaryService;

    public WorkoutSessionService(
            WorkoutSessionRepository sessionRepository,
            WorkoutSetRepository setRepository,
            SessionSummaryService summaryService
    ) {
        this.sessionRepository = sessionRepository;
        this.setRepository = setRepository;
        this.summaryService = summaryService;
    }

    @Transactional
    public Map<String, Object> startSession(UUID userId, String notes) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        Instant now = Instant.now();
        WorkoutSessionEntity session = new WorkoutSessionEntity();
        session.setId(UUID.randomUUID());
        session.setUserId(owner);
        session.setStatus("in_progress");
        session.setStartedAt(now);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        session.setNotes(notes);
        sessionRepository.save(session);
        return toMap(session);
    }

    @Transactional
    public Map<String, Object> addSet(UUID userId, UUID sessionId, Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        WorkoutSessionEntity session = sessionRepository.findByIdAndUserId(sessionId, owner)
                .orElseThrow(() -> new IllegalArgumentException("session_not_found"));
        int nextIndex = setRepository.findBySessionIdOrderBySetIndexAsc(sessionId).size() + 1;
        WorkoutSetEntity set = new WorkoutSetEntity();
        set.setId(UUID.randomUUID());
        set.setSessionId(session.getId());
        set.setExerciseName(String.valueOf(body.getOrDefault("exerciseName", "unknown")));
        set.setSetIndex(body.get("setIndex") instanceof Number n ? n.intValue() : nextIndex);
        set.setReps(body.get("reps") instanceof Number r ? r.intValue() : null);
        set.setLoadKg(body.get("loadKg") instanceof Number l ? l.doubleValue() : null);
        set.setUnit(String.valueOf(body.getOrDefault("unit", "kg")));
        set.setCreatedAt(Instant.now());
        setRepository.save(set);
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);
        return Map.of(
                "sessionId", sessionId.toString(),
                "setId", set.getId().toString(),
                "setIndex", set.getSetIndex(),
                "editable", true
        );
    }

    @Transactional
    public Map<String, Object> completeSession(UUID userId, UUID sessionId, long durationMinutes) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        WorkoutSessionEntity session = sessionRepository.findByIdAndUserId(sessionId, owner)
                .orElseThrow(() -> new IllegalArgumentException("session_not_found"));
        Instant now = Instant.now();
        session.setStatus("completed");
        session.setEndedAt(now);
        session.setDurationMinutes(durationMinutes);
        session.setUpdatedAt(now);
        sessionRepository.save(session);
        List<WorkoutSetEntity> sets = setRepository.findBySessionIdOrderBySetIndexAsc(sessionId);
        List<Map<String, Object>> exerciseRows = sets.stream().map(s -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", s.getExerciseName());
            row.put("reps", s.getReps());
            row.put("load", s.getLoadKg());
            row.put("unit", s.getUnit());
            return row;
        }).toList();
        Map<String, Object> summary = summaryService.summarize(
                owner,
                exerciseRows,
                durationMinutes,
                session.getStartedAt().toString()
        );
        summary.put("sessionId", sessionId.toString());
        summary.put("status", session.getStatus());
        return summary;
    }

    public Map<String, Object> getSession(UUID userId, UUID sessionId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        WorkoutSessionEntity session = sessionRepository.findByIdAndUserId(sessionId, owner)
                .orElseThrow(() -> new IllegalArgumentException("session_not_found"));
        return toMap(session);
    }

    private Map<String, Object> toMap(WorkoutSessionEntity session) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", session.getId().toString());
        map.put("userId", session.getUserId().toString());
        map.put("status", session.getStatus());
        map.put("startedAt", session.getStartedAt().toString());
        map.put("endedAt", session.getEndedAt() == null ? null : session.getEndedAt().toString());
        map.put("durationMinutes", session.getDurationMinutes());
        map.put("notes", session.getNotes());
        map.put("editable", true);
        return map;
    }
}
