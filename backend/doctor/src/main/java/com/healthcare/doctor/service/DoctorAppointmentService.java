package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.AppointmentDecisionDto;
import com.healthcare.doctor.dto.DoctorAppointmentRequestDto;
import com.healthcare.doctor.entity.DoctorAppointmentRequest;
import com.healthcare.doctor.repository.DoctorAppointmentRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorAppointmentService {

    private final DoctorAppointmentRequestRepository doctorAppointmentRequestRepository;

    public DoctorAppointmentRequest createPendingRequest(String doctorEmail, DoctorAppointmentRequestDto dto) {
        DoctorAppointmentRequest request = doctorAppointmentRequestRepository
                .findByAppointmentId(dto.getAppointmentId())
                .orElse(DoctorAppointmentRequest.builder()
                        .appointmentId(dto.getAppointmentId())
                        .doctorEmail(doctorEmail)
                        .build());

        request.setPatientEmail(dto.getPatientEmail());
        request.setScheduledAt(dto.getScheduledAt());
        request.setStatus("PENDING");
        request.setUpdatedAt(LocalDateTime.now());

        return doctorAppointmentRequestRepository.save(request);
    }

    public List<DoctorAppointmentRequest> getMyRequests(String doctorEmail) {
        return doctorAppointmentRequestRepository.findByDoctorEmailOrderByUpdatedAtDesc(doctorEmail);
    }

    public DoctorAppointmentRequest decide(String doctorEmail, Long appointmentId, AppointmentDecisionDto dto) {
        DoctorAppointmentRequest request = doctorAppointmentRequestRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment request not found"));

        if (!request.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to update this appointment request");
        }

        String status = dto.getStatus() == null ? "" : dto.getStatus().trim().toUpperCase();
        if (!"ACCEPTED".equals(status) && !"REJECTED".equals(status)) {
            throw new RuntimeException("Status must be ACCEPTED or REJECTED");
        }

        request.setStatus(status);
        request.setDoctorNotes(dto.getDoctorNotes());
        request.setUpdatedAt(LocalDateTime.now());

        return doctorAppointmentRequestRepository.save(request);
    }
}
