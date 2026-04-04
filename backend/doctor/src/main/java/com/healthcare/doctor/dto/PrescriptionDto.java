package com.healthcare.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PrescriptionDto {
    private String patientEmail;
    private Long appointmentId;
    private String diagnosis;
    private String medications;
    private String advice;
    private String doctorSignature;
    private String followUpDate;
}
