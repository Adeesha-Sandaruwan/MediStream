package com.healthcare.symptomchecker.dto;

import java.util.List;

public record SymptomAnalysisResponse(
        String urgencyLevel,
        List<String> preliminarySuggestions,
        List<String> recommendedDoctorSpecialties,
        String disclaimer
) {
}
