package com.healthcare.patient.service;

import com.healthcare.patient.dto.PatientProfileDto;
import com.healthcare.patient.entity.PatientProfile;
import com.healthcare.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientProfile getProfileByEmail(String email) {
        return patientRepository.findByEmail(email)
                .orElseGet(() -> patientRepository.save(PatientProfile.builder().email(email).build()));
    }

    public PatientProfile updateProfile(String email, PatientProfileDto dto) {
        PatientProfile profile = patientRepository.findByEmail(email)
                .orElse(PatientProfile.builder().email(email).build());

        profile.setFirstName(dto.getFirstName());
        profile.setLastName(dto.getLastName());
        profile.setPhoneNumber(dto.getPhoneNumber());
        profile.setDateOfBirth(dto.getDateOfBirth());
        profile.setGender(dto.getGender());
        profile.setAddress(dto.getAddress());
        profile.setNationalId(dto.getNationalId());
        profile.setBloodGroup(dto.getBloodGroup());
        profile.setAllergies(dto.getAllergies());
        profile.setCurrentMedications(dto.getCurrentMedications());
        profile.setChronicConditions(dto.getChronicConditions());
        profile.setPastSurgeries(dto.getPastSurgeries());
        profile.setFamilyMedicalHistory(dto.getFamilyMedicalHistory());
        profile.setEmergencyContactName(dto.getEmergencyContactName());
        profile.setEmergencyContactRelationship(dto.getEmergencyContactRelationship());
        profile.setEmergencyContactPhone(dto.getEmergencyContactPhone());

        return patientRepository.save(profile);
    }

    public List<PatientProfile> getAllProfiles() {
        return patientRepository.findAll();
    }

    public void deleteProfile(String email) {
        PatientProfile profile = patientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        patientRepository.delete(profile);
    }
}