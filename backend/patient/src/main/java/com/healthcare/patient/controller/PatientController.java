package com.healthcare.patient.controller;

import com.healthcare.patient.dto.PatientProfileDto;
import com.healthcare.patient.entity.PatientProfile;
import com.healthcare.patient.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PatientController {

    private final PatientService patientService;

    @GetMapping("/profile")
    public ResponseEntity<PatientProfile> getProfile(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(patientService.getProfileByEmail(email));
    }

    @PutMapping("/profile")
    public ResponseEntity<PatientProfile> updateProfile(Authentication authentication, @RequestBody PatientProfileDto dto) {
        String email = authentication.getName();
        return ResponseEntity.ok(patientService.updateProfile(email, dto));
    }

    @GetMapping("/all")
    public ResponseEntity<List<PatientProfile>> getAllProfiles() {
        return ResponseEntity.ok(patientService.getAllProfiles());
    }

    @DeleteMapping("/profile")
    public ResponseEntity<String> deleteProfile(Authentication authentication) {
        String email = authentication.getName();
        patientService.deleteProfile(email);
        return ResponseEntity.ok("Profile deleted successfully");
    }
}