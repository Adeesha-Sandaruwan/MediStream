package com.healthcare.telemedicine.repository;

import com.healthcare.telemedicine.entity.IntakeRequestStatus;
import com.healthcare.telemedicine.entity.TelemedicineIntakeRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TelemedicineIntakeRequestRepository extends JpaRepository<TelemedicineIntakeRequest, Long> {

    long countByDoctorEmailIgnoreCaseAndStatus(String doctorEmail, IntakeRequestStatus status);

    List<TelemedicineIntakeRequest> findByDoctorEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
            String doctorEmail,
            IntakeRequestStatus status
    );

    List<TelemedicineIntakeRequest> findByPatientEmailIgnoreCaseOrderByCreatedAtDesc(String patientEmail);
}
