package com.healthcare.doctor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "digital_prescriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DigitalPrescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String doctorEmail;

    @Column(nullable = false)
    private String patientEmail;

    private Long appointmentId;
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String medications;

    @Column(columnDefinition = "TEXT")
    private String advice;

    private String doctorSignature;

    private String followUpDate;
    private LocalDateTime issuedAt;
}
