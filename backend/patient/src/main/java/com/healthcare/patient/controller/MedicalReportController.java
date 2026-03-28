package com.healthcare.patient.controller;

import com.healthcare.patient.entity.MedicalReport;
import com.healthcare.patient.service.FileStorageService;
import com.healthcare.patient.service.MedicalReportService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/patients/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class MedicalReportController {

    private final MedicalReportService medicalReportService;
    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<MedicalReport> uploadReport(Authentication authentication, @RequestParam("file") MultipartFile file) {
        String email = authentication.getName();
        return ResponseEntity.ok(medicalReportService.uploadReport(email, file));
    }

    @GetMapping
    public ResponseEntity<List<MedicalReport>> getMyReports(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(medicalReportService.getPatientReports(email));
    }

    @GetMapping("/download/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName, HttpServletRequest request) {
        Resource resource = fileStorageService.loadFileAsResource(fileName);
        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            contentType = "application/octet-stream";
        }
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}