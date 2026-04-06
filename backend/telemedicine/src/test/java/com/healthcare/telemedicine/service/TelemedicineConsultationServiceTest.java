package com.healthcare.telemedicine.service;

import com.healthcare.telemedicine.dto.ScheduleFromIntakeRequest;
import com.healthcare.telemedicine.entity.IntakeRequestStatus;
import com.healthcare.telemedicine.entity.TelemedicineIntakeRequest;
import com.healthcare.telemedicine.repository.TelemedicineConsultationRepository;
import com.healthcare.telemedicine.repository.TelemedicineIntakeRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelemedicineConsultationServiceTest {

    @Mock
    private TelemedicineConsultationRepository consultationRepository;

    @Mock
    private TelemedicineIntakeRequestRepository intakeRepository;

    @InjectMocks
    private TelemedicineConsultationService service;

    @Test
    void scheduleFromIntakeRejectsAlreadyBookedIntake() {
        ReflectionTestUtils.setField(service, "jitsiDomain", "meet.jit.si");
        ReflectionTestUtils.setField(service, "videoProvider", "JITSI");

        TelemedicineIntakeRequest intake = TelemedicineIntakeRequest.builder()
                .id(100L)
                .doctorEmail("doctor@example.com")
                .patientEmail("patient@example.com")
                .status(IntakeRequestStatus.PENDING_REVIEW)
                .consultationId(5L)
                .symptoms("Fever")
                .build();

        ScheduleFromIntakeRequest req = new ScheduleFromIntakeRequest();
        req.setScheduledStartAt(Instant.now().plus(30, ChronoUnit.MINUTES).toString());
        req.setDurationMinutes(30);

        when(intakeRepository.findById(100L)).thenReturn(Optional.of(intake));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.scheduleFromIntake("doctor@example.com", 100L, req)
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void scheduleFromIntakeRejectsOverlappingDoctorSlot() {
        ReflectionTestUtils.setField(service, "jitsiDomain", "meet.jit.si");
        ReflectionTestUtils.setField(service, "videoProvider", "JITSI");

        TelemedicineIntakeRequest intake = TelemedicineIntakeRequest.builder()
                .id(101L)
                .doctorEmail("doctor@example.com")
                .patientEmail("patient@example.com")
                .status(IntakeRequestStatus.PENDING_REVIEW)
                .symptoms("Headache")
                .build();

        ScheduleFromIntakeRequest req = new ScheduleFromIntakeRequest();
        req.setScheduledStartAt(Instant.now().plus(45, ChronoUnit.MINUTES).toString());
        req.setDurationMinutes(30);

        when(intakeRepository.findById(101L)).thenReturn(Optional.of(intake));
        when(consultationRepository.findByIntakeRequestId(101L)).thenReturn(Optional.empty());
        when(consultationRepository.existsDoctorScheduleOverlap(anyString(), anyCollection(), any(Instant.class), any(Instant.class)))
                .thenReturn(true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.scheduleFromIntake("doctor@example.com", 101L, req)
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }
}


