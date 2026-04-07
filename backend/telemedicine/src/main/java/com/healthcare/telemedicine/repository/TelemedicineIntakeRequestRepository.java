package com.healthcare.telemedicine.repository;

import com.healthcare.telemedicine.entity.IntakeRequestStatus;
import com.healthcare.telemedicine.entity.TelemedicineIntakeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface TelemedicineIntakeRequestRepository extends JpaRepository<TelemedicineIntakeRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TelemedicineIntakeRequest> findById(Long id);

    long countByDoctorEmailIgnoreCaseAndStatus(String doctorEmail, IntakeRequestStatus status);

    List<TelemedicineIntakeRequest> findByDoctorEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
            String doctorEmail,
            IntakeRequestStatus status
    );

    List<TelemedicineIntakeRequest> findByPatientEmailIgnoreCaseOrderByCreatedAtDesc(String patientEmail);
}
