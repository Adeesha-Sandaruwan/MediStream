package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.PrescriptionDto;
import com.healthcare.doctor.entity.DigitalPrescription;
import com.healthcare.doctor.repository.DigitalPrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final DigitalPrescriptionRepository digitalPrescriptionRepository;

    public DigitalPrescription issue(String doctorEmail, PrescriptionDto dto) {
        DigitalPrescription prescription = DigitalPrescription.builder()
                .doctorEmail(doctorEmail)
                .patientEmail(dto.getPatientEmail())
                .appointmentId(dto.getAppointmentId())
                .diagnosis(dto.getDiagnosis())
                .medications(dto.getMedications())
                .advice(dto.getAdvice())
                .followUpDate(dto.getFollowUpDate())
                .issuedAt(LocalDateTime.now())
                .build();
        return digitalPrescriptionRepository.save(prescription);
    }

    public List<DigitalPrescription> getMyIssuedPrescriptions(String doctorEmail) {
        return digitalPrescriptionRepository.findByDoctorEmailOrderByIssuedAtDesc(doctorEmail);
    }

    public List<DigitalPrescription> getPatientPrescriptions(String patientEmail) {
        return digitalPrescriptionRepository.findByPatientEmailOrderByIssuedAtDesc(patientEmail);
    }
}
