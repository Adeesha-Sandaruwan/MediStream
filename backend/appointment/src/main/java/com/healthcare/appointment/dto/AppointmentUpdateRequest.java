package com.healthcare.appointment.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO for updating an existing appointment
 * All fields are optional - only provided fields will be updated
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentUpdateRequest {

    @FutureOrPresent(message = "Appointment date must be in the future or present")
    private LocalDateTime appointmentDate;

    @Min(value = 30, message = "Appointment duration must be 30 minutes")
    @Max(value = 30, message = "Appointment duration must be 30 minutes")
    private Integer durationMinutes;

    @Size(min = 5, max = 500, message = "Reason must be between 5 and 500 characters")
    private String reason;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}