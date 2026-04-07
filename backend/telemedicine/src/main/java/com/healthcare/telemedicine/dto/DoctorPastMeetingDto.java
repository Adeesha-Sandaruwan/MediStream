package com.healthcare.telemedicine.dto;

import java.time.Instant;

/**
 * Compact doctor history row for previously completed telemedicine visits.
 */
public record DoctorPastMeetingDto(
        Long id,
        Long intakeRequestId,
        String patientEmail,
        String roomId,
        String status,
        String consultationDetails,
        Instant scheduledStartAt,
        Instant scheduledEndAt,
        Instant startedAt,
        Instant endedAt
) {}

