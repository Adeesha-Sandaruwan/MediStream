package com.healthcare.appointment.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign Client for inter-service communication with Patient Service
 * Used to fetch patient information and validate patient existence
 */
@FeignClient(name = "patient-service", url = "${feign.patient-service.url:http://localhost:8081}")
public interface PatientServiceClient {

    /**
     * Get patient details by patient ID
     * @param patientId Patient identifier
     * @return Patient information
     */
    @GetMapping("/api/patients/{patientId}")
    PatientDto getPatient(@PathVariable("patientId") Long patientId);

    /**
     * Check if patient exists
     * @param patientId Patient identifier
     * @return true if patient exists
     */
    @GetMapping("/api/patients/{patientId}/exists")
    boolean patientExists(@PathVariable("patientId") Long patientId);

    /**
     * DTO for patient information
     */
    class PatientDto {
        public Long id;
        public String name;
        public String email;
        public String phoneNumber;
        public String dateOfBirth;
        public String address;

          // Profile Info
        public String firstName;
        public String lastName;
        public String gender;
        public String nationalId;
        public String bloodGroup;

        // Medical Info
        public String allergies;
        public String currentMedications;
        public String chronicConditions;
        public String pastSurgeries;
        public String familyMedicalHistory;

        // Emergency Contact
        public String emergencyContactName;
        public String emergencyContactRelationship;
        public String emergencyContactPhone;
    }
}