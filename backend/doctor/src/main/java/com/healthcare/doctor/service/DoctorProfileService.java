package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.DoctorProfileDto;
import com.healthcare.doctor.entity.DoctorProfile;
import com.healthcare.doctor.repository.DoctorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorProfileService {

    private final DoctorProfileRepository doctorProfileRepository;

    public DoctorProfile getProfileByEmail(String email) {
        return doctorProfileRepository.findByEmail(email)
                .orElseGet(() -> doctorProfileRepository.save(DoctorProfile.builder()
                        .email(email)
                        .verified(false)
                        .build()));
    }

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
        if (dto.getVerified() != null) {
            profile.setVerified(dto.getVerified());
        }

        return doctorProfileRepository.save(profile);
    }

    public List<DoctorProfile> getAllDoctors() {
        return doctorProfileRepository.findAll();
    }

    public List<DoctorProfile> getDoctorsBySpecialty(String specialty) {
        return doctorProfileRepository.findBySpecialtyIgnoreCase(specialty);
    }

    public void deleteProfile(String email) {
        DoctorProfile profile = doctorProfileRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
        doctorProfileRepository.delete(profile);
    }
}
