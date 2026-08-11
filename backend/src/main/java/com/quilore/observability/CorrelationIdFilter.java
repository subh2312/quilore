package com.quilore.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Propagates / generates correlation IDs for structured logs and cross-service tracing.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_HEADER = "X-Correlation-ID";
    public static final String TRACEPARENT_HEADER = "traceparent";
    public static final String MDC_CORRELATION = "correlationId";
    public static final String MDC_TRACEPARENT = "traceparent";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String correlationId = firstNonBlank(
                request.getHeader(CORRELATION_HEADER),
                extractTraceId(request.getHeader(TRACEPARENT_HEADER)),
                UUID.randomUUID().toString()
        );
        String traceparent = firstNonBlank(
                request.getHeader(TRACEPARENT_HEADER),
                "00-" + correlationId.replace("-", "") + "-0000000000000001-01"
        );

        MDC.put(MDC_CORRELATION, correlationId);
        MDC.put(MDC_TRACEPARENT, traceparent);
        response.setHeader(CORRELATION_HEADER, correlationId);
        response.setHeader(TRACEPARENT_HEADER, traceparent);

        long started = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - started) / 1_000_000L;
            MDC.put("durationMs", String.valueOf(durationMs));
            MDC.put("httpStatus", String.valueOf(response.getStatus()));
            MDC.remove("durationMs");
            MDC.remove("httpStatus");
            MDC.remove(MDC_CORRELATION);
            MDC.remove(MDC_TRACEPARENT);
        }
    }

    private static String extractTraceId(String traceparent) {
        if (traceparent == null || traceparent.isBlank()) {
            return null;
        }
        String[] parts = traceparent.trim().split("-");
        if (parts.length >= 2 && parts[1].length() >= 16) {
            return parts[1];
        }
        return null;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
