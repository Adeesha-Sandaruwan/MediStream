package com.healthcare.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AppointmentDecisionDto {
    private String status;
    private String doctorNotes;
    private String scheduledStartAt;
    private Integer durationMinutes;
    private Boolean regenerateLink;
}
