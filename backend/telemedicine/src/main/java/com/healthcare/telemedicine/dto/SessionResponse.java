package com.healthcare.telemedicine.dto;

import java.time.Instant;

/**
 * Video session payload returned to the client. Java record ensures predictable JSON with Jackson.
 */
public record SessionResponse(
        Long intakeRequestId,
        String roomId,
        String roomUrl,
        /** Same as roomUrl; convenient for sharing. */
        String shareUrl,
        String status,
        String consultationDetails,
        String patientEmail,
        String doctorEmail,
        String invitedDoctorEmail,
        Instant scheduledStartAt,
        Instant scheduledEndAt
) {}
