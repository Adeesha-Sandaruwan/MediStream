package com.healthcare.patient.service;

import com.healthcare.patient.entity.MedicalReport;
import com.healthcare.patient.repository.MedicalReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalReportService {

    private final FileStorageService fileStorageService;
    private final MedicalReportRepository medicalReportRepository;

    public MedicalReport uploadReport(String email, MultipartFile file) {
        String storedFileName = fileStorageService.storeFile(file);
        
        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/patients/reports/download/")
                .path(storedFileName)
                .toUriString();

        MedicalReport report = MedicalReport.builder()
                .patientEmail(email)
                .originalFileName(file.getOriginalFilename())
                .storedFileName(storedFileName)
                .fileType(file.getContentType())
                .fileUrl(fileDownloadUri)
                .uploadDate(LocalDateTime.now())
                .build();

        return medicalReportRepository.save(report);
    }

    public List<MedicalReport> getPatientReports(String email) {
        return medicalReportRepository.findByPatientEmailOrderByUploadDateDesc(email);
    }
}