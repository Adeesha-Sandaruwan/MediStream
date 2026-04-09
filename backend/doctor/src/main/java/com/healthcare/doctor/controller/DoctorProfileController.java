package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.DoctorProfileDto;
import com.healthcare.doctor.entity.DoctorProfile;
import com.healthcare.doctor.service.DoctorProfileService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DoctorProfileController {

    private final DoctorProfileService doctorProfileService;

    @GetMapping("/profile")
    public ResponseEntity<DoctorProfile> getMyProfile(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(doctorProfileService.getProfileByEmail(email));
    }

    @PutMapping("/profile")
    public ResponseEntity<DoctorProfile> updateProfile(
            Authentication authentication,
            @RequestBody DoctorProfileDto dto
    ) {
        String email = authentication.getName();
        return ResponseEntity.ok(doctorProfileService.updateProfile(email, dto));
    }

    @GetMapping("/all")
    public ResponseEntity<List<DoctorProfile>> getAllDoctors(
            @RequestParam(required = false) String specialty
    ) {
        if (specialty != null && !specialty.isBlank()) {
            return ResponseEntity.ok(doctorProfileService.getDoctorsBySpecialty(specialty));
        }
        return ResponseEntity.ok(doctorProfileService.getAllDoctors());
    }

    @GetMapping("/public/{doctorId}")
    public ResponseEntity<DoctorPublicDto> getDoctorById(@PathVariable Long doctorId) {
        DoctorProfile profile = doctorProfileService.getProfileById(doctorId);
        String fullName = ((profile.getFirstName() == null ? "" : profile.getFirstName()) + " " + (profile.getLastName() == null ? "" : profile.getLastName())).trim();
        if (fullName.isEmpty()) {
            fullName = profile.getEmail();
        }

        DoctorPublicDto dto = new DoctorPublicDto(
                profile.getId(),
                fullName,
                profile.getEmail(),
                profile.getSpecialty(),
                profile.getPhoneNumber(),
                profile.getQualifications(),
                profile.getExperienceYears()
        );

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/public/{doctorId}/exists")
    public ResponseEntity<Boolean> doctorExists(@PathVariable Long doctorId) {
        return ResponseEntity.ok(doctorProfileService.existsById(doctorId));
    }

    @GetMapping("/public/{doctorId}/availability")
    public ResponseEntity<Boolean> doctorAvailability(@PathVariable Long doctorId) {
        return ResponseEntity.ok(doctorProfileService.isAvailableById(doctorId));
    }

    @DeleteMapping("/profile")
    public ResponseEntity<String> deleteProfile(Authentication authentication) {
        String email = authentication.getName();
        doctorProfileService.deleteProfile(email);
        return ResponseEntity.ok("Doctor profile deleted successfully");
    }

    public record DoctorPublicDto(
            Long id,
            String name,
            String email,
            String specialization,
            String phoneNumber,
            String qualifications,
            String experience
    ) {}
}
