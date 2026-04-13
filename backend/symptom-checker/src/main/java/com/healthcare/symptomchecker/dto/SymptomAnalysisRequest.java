package com.healthcare.symptomchecker.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Immutable request payload for AI symptom triage.
// Bean Validation annotations enforce API input quality before reaching service logic.
public record SymptomAnalysisRequest(
        // Free-text symptom description from the patient.
        // Required and capped to prevent prompt abuse / oversized payloads.
        @NotBlank(message = "symptoms is required")
        @Size(max = 2000, message = "symptoms must be at most 2000 characters")
        String symptoms,

        // Optional age input used to tailor urgency and specialty suggestions.
        // Guarded with realistic limits to block nonsensical values.
        @Min(value = 0, message = "age cannot be negative")
        @Max(value = 130, message = "age must be realistic")
        Integer age,

        // Optional gender context (limited length to avoid prompt injection via long inputs).
        @Size(max = 32, message = "gender must be at most 32 characters")
        String gender,

        // Optional relevant medical history (chronic diseases, prior conditions, etc.).
        // Included in prompting and fallback analysis to improve triage relevance.
        @Size(max = 2000, message = "medicalHistory must be at most 2000 characters")
        String medicalHistory
) {
}
