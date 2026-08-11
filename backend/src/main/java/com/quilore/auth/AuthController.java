package com.quilore.auth;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        var user = authService.register(body.get("email"), body.get("password"), body.get("displayName"));
        var session = authService.loginAfterRegister(body.get("email"), body.get("password"));
        return ResponseEntity.ok(sessionMap(user, session));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        var session = authService.login(body.get("email"), body.get("password"));
        var user = authService.requireUserById(session.userId());
        return ResponseEntity.ok(sessionMap(user, session));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        var session = authService.refresh(body.get("refreshToken"));
        var user = authService.requireUserById(session.userId());
        return ResponseEntity.ok(sessionMap(user, session));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> body) {
        authService.logout(body.get("refreshToken"));
        return ResponseEntity.ok(Map.of("loggedOut", true));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        UUID userId = CurrentUser.requireUserId();
        var user = authService.requireUserById(userId);
        return ResponseEntity.ok(Map.of(
                "id", user.id().toString(),
                "email", user.email(),
                "displayName", user.displayName(),
                "role", user.role()
        ));
    }

    private static Map<String, Object> sessionMap(AuthService.UserAccount user, AuthService.Session session) {
        return Map.of(
                "user", Map.of(
                        "id", user.id().toString(),
                        "email", user.email(),
                        "displayName", user.displayName(),
                        "role", user.role()
                ),
                "accessToken", session.accessToken(),
                "refreshToken", session.refreshToken(),
                "expiresAt", session.accessExpiresAt().toString()
        );
    }
}
