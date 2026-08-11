package com.quilore.notify;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AsyncJobNotificationService {

    public enum JobStatus { QUEUED, RUNNING, COMPLETED, FAILED }

    public record AiJob(UUID id, UUID userId, String jobType, JobStatus status, String resultRef,
                        String errorMessage, String deepLink, Instant updatedAt) {}

    public record Notification(UUID id, UUID userId, String title, String body, String deepLink,
                               boolean privacySafe, String deliveryStatus, Instant createdAt) {}

    private final Map<UUID, AiJob> jobs = new ConcurrentHashMap<>();
    private final Map<UUID, Notification> notifications = new ConcurrentHashMap<>();

    public AiJob enqueue(UUID userId, String jobType, String deepLink) {
        AiJob job = new AiJob(UUID.randomUUID(), userId, jobType, JobStatus.QUEUED, null, null, deepLink, Instant.now());
        jobs.put(job.id(), job);
        return job;
    }

    public AiJob markRunning(UUID jobId) {
        return update(jobId, JobStatus.RUNNING, null, null);
    }

    public AiJob complete(UUID jobId, String resultRef) {
        AiJob job = update(jobId, JobStatus.COMPLETED, resultRef, null);
        notifyUser(job.userId(), "Analysis ready", "Your " + job.jobType() + " result is ready.",
                job.deepLink(), true);
        return job;
    }

    public AiJob fail(UUID jobId, String error) {
        AiJob job = update(jobId, JobStatus.FAILED, null, error);
        notifyUser(job.userId(), "Analysis failed", "Tap to retry your " + job.jobType() + ".",
                job.deepLink(), true);
        return job;
    }

    public AiJob get(UUID jobId) {
        AiJob job = jobs.get(jobId);
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found");
        }
        return job;
    }

    public List<Notification> forUser(UUID userId) {
        return notifications.values().stream().filter(n -> n.userId().equals(userId)).toList();
    }

    private AiJob update(UUID jobId, JobStatus status, String resultRef, String error) {
        AiJob prev = get(jobId);
        AiJob next = new AiJob(prev.id(), prev.userId(), prev.jobType(), status,
                resultRef != null ? resultRef : prev.resultRef(),
                error != null ? error : prev.errorMessage(),
                prev.deepLink(), Instant.now());
        jobs.put(jobId, next);
        return next;
    }

    private void notifyUser(UUID userId, String title, String body, String deepLink, boolean privacySafe) {
        Notification n = new Notification(UUID.randomUUID(), userId, title, body, deepLink,
                privacySafe, "SENT", Instant.now());
        notifications.put(n.id(), n);
    }

    // Package-visible for meal reminder service reuse
    void publish(Notification notification) {
        notifications.put(notification.id(), notification);
    }

    List<Notification> all() {
        return new ArrayList<>(notifications.values());
    }
}
