package com.healthcare.telemedicine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "telemedicine_intake_request", schema = "telemedicine_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemedicineIntakeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_email", nullable = false, length = 255)
    private String patientEmail;

    @Column(name = "doctor_email", nullable = false, length = 255)
    private String doctorEmail;

    /** Primary complaint / symptoms (required). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "additional_details", columnDefinition = "TEXT")
    private String additionalDetails;

    /** e.g. ROUTINE, URGENT */
    @Column(length = 32)
    private String urgency;

    @Column(name = "symptom_duration", length = 255)
    private String symptomDuration;

    @Column(name = "current_medications", columnDefinition = "TEXT")
    private String currentMedications;

    @Column(name = "known_allergies", columnDefinition = "TEXT")
    private String knownAllergies;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private IntakeRequestStatus status;

    /** Set when doctor books a TelemedicineConsultation for this intake. */
    @Column(name = "consultation_id")
    private Long consultationId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
