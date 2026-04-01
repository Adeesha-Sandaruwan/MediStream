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
@Table(name = "doctor_appointment_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorAppointmentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long appointmentId;

    @Column(nullable = false)
    private String doctorEmail;

    @Column(nullable = false)
    private String patientEmail;

    private String scheduledAt;
    private String status;

    @Column(columnDefinition = "TEXT")
    private String doctorNotes;

    private LocalDateTime updatedAt;
}
