package com.healthcare.telemedicine.dto;

import lombok.Data;

@Data
public class PatientIntakeSubmitRequest {
    private String doctorEmail;
    private String symptoms;
    private String additionalDetails;
    /** ROUTINE or URGENT */
    private String urgency;
    private String symptomDuration;
    private String currentMedications;
    private String knownAllergies;
}
