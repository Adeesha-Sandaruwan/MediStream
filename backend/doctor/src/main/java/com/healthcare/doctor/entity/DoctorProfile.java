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

// JPA entity representing a doctor's complete profile stored in the 'doctor_profiles' table.
// A profile record is lazily created on first login if one does not already exist.
@Entity
@Table(name = "doctor_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email is the unique identifier tying this profile to the Auth service user account.
    @Column(unique = true, nullable = false)
    private String email;

    private String firstName;           // Doctor's given name.
    private String lastName;            // Doctor's family name.
    private String phoneNumber;         // Contact number for clinic or personal reach.
    private String specialty;           // Medical specialty (e.g., Cardiology, Neurology).
    private String qualifications;      // Degrees and certifications (e.g., MBBS, MD).
    private String licenseNumber;       // Medical license number for verification purposes.
    private String experienceYears;     // Total years of clinical experience.
    private String consultationFee;     // Consultation charge displayed to patients on booking.
    private String hospitalAffiliation; // Primary hospital or clinic the doctor is associated with.

    // TEXT mapped column to handle long-form biographical descriptions without varchar truncation.
    @Column(columnDefinition = "TEXT")
    private String bio;

    // Base64-encoded data URI (e.g., data:image/png;base64,...) of the doctor's digital signature.
    // Stored as TEXT because base64 strings can exceed typical varchar limits.
    @Column(columnDefinition = "TEXT")
    private String doctorSignatureImage;

    // Indicates whether the doctor has been verified by an admin.
    // Only verified doctors appear as 'available' to patients during booking.
    private Boolean verified;
}
