package com.healthcare.symptomchecker.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SymptomAnalysisRequest(
        @NotBlank(message = "symptoms is required")
        @Size(max = 2000, message = "symptoms must be at most 2000 characters")
        String symptoms,

        @Min(value = 0, message = "age cannot be negative")
        @Max(value = 130, message = "age must be realistic")
        Integer age,

        @Size(max = 32, message = "gender must be at most 32 characters")
        String gender,

        @Size(max = 2000, message = "medicalHistory must be at most 2000 characters")
        String medicalHistory
) {
}
