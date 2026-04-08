package com.healthcare.telemedicine.dto;

import java.time.Instant;

public record IntakeRequestViewDto(
        Long id,
        String patientEmail,
        String doctorEmail,
        String symptoms,
        String additionalDetails,
        String urgency,
        String symptomDuration,
        String currentMedications,
        String knownAllergies,
        String status,
        Instant createdAt,
        VisitSummaryDto visit
) {}
