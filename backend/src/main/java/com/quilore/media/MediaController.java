package com.quilore.media;

import com.quilore.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MinioMediaService minioMediaService;

    public MediaController(MinioMediaService minioMediaService) {
        this.minioMediaService = minioMediaService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody MediaRegisterRequest body) {
        var owner = CurrentUser.requireUserId();
        byte[] bytes;
        if (body.contentBase64() != null && !body.contentBase64().isBlank()) {
            bytes = Base64.getDecoder().decode(body.contentBase64());
        } else {
            bytes = (body.content() == null ? "" : body.content()).getBytes(StandardCharsets.UTF_8);
        }
        return ResponseEntity.ok(minioMediaService.registerObject(
                owner,
                body.objectKey(),
                body.contentType(),
                bytes
        ));
    }
}
