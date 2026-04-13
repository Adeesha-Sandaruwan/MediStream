package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.DoctorProfileDto;
import com.healthcare.doctor.entity.DoctorProfile;
import com.healthcare.doctor.repository.DoctorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class DoctorProfileService {

    private final DoctorProfileRepository doctorProfileRepository;

    // Looks up the doctor profile by email.
    // If no profile exists yet (first login after registration), an empty profile is auto-created
    // with verified=false so the doctor can fill in their details afterwards.
    public DoctorProfile getProfileByEmail(String email) {
        return doctorProfileRepository.findByEmail(email)
                .orElseGet(() -> doctorProfileRepository.save(DoctorProfile.builder()
                        .email(email)
                        .verified(false) // New profiles start as unverified until an admin approves them.
                        .build()));
    }

    // Upsert operation: updates an existing profile or creates a new one if the email is not yet known.
    // All DTO fields are applied directly; no partial-update logic—callers send the full profile state.
    public DoctorProfile updateProfile(String email, DoctorProfileDto dto) {
        DoctorProfile profile = doctorProfileRepository.findByEmail(email)
                .orElse(DoctorProfile.builder().email(email).verified(false).build());

        profile.setFirstName(dto.getFirstName());
        profile.setLastName(dto.getLastName());
        profile.setPhoneNumber(dto.getPhoneNumber());
        profile.setSpecialty(dto.getSpecialty());
        profile.setQualifications(dto.getQualifications());
        profile.setLicenseNumber(dto.getLicenseNumber());
        profile.setExperienceYears(dto.getExperienceYears());
        profile.setConsultationFee(dto.getConsultationFee());
        profile.setHospitalAffiliation(dto.getHospitalAffiliation());
        profile.setBio(dto.getBio());
        // Validate and store the Base64 signature image; throws if format or size is invalid.
        profile.setDoctorSignatureImage(resolveSignatureImage(dto.getDoctorSignatureImage()));
        // Only update the verified flag when the caller explicitly includes it (non-null);
        // this prevents an accidental null from revoking a doctor's verified status.
        if (dto.getVerified() != null) {
            profile.setVerified(dto.getVerified());
        }

        return doctorProfileRepository.save(profile);
    }

    // Returns every doctor in the system; used by admin views and unfiltered patient searches.
    public List<DoctorProfile> getAllDoctors() {
        return doctorProfileRepository.findAll();
    }

    // Returns doctors whose specialty matches the given string (case-insensitive).
    // Enables patients to filter the doctor list by medical field (e.g., "cardiology").
    public List<DoctorProfile> getDoctorsBySpecialty(String specialty) {
        return doctorProfileRepository.findBySpecialtyIgnoreCase(specialty);
    }

    // Fetches a single doctor profile by its database ID.
    // Throws NoSuchElementException (mapped to 400 by the GlobalExceptionHandler) if not found.
    public DoctorProfile getProfileById(Long doctorId) {
        return doctorProfileRepository.findById(doctorId)
                .orElseThrow(() -> new NoSuchElementException("Doctor profile not found"));
    }

    // Quick existence check by ID; used by other microservices (e.g., appointment service)
    // to validate doctorId before creating an appointment.
    public boolean existsById(Long doctorId) {
        return doctorProfileRepository.existsById(doctorId);
    }

    // A doctor is considered 'available' only when their profile exists AND the verified flag is true.
    // Returns false if the profile is not found (treats missing profile as unavailable).
    public boolean isAvailableById(Long doctorId) {
        return doctorProfileRepository.findById(doctorId)
                .map(profile -> Boolean.TRUE.equals(profile.getVerified()))
                .orElse(false);
    }

    // Permanently removes the doctor profile from the database.
    // Throws if the profile does not exist to avoid silently ignoring bad requests.
    public void deleteProfile(String email) {
        DoctorProfile profile = doctorProfileRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
        doctorProfileRepository.delete(profile);
    }

    // Validates a Base64 data URI signature image before it is persisted.
    // Null/blank input is accepted (clears the existing image).
    // Rejects:
    //   - Strings not starting with 'data:image/' (wrong format)
    //   - Images exceeding ~3 MB (4,000,000 characters in Base64 ≈ 3 MB binary)
    private String resolveSignatureImage(String signatureImage) {
        if (signatureImage == null || signatureImage.isBlank()) {
            return null; // Allows callers to clear the signature by sending null.
        }
        String trimmed = signatureImage.trim();
        if (!trimmed.startsWith("data:image/")) {
            throw new RuntimeException("Invalid signature image format");
        }
        if (trimmed.length() > 4_000_000) { // ~3 MB of binary image data
            throw new RuntimeException("Signature image is too large. Please use an image under 3MB.");
        }
        return trimmed;
    }
}
