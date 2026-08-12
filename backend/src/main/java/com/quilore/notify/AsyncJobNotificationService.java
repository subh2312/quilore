package com.quilore.notify;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AsyncJobNotificationService {

    public enum JobStatus { QUEUED, RUNNING, COMPLETED, FAILED }

    public record AiJob(UUID id, UUID userId, String jobType, JobStatus status, String resultRef,
                        String errorMessage, String deepLink, Instant updatedAt) {}

    public record Notification(UUID id, UUID userId, String title, String body, String deepLink,
                               boolean privacySafe, String deliveryStatus, Instant createdAt) {}

    private final AiJobRepository jobRepository;
    private final NotificationRepository notificationRepository;

    public AsyncJobNotificationService(AiJobRepository jobRepository, NotificationRepository notificationRepository) {
        this.jobRepository = jobRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public AiJob enqueue(UUID userId, String jobType, String deepLink) {
        AiJobEntity entity = new AiJobEntity();
        entity.setUserId(userId);
        entity.setJobType(jobType);
        entity.setStatus(JobStatus.QUEUED.name());
        entity.setDeepLink(deepLink);
        return toJob(jobRepository.save(entity));
    }

    @Transactional
    public AiJob markRunning(UUID jobId) {
        return update(jobId, JobStatus.RUNNING, null, null);
    }

    @Transactional
    public AiJob complete(UUID jobId, String resultRef) {
        AiJob job = update(jobId, JobStatus.COMPLETED, resultRef, null);
        notifyUser(job.userId(), "Analysis ready", "Your " + job.jobType() + " result is ready.",
                job.deepLink(), true);
        return job;
    }

    @Transactional
    public AiJob fail(UUID jobId, String error) {
        AiJob job = update(jobId, JobStatus.FAILED, null, error);
        notifyUser(job.userId(), "Analysis failed", "Tap to retry your " + job.jobType() + ".",
                job.deepLink(), true);
        return job;
    }

    @Transactional(readOnly = true)
    public AiJob get(UUID jobId) {
        return jobRepository.findById(jobId)
                .map(this::toJob)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    @Transactional(readOnly = true)
    public List<Notification> forUser(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toNotification)
                .toList();
    }

    private AiJob update(UUID jobId, JobStatus status, String resultRef, String error) {
        AiJobEntity entity = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        entity.setStatus(status.name());
        if (resultRef != null) {
            entity.setResultRef(resultRef);
        }
        if (error != null) {
            entity.setErrorMessage(error);
        }
        entity.setUpdatedAt(Instant.now());
        return toJob(jobRepository.save(entity));
    }

    private void notifyUser(UUID userId, String title, String body, String deepLink, boolean privacySafe) {
        NotificationEntity entity = new NotificationEntity();
        entity.setUserId(userId);
        entity.setTitle(title);
        entity.setBody(body);
        entity.setDeepLink(deepLink);
        entity.setPrivacySafe(privacySafe);
        entity.setDeliveryStatus("SENT");
        notificationRepository.save(entity);
    }

    @Transactional
    void publish(Notification notification) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(notification.id());
        entity.setUserId(notification.userId());
        entity.setTitle(notification.title());
        entity.setBody(notification.body());
        entity.setDeepLink(notification.deepLink());
        entity.setPrivacySafe(notification.privacySafe());
        entity.setDeliveryStatus(notification.deliveryStatus());
        notificationRepository.save(entity);
    }

    @Transactional(readOnly = true)
    List<Notification> all() {
        return notificationRepository.findAll().stream().map(this::toNotification).toList();
    }

    private AiJob toJob(AiJobEntity entity) {
        return new AiJob(
                entity.getId(),
                entity.getUserId(),
                entity.getJobType(),
                JobStatus.valueOf(entity.getStatus()),
                entity.getResultRef(),
                entity.getErrorMessage(),
                entity.getDeepLink(),
                entity.getUpdatedAt()
        );
    }

    private Notification toNotification(NotificationEntity entity) {
        return new Notification(
                entity.getId(),
                entity.getUserId(),
                entity.getTitle(),
                entity.getBody(),
                entity.getDeepLink(),
                entity.isPrivacySafe(),
                entity.getDeliveryStatus(),
                entity.getCreatedAt()
        );
    }
}
