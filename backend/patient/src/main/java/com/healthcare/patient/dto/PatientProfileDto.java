package com.healthcare.patient.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PatientProfileDto {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String dateOfBirth;
    private String gender;
    private String address;
    private String bloodGroup;
    private String emergencyContact;
    private String allergies;
    private String currentMedications;
}