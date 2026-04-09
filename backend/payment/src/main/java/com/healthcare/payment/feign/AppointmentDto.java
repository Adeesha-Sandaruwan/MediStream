package com.healthcare.payment.feign;

import lombok.*;

/**
 * Appointment DTO for Feign client response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentDto {
    private Long id;
    private Long patientId;
    private Long doctorId;
    private String appointmentDate;
    private Integer durationMinutes;
    private String reason;
    private String notes;
    private String status;
    private String createdAt;
    private String updatedAt;
}

