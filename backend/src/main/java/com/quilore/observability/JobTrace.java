package com.quilore.observability;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.UUID;

/**
 * Lightweight job tracing helper until a dedicated worker framework lands.
 * Emits structured MDC fields so background work can be correlated across services.
 */
public final class JobTrace implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(JobTrace.class);

    private final String previousJobId;
    private final String jobId;
    private final String jobName;

    private JobTrace(String jobName, String jobId) {
        this.jobName = jobName;
        this.jobId = jobId;
        this.previousJobId = MDC.get("jobId");
        MDC.put("jobId", jobId);
        MDC.put("jobName", jobName);
        log.info("job_started name={} jobId={}", jobName, jobId);
    }

    public static JobTrace start(String jobName) {
        return new JobTrace(jobName, UUID.randomUUID().toString());
    }

    public String jobId() {
        return jobId;
    }

    @Override
    public void close() {
        log.info("job_finished name={} jobId={}", jobName, jobId);
        if (previousJobId == null) {
            MDC.remove("jobId");
        } else {
            MDC.put("jobId", previousJobId);
        }
        MDC.remove("jobName");
    }
}
