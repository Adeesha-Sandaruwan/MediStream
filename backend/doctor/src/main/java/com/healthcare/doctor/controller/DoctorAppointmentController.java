package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.AppointmentDecisionDto;
import com.healthcare.doctor.dto.DoctorAppointmentRequestDto;
import com.healthcare.doctor.entity.DoctorAppointmentRequest;
import com.healthcare.doctor.service.DoctorAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors/appointments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DoctorAppointmentController {

    private final DoctorAppointmentService doctorAppointmentService;

    @PostMapping("/requests")
    public ResponseEntity<DoctorAppointmentRequest> createPendingRequest(
            Authentication authentication,
            @RequestBody DoctorAppointmentRequestDto dto
    ) {
        return ResponseEntity.ok(doctorAppointmentService.createPendingRequest(authentication.getName(), dto));
    }

    /**
     * Internal service-to-service endpoint.
     * Called by the appointment service after a payment is completed and the appointment
     * is approved.  No JWT is required – the URL is whitelisted in SecurityConfig.
     */
    @PostMapping("/internal/create")
    public ResponseEntity<DoctorAppointmentRequest> createFromAppointmentService(
            @RequestBody DoctorAppointmentRequestDto dto
    ) {
        return ResponseEntity.ok(doctorAppointmentService.createPendingRequestInternal(dto));
    }

    @GetMapping
    public ResponseEntity<List<DoctorAppointmentRequest>> getMyRequests(Authentication authentication) {
        return ResponseEntity.ok(doctorAppointmentService.getMyRequests(authentication.getName()));
    }

    @PutMapping("/{appointmentId}/decision")
    public ResponseEntity<DoctorAppointmentRequest> decide(
            Authentication authentication,
            @PathVariable Long appointmentId,
            @RequestBody AppointmentDecisionDto dto
    ) {
        return ResponseEntity.ok(doctorAppointmentService.decide(authentication.getName(), appointmentId, dto));
    }

    @PatchMapping("/{appointmentId}/complete")
    public ResponseEntity<DoctorAppointmentRequest> complete(
            Authentication authentication,
            @PathVariable Long appointmentId
    ) {
        return ResponseEntity.ok(doctorAppointmentService.completeAppointment(authentication.getName(), appointmentId));
    }

    @GetMapping("/{appointmentId}/reports")
    public ResponseEntity<List<Map<String, Object>>> getPatientReportsForAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId
    ) {
        return ResponseEntity.ok(
                doctorAppointmentService.getPatientReportsForAppointment(authentication.getName(), appointmentId)
        );
    }
}
