package com.quilore.ai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(AiGatewayProperties.class)
public class AiGatewayConfig {

    @Bean
    public RestClient aiServiceRestClient(AiGatewayProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.connectTimeoutMs());
        requestFactory.setReadTimeout(properties.readTimeoutMs());
        var builder = RestClient.builder()
                .baseUrl(properties.serviceUrl())
                .requestFactory(requestFactory);
        if (!properties.internalApiToken().isBlank()) {
            builder.defaultHeader("X-Internal-Token", properties.internalApiToken());
        }
        return builder.build();
    }
}
