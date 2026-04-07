package com.healthcare.appointment.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO for creating a new appointment
 * Contains validation annotations for input validation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentCreateRequest {

    @NotNull(message = "Patient ID is required")
    @Positive(message = "Patient ID must be positive")
    private Long patientId;

    @NotNull(message = "Doctor ID is required")
    @Positive(message = "Doctor ID must be positive")
    private Long doctorId;

    @NotNull(message = "Appointment date is required")
    @FutureOrPresent(message = "Appointment date must be in the future or present")
    private LocalDateTime appointmentDate;

    @NotNull(message = "Duration is required")
    @Min(value = 15, message = "Minimum appointment duration is 15 minutes")
    @Max(value = 480, message = "Maximum appointment duration is 480 minutes")
    private Integer durationMinutes;

    @NotBlank(message = "Reason is required")
    @Size(min = 5, max = 500, message = "Reason must be between 5 and 500 characters")
    private String reason;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;
}