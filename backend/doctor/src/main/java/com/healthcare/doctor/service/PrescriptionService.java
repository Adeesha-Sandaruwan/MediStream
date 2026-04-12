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

    public DigitalPrescription issue(String doctorEmail, PrescriptionDto dto) {
        String normalizedDoctorEmail = normalizeEmail(doctorEmail);
        String profileSignatureImage = doctorProfileRepository.findByEmail(normalizedDoctorEmail)
                .map(profile -> profile.getDoctorSignatureImage())
                .orElse(null);
        String validatedSignatureImage = resolveSignatureImage(profileSignatureImage);
        if (validatedSignatureImage == null) {
            throw new RuntimeException("Please upload your digital signature image in Doctor Profile before issuing prescriptions");
        }

        DigitalPrescription prescription = DigitalPrescription.builder()
                .doctorEmail(normalizedDoctorEmail)
                .patientEmail(normalizeEmail(dto.getPatientEmail()))
                .appointmentId(dto.getAppointmentId())
                .diagnosis(dto.getDiagnosis())
                .medications(dto.getMedications())
                .advice(dto.getAdvice())
            .doctorSignature(null)
            .doctorSignatureImage(validatedSignatureImage)
                .followUpDate(dto.getFollowUpDate())
                .issuedAt(LocalDateTime.now())
                .build();
        return digitalPrescriptionRepository.save(prescription);
    }

    public List<DigitalPrescription> getMyIssuedPrescriptions(String doctorEmail) {
        return digitalPrescriptionRepository.findByDoctorEmailOrderByIssuedAtDesc(normalizeEmail(doctorEmail));
    }

    public List<DigitalPrescription> getPatientPrescriptions(String patientEmail) {
        return digitalPrescriptionRepository.findByPatientEmailIgnoreCaseOrderByIssuedAtDesc(normalizeEmail(patientEmail));
    }

    public List<DigitalPrescription> getPatientPrescriptionsForAuthenticatedUser(String patientEmail) {
        return digitalPrescriptionRepository.findByPatientEmailIgnoreCaseOrderByIssuedAtDesc(normalizeEmail(patientEmail));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required");
        }
        return email.trim().toLowerCase(Locale.ENGLISH);
    }

    private String resolveSignatureImage(String signatureImage) {
        if (signatureImage == null || signatureImage.isBlank()) {
            return null;
        }
        String trimmed = signatureImage.trim();
        if (!trimmed.startsWith("data:image/")) {
            throw new RuntimeException("Invalid signature image format");
        }
        if (trimmed.length() > 1_500_000) {
            throw new RuntimeException("Signature image is too large");
        }
        return trimmed;
    }
}
