package com.quilore.observability;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "management.endpoints.web.exposure.include=health,info,prometheus,metrics",
        "management.endpoint.prometheus.enabled=true",
        "management.prometheus.metrics.export.enabled=true"
})
@AutoConfigureMockMvc
class ObservabilityEndpointsTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthEchoesCorrelationId() throws Exception {
        mockMvc.perform(get("/api/health").header("X-Correlation-ID", "corr-test-123"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Correlation-ID", "corr-test-123"));
    }

    @Test
    void prometheusMetricsAreExposed() throws Exception {
        MvcResult result = mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("http_server_requests");
    }

    @Test
    void jobTraceSetsAndClearsMdc() {
        try (JobTrace job = JobTrace.start("demo-job")) {
            assertThat(job.jobId()).isNotBlank();
            assertThat(org.slf4j.MDC.get("jobId")).isEqualTo(job.jobId());
            assertThat(org.slf4j.MDC.get("jobName")).isEqualTo("demo-job");
        }
        assertThat(org.slf4j.MDC.get("jobId")).isNull();
    }
}
