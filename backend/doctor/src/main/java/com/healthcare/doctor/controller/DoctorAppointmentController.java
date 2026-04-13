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

// REST controller for doctor-side appointment management.
// Allows doctors to view pending requests, accept/reject them, and mark them as completed.
@RestController
@RequestMapping("/api/doctors/appointments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DoctorAppointmentController {

    private final DoctorAppointmentService doctorAppointmentService;

    // POST /api/doctors/appointments/requests — Doctor-initiated creation of a pending request.
    // Typically called when a doctor manually submits an appointment from the UI.
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

    // GET /api/doctors/appointments — Lists all appointment requests for the authenticated doctor.
    // Triggers a background sync with the central appointment service before returning.
    @GetMapping
    public ResponseEntity<List<DoctorAppointmentRequest>> getMyRequests(Authentication authentication) {
        return ResponseEntity.ok(doctorAppointmentService.getMyRequests(authentication.getName()));
    }

    // PUT /api/doctors/appointments/{appointmentId}/decision — Accept or reject a pending appointment.
    // On acceptance, the appointment service is patched to APPROVED and a telemedicine room is synced.
    // On rejection, the appointment service is notified and the patient receives a notification.
    @PutMapping("/{appointmentId}/decision")
    public ResponseEntity<DoctorAppointmentRequest> decide(
            Authentication authentication,
            @PathVariable Long appointmentId,
            @RequestBody AppointmentDecisionDto dto
    ) {
        return ResponseEntity.ok(doctorAppointmentService.decide(authentication.getName(), appointmentId, dto));
    }

    // PATCH /api/doctors/appointments/{appointmentId}/complete — Marks an ACCEPTED appointment as COMPLETED.
    // Only the owning doctor can call this; triggers a completion notification to the patient.
    @PatchMapping("/{appointmentId}/complete")
    public ResponseEntity<DoctorAppointmentRequest> complete(
            Authentication authentication,
            @PathVariable Long appointmentId
    ) {
        return ResponseEntity.ok(doctorAppointmentService.completeAppointment(authentication.getName(), appointmentId));
    }

    // GET /api/doctors/appointments/{appointmentId}/reports — Returns uploaded medical reports
    // for the patient linked to this appointment.
    // Fetched from the patient service; requires the requesting doctor to own the appointment.
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
