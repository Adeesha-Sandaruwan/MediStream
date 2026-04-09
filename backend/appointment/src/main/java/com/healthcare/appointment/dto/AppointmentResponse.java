package com.healthcare.appointment.dto;

import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.entity.AppointmentPaymentStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO for returning appointment data to clients
 * Includes all appointment information along with related entity details
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentResponse {

    private Long id;

    private Long patientId;
    private PatientInfo patientInfo;

    private Long doctorId;
    private DoctorInfo doctorInfo;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime appointmentDate;

    private Integer durationMinutes;

    private String reason;

    private String notes;

    private AppointmentStatus status;

    private AppointmentPaymentStatus paymentStatus;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime cancelledAt;

    private String cancelledReason;

    /**
     * Inner class for patient information
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PatientInfo {
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
    }

    /**
     * Inner class for doctor information
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DoctorInfo {
        private Long id;
        private String name;
        private String email;
        private String specialization;
        private String phoneNumber;
    }
}