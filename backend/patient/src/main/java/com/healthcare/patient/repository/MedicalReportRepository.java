package com.healthcare.patient.repository;

import com.healthcare.patient.entity.MedicalReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MedicalReportRepository extends JpaRepository<MedicalReport, Long> {
    List<MedicalReport> findByPatientEmailOrderByUploadDateDesc(String patientEmail);
}