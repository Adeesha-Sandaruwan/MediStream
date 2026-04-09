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
import org.springframework.web.bind.annotation.PathVariable;
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

    @GetMapping("/public/{patientId}")
    public ResponseEntity<PatientPublicDto> getPatientById(@PathVariable Long patientId) {
        PatientProfile profile = patientService.getProfileById(patientId);
        String fullName = ((profile.getFirstName() == null ? "" : profile.getFirstName()) + " " + (profile.getLastName() == null ? "" : profile.getLastName())).trim();
        if (fullName.isEmpty()) {
            fullName = profile.getEmail();
        }

        PatientPublicDto dto = new PatientPublicDto(
                profile.getId(),
                fullName,
                profile.getEmail(),
                profile.getPhoneNumber(),
                profile.getDateOfBirth(),
                profile.getAddress(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getGender(),
                profile.getNationalId(),
                profile.getBloodGroup(),
                profile.getAllergies(),
                profile.getCurrentMedications(),
                profile.getChronicConditions(),
                profile.getPastSurgeries(),
                profile.getFamilyMedicalHistory(),
                profile.getEmergencyContactName(),
                profile.getEmergencyContactRelationship(),
                profile.getEmergencyContactPhone()
        );

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/public/{patientId}/exists")
    public ResponseEntity<Boolean> patientExists(@PathVariable Long patientId) {
        return ResponseEntity.ok(patientService.existsById(patientId));
    }

    @DeleteMapping("/profile")
    public ResponseEntity<String> deleteProfile(Authentication authentication) {
        String email = authentication.getName();
        patientService.deleteProfile(email);
        return ResponseEntity.ok("Profile deleted successfully");
    }

    public record PatientPublicDto(
            Long id,
            String name,
            String email,
            String phoneNumber,
            String dateOfBirth,
            String address,
            String firstName,
            String lastName,
            String gender,
            String nationalId,
            String bloodGroup,
            String allergies,
            String currentMedications,
            String chronicConditions,
            String pastSurgeries,
            String familyMedicalHistory,
            String emergencyContactName,
            String emergencyContactRelationship,
            String emergencyContactPhone
    ) {}
}