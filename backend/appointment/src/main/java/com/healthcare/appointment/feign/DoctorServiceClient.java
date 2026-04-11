package com.healthcare.appointment.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

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
    @GetMapping("/api/doctors/public/{doctorId}")
    DoctorDto getDoctor(@PathVariable("doctorId") Long doctorId);

    /**
     * Check if doctor exists
     * @param doctorId Doctor identifier
     * @return true if doctor exists
     */
    @GetMapping("/api/doctors/public/{doctorId}/exists")
    boolean doctorExists(@PathVariable("doctorId") Long doctorId);

    /**
     * Check doctor availability
     * @param doctorId Doctor identifier
     * @return true if doctor is available
     */
    @GetMapping("/api/doctors/public/{doctorId}/availability")
    boolean isAvailable(@PathVariable("doctorId") Long doctorId);

    /**
     * Notify doctor service that an appointment has been approved (payment completed).
     * Calls the internal no-auth endpoint in the doctor service so doctors can see
     * the appointment in their dashboard.
     */
    @PostMapping("/api/doctors/appointments/internal/create")
    void notifyAppointmentApproved(@RequestBody DoctorAppointmentNotifyRequest request);

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
        public String experience; // Doctor service returns this as a String
    }

    /**
     * DTO for doctor appointment notification request
     */
    class DoctorAppointmentNotifyRequest {
        public Long appointmentId;
        public String doctorEmail;
        public String patientEmail;
        public String scheduledAt;

        public DoctorAppointmentNotifyRequest() {}

        public DoctorAppointmentNotifyRequest(Long appointmentId, String doctorEmail,
                                               String patientEmail, String scheduledAt) {
            this.appointmentId = appointmentId;
            this.doctorEmail   = doctorEmail;
            this.patientEmail  = patientEmail;
            this.scheduledAt   = scheduledAt;
        }
    }
}