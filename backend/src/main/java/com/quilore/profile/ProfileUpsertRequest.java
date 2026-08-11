package com.quilore.profile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ProfileUpsertRequest(
        @NotNull @Min(13) @Max(100) Integer age,
        @NotBlank @Size(max = 32) String sex,
        @NotNull @Positive Double heightCm,
        @NotNull @Positive Double weightKg,
        @Size(max = 64) String trainingExperience,
        @Size(max = 2000) String dietaryPreferences,
        @Size(max = 4000) String injuriesInfo,
        @Size(max = 2000) String equipmentAccess
) {}
