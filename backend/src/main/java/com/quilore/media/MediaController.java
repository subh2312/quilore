package com.quilore.media;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MinioMediaService minioMediaService;

    public MediaController(MinioMediaService minioMediaService) {
        this.minioMediaService = minioMediaService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        UUID userId = UUID.fromString(body.get("userId"));
        byte[] bytes = body.containsKey("contentBase64")
                ? Base64.getDecoder().decode(body.get("contentBase64"))
                : body.getOrDefault("content", "").getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok(minioMediaService.registerObject(
                userId,
                body.get("objectKey"),
                body.get("contentType"),
                bytes
        ));
    }
}
