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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
