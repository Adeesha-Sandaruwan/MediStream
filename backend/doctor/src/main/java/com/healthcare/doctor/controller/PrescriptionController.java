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

// REST controller for issuing and retrieving digital prescriptions.
// Doctors create prescriptions linked to an appointment; patients can also view their own history.
@RestController
@RequestMapping("/api/doctors/prescriptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    // POST /api/doctors/prescriptions — Issues a new digital prescription.
    // The doctor must have a valid signature image uploaded in their profile first.
    @PostMapping
    public ResponseEntity<DigitalPrescription> issue(
            Authentication authentication,
            @RequestBody PrescriptionDto dto
    ) {
        return ResponseEntity.ok(prescriptionService.issue(authentication.getName(), dto));
    }

    // GET /api/doctors/prescriptions/mine — Returns all prescriptions issued by this doctor,
    // ordered by issue date descending (most recent first).
    @GetMapping("/mine")
    public ResponseEntity<List<DigitalPrescription>> getMine(Authentication authentication) {
        return ResponseEntity.ok(prescriptionService.getMyIssuedPrescriptions(authentication.getName()));
    }

    // GET /api/doctors/prescriptions/patient?patientEmail=... — Fetches all prescriptions
    // for a specific patient (searched case-insensitively). Used in the doctor view.
    @GetMapping("/patient")
    public ResponseEntity<List<DigitalPrescription>> getPatientPrescriptions(
            @RequestParam String patientEmail
    ) {
        return ResponseEntity.ok(prescriptionService.getPatientPrescriptions(patientEmail));
    }

    // GET /api/doctors/prescriptions/patient/me — Patient-facing endpoint.
    // Returns all prescriptions for the currently logged-in user (treated as a patient here).
    @GetMapping("/patient/me")
    public ResponseEntity<List<DigitalPrescription>> getMyPatientPrescriptionHistory(
            Authentication authentication
    ) {
        return ResponseEntity.ok(prescriptionService.getPatientPrescriptionsForAuthenticatedUser(authentication.getName()));
    }
}
