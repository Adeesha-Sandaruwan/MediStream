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

// JPA entity representing the doctor-side view of an appointment request.
// This is a local mirror/shadow of appointment data kept in the doctor service's own database
// to support offline rendering and doctor decision tracking without cross-service round-trips.
@Entity
@Table(name = "doctor_appointment_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorAppointmentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Foreign key (logical) to the canonical appointment in the Appointment microservice.
    // Marked unique so that each appointment maps to at most one doctor-side request record.
    @Column(nullable = false, unique = true)
    private Long appointmentId;

    @Column(nullable = false)
    private String doctorEmail; // Email of the doctor this request is assigned to.

    @Column(nullable = false)
    private String patientEmail; // Email of the patient who booked the appointment.

    private String scheduledAt;  // ISO-8601 date/time string for the appointment slot.

    // Lifecycle status: PENDING → ACCEPTED/REJECTED → COMPLETED.
    private String status;

    // Free-text notes written by the doctor when accepting or completing the appointment.
    @Column(columnDefinition = "TEXT")
    private String doctorNotes;

    // Tracks when this record was last modified; used for sorting the doctor's appointment list.
    private LocalDateTime updatedAt;
}
