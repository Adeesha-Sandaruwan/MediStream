package com.healthcare.telemedicine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "telemedicine_consultation", schema = "telemedicine_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemedicineConsultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_room_id", nullable = false, unique = true, length = 128)
    private String publicRoomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ConsultationStatus status;

    @Column(name = "patient_email", nullable = false, length = 255)
    private String patientEmail;

    @Column(name = "invited_doctor_email", length = 255)
    private String invitedDoctorEmail;

    @Column(name = "doctor_email", length = 255)
    private String doctorEmail;

    @Column(name = "external_appointment_id", length = 64)
    private String externalAppointmentId;

    @Column(name = "video_provider", nullable = false, length = 32)
    private String videoProvider;

    @Column(name = "room_url", length = 512)
    private String roomUrl;

    /** Doctor notes / consultation details shared with the patient. */
    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "scheduled_start_at")
    private Instant scheduledStartAt;

    @Column(name = "scheduled_end_at")
    private Instant scheduledEndAt;

    /** When this visit was created from a patient intake request. */
    @Column(name = "intake_request_id")
    private Long intakeRequestId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

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
