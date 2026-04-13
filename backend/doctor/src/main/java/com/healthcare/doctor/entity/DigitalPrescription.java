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

// JPA entity representing a digitally signed prescription issued by a doctor.
// Stored in the doctor service database so doctors can access their full prescription history
// and patients can retrieve prescriptions through the same microservice.
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
    private String doctorEmail; // Email of the issuing doctor (linked to DoctorProfile).

    @Column(nullable = false)
    private String patientEmail; // Email of the patient receiving the prescription.

    private Long appointmentId; // Reference to the appointment this prescription belongs to.
    private String diagnosis;   // Short textual description of the doctor's diagnosis.

    // Stored as TEXT to accommodate multi-drug, multi-dosage free-form prescription text.
    @Column(columnDefinition = "TEXT")
    private String medications;

    // General medical advice and lifestyle instructions given alongside the medications.
    @Column(columnDefinition = "TEXT")
    private String advice;

    // Reserved for a future text-based signature field (currently always null).
    private String doctorSignature;

    // Base64-encoded data URI of the doctor's handwritten signature image.
    // Must be a valid 'data:image/...' URI; validated before persisting.
    @Column(columnDefinition = "TEXT")
    private String doctorSignatureImage;

    private String followUpDate;   // Suggested follow-up date as a human-readable string.
    private LocalDateTime issuedAt; // Timestamp when the prescription was created.
}
