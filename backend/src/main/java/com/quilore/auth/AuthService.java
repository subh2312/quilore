package com.quilore.auth;

import com.quilore.security.SecurityProperties;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    public record UserAccount(UUID id, String email, String passwordHash, String displayName, String role) {}
    public record Session(String accessToken, String refreshToken, Instant accessExpiresAt, UUID userId) {}

    private static final long ACCESS_TTL_SECONDS = 3600;
    private static final long REFRESH_TTL_SECONDS = 60L * 60 * 24 * 30;

    private final UserRepository userRepository;
    private final RefreshSessionRepository refreshSessionRepository;
    private final JwtEncoder jwtEncoder;
    private final SecurityProperties securityProperties;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Map<String, Instant> lastAuthAttempt = new ConcurrentHashMap<>();

    public AuthService(
            UserRepository userRepository,
            RefreshSessionRepository refreshSessionRepository,
            JwtEncoder jwtEncoder,
            SecurityProperties securityProperties
    ) {
        this.userRepository = userRepository;
        this.refreshSessionRepository = refreshSessionRepository;
        this.jwtEncoder = jwtEncoder;
        this.securityProperties = securityProperties;
    }

    @Transactional
    public synchronized UserAccount register(String email, String password, String displayName) {
        String normalized = normalizeEmail(email);
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account already exists");
        }
        if (password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password too short");
        }
        UserEntity entity = new UserEntity();
        entity.setEmail(normalized);
        entity.setPasswordHash(passwordEncoder.encode(password));
        entity.setDisplayName(displayName == null || displayName.isBlank() ? normalized : displayName);
        entity.setRole("USER");
        return toAccount(userRepository.save(entity));
    }

    @Transactional
    public Session login(String email, String password) {
        String normalized = normalizeEmail(email);
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

    @Transactional
    public Session loginAfterRegister(String email, String password) {
        return authenticate(normalizeEmail(email), password);
    }

    private Session authenticate(String normalizedEmail, String password) {
        UserEntity user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (user.isDisabled() || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return issueSession(user);
    }

    @Transactional
    public Session refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        String hash = hashToken(refreshToken);
        RefreshSessionEntity session = refreshSessionRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        Instant now = Instant.now();
        if (session.getRevokedAt() != null || session.getExpiresAt().isBefore(now)) {
            session.setRevokedAt(now);
            refreshSessionRepository.save(session);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        UserEntity user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        if (user.isDisabled()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        session.setRevokedAt(now);
        session.setLastUsedAt(now);
        Session issued = issueSession(user);
        // Mark rotation link after new session exists — replaced_by set once we persist new id.
        // Re-load newest session for this user by token hash of the new refresh token.
        RefreshSessionEntity replacement = refreshSessionRepository.findByTokenHash(hashToken(issued.refreshToken()))
                .orElseThrow();
        session.setReplacedBy(replacement.getId());
        refreshSessionRepository.save(session);
        return issued;
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshSessionRepository.findByTokenHash(hashToken(refreshToken)).ifPresent(session -> {
            session.setRevokedAt(Instant.now());
            refreshSessionRepository.save(session);
        });
    }

    @Transactional(readOnly = true)
    public UserAccount requireUserById(UUID userId) {
        return userRepository.findById(userId)
                .map(this::toAccount)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
    }

    @Transactional
    public UserAccount updateRole(UUID userId, String role) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(role);
        return toAccount(userRepository.save(user));
    }

    private Session issueSession(UserEntity user) {
        Instant now = Instant.now();
        Instant accessExp = now.plusSeconds(ACCESS_TTL_SECONDS);
        String accessToken = encodeAccessToken(user, now, accessExp);
        String refreshToken = UUID.randomUUID() + "." + UUID.randomUUID();

        RefreshSessionEntity refresh = new RefreshSessionEntity();
        refresh.setUserId(user.getId());
        refresh.setTokenHash(hashToken(refreshToken));
        refresh.setExpiresAt(now.plusSeconds(REFRESH_TTL_SECONDS));
        refreshSessionRepository.save(refresh);

        return new Session(accessToken, refreshToken, accessExp, user.getId());
    }

    private String encodeAccessToken(UserEntity user, Instant issuedAt, Instant expiresAt) {
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(securityProperties.getJwtIssuer())
                .audience(List.of(securityProperties.getJwtAudience()))
                .subject(user.getId().toString())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("email", user.getEmail())
                .claim("role", user.getRole())
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /**
     * Issues a JWT with custom claims for negative-path tests (expired, wrong iss/aud).
     */
    public String issueTestToken(UUID userId, String role, Instant issuedAt, Instant expiresAt,
                                 String issuer, String audience) {
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(List.of(audience))
                .subject(userId.toString())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("email", "test@quilore.local")
                .claim("role", role)
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private UserAccount toAccount(UserEntity entity) {
        return new UserAccount(
                entity.getId(),
                entity.getEmail(),
                entity.getPasswordHash(),
                entity.getDisplayName(),
                entity.getRole()
        );
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return email.trim().toLowerCase();
    }

    static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
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
