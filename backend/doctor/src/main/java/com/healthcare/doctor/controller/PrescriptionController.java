package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.PrescriptionDto;
import com.healthcare.doctor.entity.DigitalPrescription;
import com.healthcare.doctor.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/doctors/prescriptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    public ResponseEntity<DigitalPrescription> issue(
            Authentication authentication,
            @RequestBody PrescriptionDto dto
    ) {
        return ResponseEntity.ok(prescriptionService.issue(authentication.getName(), dto));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<DigitalPrescription>> getMine(Authentication authentication) {
        return ResponseEntity.ok(prescriptionService.getMyIssuedPrescriptions(authentication.getName()));
    }

    @GetMapping("/patient")
    public ResponseEntity<List<DigitalPrescription>> getPatientPrescriptions(
            @RequestParam String patientEmail
    ) {
        return ResponseEntity.ok(prescriptionService.getPatientPrescriptions(patientEmail));
    }
}
