package com.healthcare.telemedicine.controller;

import com.healthcare.telemedicine.dto.*;
import com.healthcare.telemedicine.service.TelemedicineConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/telemedicine")
@RequiredArgsConstructor
public class TelemedicineController {

    private final TelemedicineConsultationService consultationService;

    @PostMapping("/intake")
    public ResponseEntity<IntakeRequestViewDto> submitIntake(
            @RequestBody PatientIntakeSubmitRequest body,
            Authentication authentication
    ) {
        return ResponseEntity.ok(consultationService.submitPatientIntake(authentication.getName(), body));
    }

    @GetMapping("/intake/my")
    public ResponseEntity<List<IntakeRequestViewDto>> myIntakes(Authentication authentication) {
        return ResponseEntity.ok(consultationService.listPatientIntakes(authentication.getName()));
    }

    @GetMapping("/intake/incoming/count")
    public ResponseEntity<PendingCountResponse> incomingIntakeCount(Authentication authentication) {
        long n = consultationService.countIncomingIntakes(authentication.getName());
        return ResponseEntity.ok(new PendingCountResponse(n));
    }

    @GetMapping("/intake/incoming")
    public ResponseEntity<List<IntakeRequestViewDto>> incomingIntakes(Authentication authentication) {
        return ResponseEntity.ok(consultationService.listIncomingIntakes(authentication.getName()));
    }

    @PostMapping("/intake/{intakeId}/schedule")
    public ResponseEntity<SessionResponse> scheduleFromIntake(
            @PathVariable long intakeId,
            @RequestBody ScheduleFromIntakeRequest body,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                consultationService.scheduleFromIntake(authentication.getName(), intakeId, body)
        );
    }

    @GetMapping("/invitations/count")
    public ResponseEntity<PendingCountResponse> patientInvitationCount(Authentication authentication) {
        long n = consultationService.countInvitationsForPatient(authentication.getName());
        return ResponseEntity.ok(new PendingCountResponse(n));
    }

    @GetMapping("/invitations")
    public ResponseEntity<List<PendingConsultationDto>> patientInvitations(Authentication authentication) {
        return ResponseEntity.ok(consultationService.listInvitationsForPatient(authentication.getName()));
    }

    @GetMapping("/doctor/schedules")
    public ResponseEntity<List<PendingConsultationDto>> doctorSchedules(Authentication authentication) {
        return ResponseEntity.ok(consultationService.listDoctorSchedules(authentication.getName()));
    }

    @GetMapping("/doctor/meetings/past")
    public ResponseEntity<List<DoctorPastMeetingDto>> doctorPastMeetings(Authentication authentication) {
        return ResponseEntity.ok(consultationService.listDoctorPastMeetings(authentication.getName()));
    }

    @PostMapping("/session/{roomId}/start")
    public ResponseEntity<SessionResponse> startSession(
            @PathVariable("roomId") String roomId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(consultationService.start(authentication.getName(), roomId));
    }

    @PostMapping("/session/{roomId}/end")
    public ResponseEntity<SessionResponse> endSession(
            @PathVariable("roomId") String roomId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(consultationService.end(authentication.getName(), roomId));
    }
}
