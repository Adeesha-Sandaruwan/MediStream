package com.healthcare.telemedicine.dto;

import java.time.Instant;

public record PendingConsultationDto(
        Long id,
        /** Linked patient intake when this visit was booked from a request. */
        Long intakeRequestId,
        String roomId,
        String roomUrl,
        String patientEmail,
        String doctorEmail,
        /** Doctor-provided details (stored in consultation {@code symptoms} column). */
        String consultationDetails,
        String status,
        Instant createdAt,
        Instant scheduledStartAt,
        Instant scheduledEndAt
) {}
