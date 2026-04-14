package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.PrescriptionDto;
import com.healthcare.doctor.entity.DigitalPrescription;
import com.healthcare.doctor.repository.DigitalPrescriptionRepository;
import com.healthcare.doctor.repository.DoctorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final DigitalPrescriptionRepository digitalPrescriptionRepository;
    private final DoctorProfileRepository doctorProfileRepository;

    // Issues a new digital prescription from the authenticated doctor to a patient.
    // Steps:
    //   1. Normalize the doctor's email for consistent lookup.
    //   2. Fetch the doctor's signature image from their profile.
    //   3. Validate the signature image; reject if absent or invalid (prevents unsigned prescriptions).
    //   4. Build and persist the prescription record.
    public DigitalPrescription issue(String doctorEmail, PrescriptionDto dto) {
        String normalizedDoctorEmail = normalizeEmail(doctorEmail);

        // Load the doctor's stored signature image; returns null if the profile is not found.
        String profileSignatureImage = doctorProfileRepository.findByEmail(normalizedDoctorEmail)
                .map(profile -> profile.getDoctorSignatureImage())
                .orElse(null);

        // Validate image format and size; null is returned when the image is missing/invalid.
        String validatedSignatureImage = resolveSignatureImage(profileSignatureImage);
        if (validatedSignatureImage == null) {
            // Block prescription issuance until the doctor uploads a signature in their settings.
            throw new RuntimeException("Please upload your digital signature image in Doctor Profile before issuing prescriptions");
        }

        DigitalPrescription prescription = DigitalPrescription.builder()
                .doctorEmail(normalizedDoctorEmail)
                .patientEmail(normalizeEmail(dto.getPatientEmail())) // Normalize patient email too.
                .appointmentId(dto.getAppointmentId())
                .diagnosis(dto.getDiagnosis())
                .medications(dto.getMedications())
                .advice(dto.getAdvice())
            .doctorSignature(null)           // Text signature reserved for future use.
            .doctorSignatureImage(validatedSignatureImage) // Embed the validated image data URI.
                .followUpDate(dto.getFollowUpDate())
                .issuedAt(LocalDateTime.now()) // Capture the exact issuance timestamp.
                .build();
        return digitalPrescriptionRepository.save(prescription);
    }

    // Returns all prescriptions issued by this doctor sorted by issuance date (newest first).
    public List<DigitalPrescription> getMyIssuedPrescriptions(String doctorEmail) {
        return digitalPrescriptionRepository.findByDoctorEmailOrderByIssuedAtDesc(normalizeEmail(doctorEmail));
    }

    // Returns all prescriptions for a patient, looked up by email (case-insensitive).
    // Used in the doctor-facing patient view.
    public List<DigitalPrescription> getPatientPrescriptions(String patientEmail) {
        return digitalPrescriptionRepository.findByPatientEmailIgnoreCaseOrderByIssuedAtDesc(normalizeEmail(patientEmail));
    }

    // Patient-facing variant of getPatientPrescriptions; the authenticated user is treated as the patient.
    public List<DigitalPrescription> getPatientPrescriptionsForAuthenticatedUser(String patientEmail) {
        return digitalPrescriptionRepository.findByPatientEmailIgnoreCaseOrderByIssuedAtDesc(normalizeEmail(patientEmail));
    }

    // Normalizes an email to lowercase and trims whitespace for consistent database lookups.
    // Throws immediately if the email is null or blank to fail fast before any DB call.
    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required");
        }
        return email.trim().toLowerCase(Locale.ENGLISH);
    }

    // Validates a Base64 data URI signature image before embedding it in a prescription.
    // Returns null when the image is absent (triggers the 'upload signature first' guard above).
    // Rejects:
    //   - Non-data:image/ URIs (wrong format)
    //   - Images exceeding ~1.1 MB (1,500,000 characters in Base64 ≈ 1.1 MB binary)
    private String resolveSignatureImage(String signatureImage) {
        if (signatureImage == null || signatureImage.isBlank()) {
            return null;
        }
        String trimmed = signatureImage.trim();
        if (!trimmed.startsWith("data:image/")) {
            throw new RuntimeException("Invalid signature image format");
        }
        if (trimmed.length() > 1_500_000) { // Prescriptions use a tighter size limit than the profile setting.
            throw new RuntimeException("Signature image is too large");
        }
        return trimmed;
    }
}
