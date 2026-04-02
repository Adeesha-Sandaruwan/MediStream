package com.healthcare.telemedicine.dto;

import java.time.Instant;

public record VisitSummaryDto(
        Long consultationId,
        String roomId,
        String roomUrl,
        Instant scheduledStartAt,
        Instant scheduledEndAt,
        String consultationStatus
) {}
