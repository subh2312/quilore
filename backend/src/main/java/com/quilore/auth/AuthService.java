package com.quilore.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    public record UserAccount(UUID id, String email, String passwordHash, String displayName, String role) {}
    public record Session(String accessToken, String refreshToken, Instant accessExpiresAt, UUID userId) {}

    private final Map<String, UserAccount> usersByEmail = new ConcurrentHashMap<>();
    private final Map<String, UUID> refreshTokens = new ConcurrentHashMap<>();
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final String jwtSecret;
    private final Map<String, Instant> lastAuthAttempt = new ConcurrentHashMap<>();

    public AuthService(@Value("${quilore.security.jwt-secret:dev-only-jwt-secret-change-me-32b}") String jwtSecret) {
        this.jwtSecret = jwtSecret == null || jwtSecret.isBlank()
                ? "dev-only-jwt-secret-change-me-32b"
                : jwtSecret;
    }

    public synchronized UserAccount register(String email, String password, String displayName) {
        String normalized = email.trim().toLowerCase();
        if (usersByEmail.containsKey(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account already exists");
        }
        if (password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password too short");
        }
        UserAccount user = new UserAccount(
                UUID.randomUUID(),
                normalized,
                passwordEncoder.encode(password),
                displayName == null ? normalized : displayName,
                "USER"
        );
        usersByEmail.put(normalized, user);
        return user;
    }

    public Session login(String email, String password) {
        String normalized = email.trim().toLowerCase();
        rateLimitFailedAttempts(normalized);
        try {
            return authenticate(normalized, password);
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == 401) {
                markFailedAttempt(normalized);
            }
            throw ex;
        }
    }

    public Session loginAfterRegister(String email, String password) {
        return authenticate(email.trim().toLowerCase(), password);
    }

    private Session authenticate(String normalizedEmail, String password) {
        UserAccount user = usersByEmail.get(normalizedEmail);
        if (user == null || !passwordEncoder.matches(password, user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return issueSession(user);
    }

    public Session refresh(String refreshToken) {
        UUID userId = refreshTokens.get(refreshToken);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        UserAccount user = usersByEmail.values().stream()
                .filter(u -> u.id().equals(userId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        refreshTokens.remove(refreshToken);
        return issueSession(user);
    }

    public void logout(String refreshToken) {
        refreshTokens.remove(refreshToken);
    }

    public UserAccount requireUser(String accessToken) {
        try {
            String[] parts = accessToken.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("bad token");
            }
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            if (!payloadJson.contains("\"sub\"")) {
                throw new IllegalArgumentException("bad payload");
            }
            String email = payloadJson.replaceAll("(?s).*\"sub\":\"([^\"]+)\".*", "$1");
            long exp = Long.parseLong(payloadJson.replaceAll("(?s).*\"exp\":(\\d+).*", "$1"));
            if (Instant.now().getEpochSecond() > exp) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token expired");
            }
            String signingInput = parts[0] + "." + parts[1];
            if (!sign(signingInput).equals(parts[2])) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
            }
            UserAccount user = usersByEmail.get(email);
            if (user == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
            }
            return user;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
    }

    private Session issueSession(UserAccount user) {
        Instant exp = Instant.now().plusSeconds(3600);
        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"sub\":\"" + user.email() + "\",\"uid\":\"" + user.id() + "\",\"role\":\"" + user.role()
                        + "\",\"exp\":" + exp.getEpochSecond() + "}").getBytes(StandardCharsets.UTF_8)
        );
        String access = header + "." + payload + "." + sign(header + "." + payload);
        String refresh = UUID.randomUUID() + "." + UUID.randomUUID();
        refreshTokens.put(refresh, user.id());
        return new Session(access, refresh, exp, user.id());
    }

    private String sign(String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign token", ex);
        }
    }

    private void rateLimitFailedAttempts(String key) {
        Instant last = lastAuthAttempt.get(key);
        Instant now = Instant.now();
        if (last != null && last.plusMillis(200).isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts");
        }
    }

    private void markFailedAttempt(String key) {
        lastAuthAttempt.put(key, Instant.now());
    }
}
