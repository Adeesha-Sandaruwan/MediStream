package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.PrescriptionDto;
import com.healthcare.doctor.entity.DigitalPrescription;
import com.healthcare.doctor.repository.DigitalPrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final DigitalPrescriptionRepository digitalPrescriptionRepository;

    public DigitalPrescription issue(String doctorEmail, PrescriptionDto dto) {
        DigitalPrescription prescription = DigitalPrescription.builder()
                .doctorEmail(normalizeEmail(doctorEmail))
                .patientEmail(normalizeEmail(dto.getPatientEmail()))
                .appointmentId(dto.getAppointmentId())
                .diagnosis(dto.getDiagnosis())
                .medications(dto.getMedications())
                .advice(dto.getAdvice())
                .doctorSignature(resolveSignature(dto.getDoctorSignature(), doctorEmail))
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

    private String resolveSignature(String signature, String doctorEmail) {
        if (signature == null || signature.isBlank()) {
            return normalizeEmail(doctorEmail);
        }
        return signature.trim();
    }
}
