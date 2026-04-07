package com.healthcare.appointment.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign Client for inter-service communication with Doctor Service
 * Used to fetch doctor information and validate doctor existence
 */
@FeignClient(name = "doctor-service", url = "${feign.doctor-service.url:http://localhost:8084}")
public interface DoctorServiceClient {

    /**
     * Get doctor details by doctor ID
     * @param doctorId Doctor identifier
     * @return Doctor information
     */
    @GetMapping("/api/doctors/{doctorId}")
    DoctorDto getDoctor(@PathVariable("doctorId") Long doctorId);

    /**
     * Check if doctor exists
     * @param doctorId Doctor identifier
     * @return true if doctor exists
     */
    @GetMapping("/api/doctors/{doctorId}/exists")
    boolean doctorExists(@PathVariable("doctorId") Long doctorId);

    /**
     * Check doctor availability
     * @param doctorId Doctor identifier
     * @return true if doctor is available
     */
    @GetMapping("/api/doctors/{doctorId}/availability")
    boolean isAvailable(@PathVariable("doctorId") Long doctorId);

    /**
     * DTO for doctor information
     */
    class DoctorDto {
        public Long id;
        public String name;
        public String email;
        public String specialization;
        public String phoneNumber;
        public String qualifications;
        public double experience;
    }
}