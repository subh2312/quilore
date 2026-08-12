package com.quilore.media;

import jakarta.validation.constraints.Size;

public record MediaRegisterRequest(
        @Size(max = 512) String objectKey,
        @Size(max = 128) String contentType,
        @Size(max = 2_000_000) String contentBase64,
        @Size(max = 1_000_000) String content
) {}
