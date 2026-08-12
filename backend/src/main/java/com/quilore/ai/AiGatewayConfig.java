package com.quilore.ai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(AiGatewayProperties.class)
public class AiGatewayConfig {

    @Bean
    public WebClient aiServiceWebClient(AiGatewayProperties properties) {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMillis(properties.readTimeoutMs()));
        var builder = WebClient.builder()
                .baseUrl(properties.serviceUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient));
        if (!properties.internalApiToken().isBlank()) {
            builder.defaultHeader("X-Internal-Token", properties.internalApiToken());
        }
        return builder.build();
    }
}
