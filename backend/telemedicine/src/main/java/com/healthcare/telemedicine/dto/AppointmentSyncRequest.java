package com.healthcare.telemedicine.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentSyncRequest {
    private Long appointmentId;
    private String patientEmail;
    private String doctorEmail;
    private String scheduledStartAt;
    private Integer durationMinutes;
    private String doctorNotes;
    private Boolean regenerateLink;
}

