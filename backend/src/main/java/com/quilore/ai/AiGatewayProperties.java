package com.quilore.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quilore.ai")
public record AiGatewayProperties(
        String serviceUrl,
        int connectTimeoutMs,
        int readTimeoutMs,
        String internalApiToken
) {
    public AiGatewayProperties {
        if (serviceUrl == null || serviceUrl.isBlank()) {
            serviceUrl = "http://localhost:8000";
        }
        if (connectTimeoutMs <= 0) {
            connectTimeoutMs = 3000;
        }
        if (readTimeoutMs <= 0) {
            readTimeoutMs = 30000;
        }
        if (internalApiToken == null) {
            internalApiToken = "";
        }
    }
}
