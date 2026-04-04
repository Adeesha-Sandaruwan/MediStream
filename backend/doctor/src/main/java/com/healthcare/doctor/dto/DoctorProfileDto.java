package com.healthcare.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DoctorProfileDto {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String specialty;
    private String qualifications;
    private String licenseNumber;
    private String experienceYears;
    private String consultationFee;
    private String hospitalAffiliation;
    private String bio;
    private String doctorSignatureImage;
    private Boolean verified;
}
