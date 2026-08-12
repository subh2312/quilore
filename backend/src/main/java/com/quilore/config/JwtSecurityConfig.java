package com.quilore.config;

import com.quilore.security.SecurityProperties;
import com.quilore.security.SecuritySecretsValidator;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
public class JwtSecurityConfig {

    public static final String DEV_TEST_JWT_SECRET = "dev-only-jwt-secret-change-me-32b!!";

    private final SecurityProperties properties;

    public JwtSecurityConfig(SecurityProperties properties) {
        this.properties = properties;
    }

    @Bean
    SecretKey jwtSecretKey() {
        SecuritySecretsValidator.validateJwtSecret(
                properties.getJwtSecret(), properties.isAllowInsecureDefaults());
        String secret = properties.getJwtSecret();
        if ((secret == null || secret.isBlank()) && properties.isAllowInsecureDefaults()) {
            secret = DEV_TEST_JWT_SECRET;
        }
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(),
                new JwtIssuerValidator(properties.getJwtIssuer()),
                audienceValidator(properties.getJwtAudience())
        );
        decoder.setJwtValidator(validator);
        return decoder;
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(
                new com.nimbusds.jose.jwk.source.ImmutableSecret<>(jwtSecretKey.getEncoded()));
    }

    @Bean
    Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
        scopes.setAuthorityPrefix("SCOPE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>(scopes.convert(jwt));
            String role = jwt.getClaimAsString("role");
            if (role != null && !role.isBlank()) {
                String normalized = role.startsWith("ROLE_") ? role.substring(5) : role;
                authorities.add(new SimpleGrantedAuthority("ROLE_" + normalized));
            }
            return authorities;
        });
        converter.setPrincipalClaimName("sub");
        return converter;
    }

    private static OAuth2TokenValidator<Jwt> audienceValidator(String expectedAudience) {
        return token -> {
            List<String> audiences = token.getAudience();
            if (audiences != null && audiences.contains(expectedAudience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Required audience is missing", null));
        };
    }
}
