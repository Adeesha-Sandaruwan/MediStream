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

// REST controller for all doctor profile management endpoints.
// Base path: /api/doctors
@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DoctorProfileController {

    private final DoctorProfileService doctorProfileService;

    // GET /api/doctors/profile — Returns the authenticated doctor's profile.
    // If the doctor has never logged in before, an empty profile is auto-created
    // (see DoctorProfileService#getProfileByEmail).
    @GetMapping("/profile")
    public ResponseEntity<DoctorProfile> getMyProfile(Authentication authentication) {
        // authentication.getName() returns the email extracted from the JWT 'sub' claim.
        String email = authentication.getName();
        return ResponseEntity.ok(doctorProfileService.getProfileByEmail(email));
    }

    // PUT /api/doctors/profile — Creates or updates the authenticated doctor's profile.
    // All fields from DoctorProfileDto are applied; unknown fields are silently ignored by Jackson.
    @PutMapping("/profile")
    public ResponseEntity<DoctorProfile> updateProfile(
            Authentication authentication,
            @RequestBody DoctorProfileDto dto
    ) {
        String email = authentication.getName();
        return ResponseEntity.ok(doctorProfileService.updateProfile(email, dto));
    }

    // GET /api/doctors/all — Lists all registered doctors, optionally filtered by specialty.
    // Used by patient-facing UIs to browse available doctors.
    @GetMapping("/all")
    public ResponseEntity<List<DoctorProfile>> getAllDoctors(
            @RequestParam(required = false) String specialty // null means "all specialties"
    ) {
        if (specialty != null && !specialty.isBlank()) {
            // Filter by specialty (case-insensitive) when the query param is provided.
            return ResponseEntity.ok(doctorProfileService.getDoctorsBySpecialty(specialty));
        }
        return ResponseEntity.ok(doctorProfileService.getAllDoctors());
    }

    // GET /api/doctors/public/{doctorId} — Returns a lightweight public summary of a doctor.
    // This endpoint is accessible without authentication (permitted in SecurityConfig).
    @GetMapping("/public/{doctorId}")
    public ResponseEntity<DoctorPublicDto> getDoctorById(@PathVariable Long doctorId) {
        DoctorProfile profile = doctorProfileService.getProfileById(doctorId);
        // Construct a display name; fall back to email if both name fields are blank.
        String fullName = ((profile.getFirstName() == null ? "" : profile.getFirstName()) + " " + (profile.getLastName() == null ? "" : profile.getLastName())).trim();
        if (fullName.isEmpty()) {
            fullName = profile.getEmail(); // Email used as the display name when no name is set.
        }

        // Map only the public-safe fields into a projection DTO (omits licenseNumber, signatureImage, etc.).
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

    // GET /api/doctors/public/{doctorId}/exists — Quick existence check used by other microservices
    // (e.g., appointment service) before creating a new appointment for a doctor.
    @GetMapping("/public/{doctorId}/exists")
    public ResponseEntity<Boolean> doctorExists(@PathVariable Long doctorId) {
        return ResponseEntity.ok(doctorProfileService.existsById(doctorId));
    }

    // GET /api/doctors/public/{doctorId}/availability — Returns true only if the doctor
    // profile exists and the 'verified' flag is true.
    // Consumed by the appointment service to gate booking against unverified doctors.
    @GetMapping("/public/{doctorId}/availability")
    public ResponseEntity<Boolean> doctorAvailability(@PathVariable Long doctorId) {
        return ResponseEntity.ok(doctorProfileService.isAvailableById(doctorId));
    }

    // DELETE /api/doctors/profile — Permanently removes the authenticated doctor's profile record.
    @DeleteMapping("/profile")
    public ResponseEntity<String> deleteProfile(Authentication authentication) {
        String email = authentication.getName();
        doctorProfileService.deleteProfile(email);
        return ResponseEntity.ok("Doctor profile deleted successfully");
    }

    // Lightweight public projection of a doctor's profile.
    // Only exposes non-sensitive fields; keeps licenseNumber and signatureImage server-side.
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
