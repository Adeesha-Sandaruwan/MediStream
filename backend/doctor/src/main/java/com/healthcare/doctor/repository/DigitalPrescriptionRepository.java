package com.healthcare.doctor.repository;

import com.healthcare.doctor.entity.DigitalPrescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DigitalPrescriptionRepository extends JpaRepository<DigitalPrescription, Long> {
    List<DigitalPrescription> findByDoctorEmailOrderByIssuedAtDesc(String doctorEmail);
    List<DigitalPrescription> findByPatientEmailOrderByIssuedAtDesc(String patientEmail);
    List<DigitalPrescription> findByPatientEmailIgnoreCaseOrderByIssuedAtDesc(String patientEmail);
}
