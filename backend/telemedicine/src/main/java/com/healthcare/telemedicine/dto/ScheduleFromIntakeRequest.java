package com.healthcare.telemedicine.dto;

import lombok.Data;

@Data
public class ScheduleFromIntakeRequest {
    private String scheduledStartAt;
    private Integer durationMinutes;
    /** Optional instructions from doctor shown with the visit details. */
    private String doctorMessage;
}
