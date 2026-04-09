package com.healthcare.telemedicine.service;

import com.healthcare.telemedicine.dto.*;
import com.healthcare.telemedicine.entity.ConsultationStatus;
import com.healthcare.telemedicine.entity.IntakeRequestStatus;
import com.healthcare.telemedicine.entity.TelemedicineConsultation;
import com.healthcare.telemedicine.entity.TelemedicineIntakeRequest;
import com.healthcare.telemedicine.repository.TelemedicineConsultationRepository;
import com.healthcare.telemedicine.repository.TelemedicineIntakeRequestRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TelemedicineConsultationService {

    private static final Logger LOG = LoggerFactory.getLogger(TelemedicineConsultationService.class);

    private static final int MIN_DURATION_MIN = 15;
    private static final int MAX_DURATION_MIN = 480;
    private static final int DEFAULT_DURATION_MIN = 60;

    private final TelemedicineConsultationRepository repository;
    private final TelemedicineIntakeRequestRepository intakeRepository;

    @Value("${telemedicine.video.jitsi.domain:meet.jit.si}")
    private String jitsiDomain;

    @Value("${telemedicine.video.provider:JITSI}")
    private String videoProvider;

    /* ---------- Patient intake ---------- */

    @Transactional
    public IntakeRequestViewDto submitPatientIntake(String patientEmail, PatientIntakeSubmitRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        String patient = patientEmail.trim().toLowerCase();
        String doctor = normalizeEmail(request.getDoctorEmail());
        String symptomsText = trimToNull(request.getSymptoms());
        if (doctor == null || symptomsText == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Doctor email and symptoms are required");
        }
        if (doctor.equalsIgnoreCase(patient)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot select yourself as doctor");
        }

        String urgency = normalizeUrgency(request.getUrgency());

        TelemedicineIntakeRequest intake = TelemedicineIntakeRequest.builder()
                .patientEmail(patient)
                .doctorEmail(doctor)
                .symptoms(symptomsText)
                .additionalDetails(trimToNull(request.getAdditionalDetails()))
                .urgency(urgency)
                .symptomDuration(trimToNull(request.getSymptomDuration()))
                .currentMedications(trimToNull(request.getCurrentMedications()))
                .knownAllergies(trimToNull(request.getKnownAllergies()))
                .status(IntakeRequestStatus.PENDING_REVIEW)
                .build();

        intakeRepository.save(intake);
        return toIntakeViewDto(intake, null);
    }

    public List<IntakeRequestViewDto> listPatientIntakes(String patientEmail) {
        String email = patientEmail.trim().toLowerCase();
        return intakeRepository.findByPatientEmailIgnoreCaseOrderByCreatedAtDesc(email).stream()
                .map(r -> toIntakeViewDto(r, resolveConsultationForIntake(r)))
                .toList();
    }

    private TelemedicineConsultation resolveConsultationForIntake(TelemedicineIntakeRequest r) {
        TelemedicineConsultation c = loadConsultation(r.getConsultationId());
        if (c != null) {
            return c;
        }
        if (r.getId() != null) {
            return repository.findByIntakeRequestId(r.getId()).orElse(null);
        }
        return null;
    }

    public long countIncomingIntakes(String doctorEmail) {
        String email = doctorEmail.trim().toLowerCase();
        return intakeRepository.countByDoctorEmailIgnoreCaseAndStatus(email, IntakeRequestStatus.PENDING_REVIEW);
    }

    public List<IntakeRequestViewDto> listIncomingIntakes(String doctorEmail) {
        String email = doctorEmail.trim().toLowerCase();
        return intakeRepository.findByDoctorEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
                        email,
                        IntakeRequestStatus.PENDING_REVIEW
                )
                .stream()
                .map(r -> toIntakeViewDto(r, null))
                .toList();
    }

    @Transactional
    public SessionResponse scheduleFromIntake(String doctorEmail, long intakeId, ScheduleFromIntakeRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        TelemedicineIntakeRequest intake = intakeRepository.findById(intakeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Intake request not found"));

        String doctor = doctorEmail.trim().toLowerCase();
        LOG.debug("scheduleFromIntake called authDoctor={} intakeId={} intakeDoctor={} status={}",
                doctor,
                intakeId,
                intake.getDoctorEmail(),
                intake.getStatus());
        if (!intake.getDoctorEmail().equalsIgnoreCase(doctor)) {
            LOG.warn("scheduleFromIntake forbidden authDoctor={} intakeDoctor={} intakeId={}",
                    doctor,
                    intake.getDoctorEmail(),
                    intakeId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This intake is assigned to another doctor");
        }
        if (intake.getStatus() != IntakeRequestStatus.PENDING_REVIEW) {
            LOG.warn("scheduleFromIntake rejected intakeId={} status={}", intakeId, intake.getStatus());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This intake is no longer awaiting scheduling");
        }
        if (hasLinkedConsultation(intake)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This intake already has a booked visit");
        }

        String startRaw = trimToNull(request.getScheduledStartAt());
        if (startRaw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scheduledStartAt is required");
        }

        Instant scheduledStart;
        try {
            scheduledStart = Instant.parse(startRaw);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "scheduledStartAt must be ISO-8601 (e.g. 2026-04-01T15:00:00Z)"
            );
        }

        Instant now = Instant.now();
        /* Allow ~1 min drift between browser and server clocks. */
        if (scheduledStart.isBefore(now.minusSeconds(90))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scheduled time must be in the future (server time)");
        }

        int durationMin = request.getDurationMinutes() != null ? request.getDurationMinutes() : DEFAULT_DURATION_MIN;
        if (durationMin < MIN_DURATION_MIN) {
            durationMin = MIN_DURATION_MIN;
        }
        if (durationMin > MAX_DURATION_MIN) {
            durationMin = MAX_DURATION_MIN;
        }
        Instant scheduledEnd = scheduledStart.plus(durationMin, ChronoUnit.MINUTES);

        assertNoScheduleConflict(doctor, intake.getPatientEmail(), scheduledStart, scheduledEnd);

        String clinicalSummary = buildSummaryFromIntake(intake);
        String doctorMsg = trimToNull(request.getDoctorMessage());
        String combinedDetails = doctorMsg != null
                ? clinicalSummary + "\n\n--- Instructions from your doctor ---\n" + doctorMsg
                : clinicalSummary;

        TelemedicineConsultation c = createScheduledConsultation(
                intake.getPatientEmail(),
                doctor,
                combinedDetails,
                null,
                scheduledStart,
                durationMin,
                intake.getId()
        );

        intake.setConsultationId(c.getId());
        intake.setStatus(IntakeRequestStatus.VISIT_BOOKED);
        intakeRepository.saveAndFlush(intake);

        TelemedicineConsultation fresh =
                repository.findById(c.getId()).orElse(c);
        return toResponse(fresh);
    }

    @Transactional
    public PendingConsultationDto syncFromApprovedAppointment(AppointmentSyncRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        if (request.getAppointmentId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "appointmentId is required");
        }

        String doctor = normalizeEmail(request.getDoctorEmail());
        String patient = normalizeEmail(request.getPatientEmail());
        if (doctor == null || patient == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "doctorEmail and patientEmail are required");
        }

        int durationMin = request.getDurationMinutes() != null ? request.getDurationMinutes() : DEFAULT_DURATION_MIN;
        if (durationMin < MIN_DURATION_MIN) {
            durationMin = MIN_DURATION_MIN;
        }
        if (durationMin > MAX_DURATION_MIN) {
            durationMin = MAX_DURATION_MIN;
        }

        String appointmentKey = String.valueOf(request.getAppointmentId());
        Instant scheduledStart = parseFlexibleInstant(request.getScheduledStartAt());
        if (scheduledStart == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scheduledStartAt is required");
        }
        Instant minAllowedStart = Instant.now().plus(2, ChronoUnit.MINUTES);
        if (scheduledStart.isBefore(minAllowedStart)) {
            // Keep appointment-origin sessions in upcoming queues even when source time is stale.
            scheduledStart = Instant.now().plus(15, ChronoUnit.MINUTES);
        }
        Instant scheduledEnd = scheduledStart.plus(durationMin, ChronoUnit.MINUTES);

        TelemedicineConsultation consultation = repository.findByExternalAppointmentId(appointmentKey).orElse(null);
        if (consultation == null) {
            assertNoScheduleConflict(doctor, patient, scheduledStart, scheduledEnd);
            TelemedicineConsultation created = createScheduledConsultation(
                    patient,
                    doctor,
                    trimToNull(request.getDoctorNotes()),
                    appointmentKey,
                    scheduledStart,
                    durationMin,
                    null
            );
            return toInvitationDto(created);
        }

        consultation.setDoctorEmail(doctor);
        consultation.setPatientEmail(patient);
        consultation.setSymptoms(trimToNull(request.getDoctorNotes()));
        consultation.setStatus(ConsultationStatus.SCHEDULED);
        consultation.setScheduledStartAt(scheduledStart);
        consultation.setScheduledEndAt(scheduledEnd);
        consultation.setExternalAppointmentId(appointmentKey);
        consultation.setEndedAt(null);
        consultation.setStartedAt(null);

        if (Boolean.TRUE.equals(request.getRegenerateLink())
                || consultation.getPublicRoomId() == null
                || consultation.getRoomUrl() == null) {
            assignNewRoom(consultation);
        }

        TelemedicineConsultation saved = repository.saveAndFlush(consultation);
        return toInvitationDto(saved);
    }

    private boolean hasLinkedConsultation(TelemedicineIntakeRequest intake) {
        if (intake.getConsultationId() != null) {
            return true;
        }
        return intake.getId() != null && repository.findByIntakeRequestId(intake.getId()).isPresent();
    }

    private void assertNoScheduleConflict(
            String doctorEmail,
            String patientEmail,
            Instant candidateStart,
            Instant candidateEnd
    ) {
        List<ConsultationStatus> activeStatuses = List.of(ConsultationStatus.SCHEDULED, ConsultationStatus.LIVE);
        boolean doctorConflict = repository.existsDoctorScheduleOverlap(
                doctorEmail,
                activeStatuses,
                candidateStart,
                candidateEnd
        );
        if (doctorConflict) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Doctor already has another consultation during this time window"
            );
        }

        boolean patientConflict = repository.existsPatientScheduleOverlap(
                patientEmail,
                activeStatuses,
                candidateStart,
                candidateEnd
        );
        if (patientConflict) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Patient already has another consultation during this time window"
            );
        }
    }

    /* ---------- Consultations (video visits) ---------- */

    public long countInvitationsForPatient(String patientEmail) {
        String email = patientEmail.trim().toLowerCase();
        return repository.countByPatientEmailIgnoreCaseAndStatusIn(
                email,
                List.of(ConsultationStatus.SCHEDULED, ConsultationStatus.LIVE)
        );
    }

    public List<PendingConsultationDto> listInvitationsForPatient(String patientEmail) {
        String email = patientEmail.trim().toLowerCase();
        return repository.findByPatientEmailIgnoreCaseAndStatusInOrderByScheduledStartAtAsc(
                        email,
                        List.of(ConsultationStatus.SCHEDULED, ConsultationStatus.LIVE)
                )
                .stream()
                .map(this::toInvitationDto)
                .toList();
    }

    public List<PendingConsultationDto> listDoctorSchedules(String doctorEmail) {
        String email = doctorEmail.trim().toLowerCase();
        return repository.findByDoctorEmailIgnoreCaseAndStatusInOrderByScheduledStartAtDesc(
                        email,
                        List.of(ConsultationStatus.SCHEDULED, ConsultationStatus.LIVE)
                )
                .stream()
                .map(this::toInvitationDto)
                .toList();
    }

    public List<DoctorPastMeetingDto> listDoctorPastMeetings(String doctorEmail) {
        String email = doctorEmail.trim().toLowerCase();
        return repository.findByDoctorEmailIgnoreCaseAndStatusInOrderByScheduledStartAtDesc(
                        email,
                        List.of(ConsultationStatus.ENDED)
                )
                .stream()
                .map(this::toDoctorPastMeetingDto)
                .toList();
    }

    @Transactional
    public SessionResponse start(String actorEmail, String publicRoomId) {
        String actor = actorEmail.trim().toLowerCase();
        TelemedicineConsultation c = repository.findByPublicRoomId(publicRoomId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consultation not found"));

        if (c.getStatus() == ConsultationStatus.ENDED || c.getStatus() == ConsultationStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consultation is not active");
        }
        if (c.getStatus() == ConsultationStatus.LIVE) {
            return toResponse(c);
        }

        if (c.getStatus() == ConsultationStatus.SCHEDULED) {
            assertScheduledParticipants(actor, c);
            assertWithinScheduledWindow(c);
            c.setStatus(ConsultationStatus.LIVE);
            c.setStartedAt(Instant.now());
            repository.save(c);
            return toResponse(c);
        }

        if (c.getStatus() == ConsultationStatus.CREATED) {
            return startLegacyPatientInitiated(actor, c);
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consultation cannot be started");
    }

    private SessionResponse startLegacyPatientInitiated(String actor, TelemedicineConsultation c) {
        String invited = c.getInvitedDoctorEmail();
        if (invited != null && !invited.isBlank()) {
            if (!invited.equalsIgnoreCase(actor)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Only the invited doctor can start this consultation"
                );
            }
        } else {
            if (actor.equalsIgnoreCase(c.getPatientEmail())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Share the room link with your doctor; they must start the consultation."
                );
            }
        }

        c.setDoctorEmail(actor);
        c.setStartedAt(Instant.now());
        c.setStatus(ConsultationStatus.LIVE);
        repository.save(c);
        return toResponse(c);
    }

    private void assertScheduledParticipants(String actor, TelemedicineConsultation c) {
        boolean isPatient = actor.equalsIgnoreCase(c.getPatientEmail());
        boolean isDoctor = c.getDoctorEmail() != null && actor.equalsIgnoreCase(c.getDoctorEmail());
        if (!isPatient && !isDoctor) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the patient or scheduling doctor can join this meeting"
            );
        }
    }

    private void assertWithinScheduledWindow(TelemedicineConsultation c) {
        if (c.getScheduledStartAt() == null || c.getScheduledEndAt() == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Scheduled consultation has no time window"
            );
        }
        Instant now = Instant.now();
        if (now.isBefore(c.getScheduledStartAt())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This meeting can only start at or after the scheduled time: " + c.getScheduledStartAt()
            );
        }
        if (now.isAfter(c.getScheduledEndAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The scheduled meeting window has ended");
        }
    }

    @Transactional
    public SessionResponse end(String actorEmail, String publicRoomId) {
        String actor = actorEmail.trim().toLowerCase();
        TelemedicineConsultation c = repository.findByPublicRoomId(publicRoomId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consultation not found"));

        if (c.getStatus() == ConsultationStatus.ENDED) {
            return toResponse(c);
        }
        if (c.getStatus() == ConsultationStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consultation was cancelled");
        }

        if (c.getStatus() == ConsultationStatus.SCHEDULED) {
            if (!canEnd(actor, c)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to end this consultation");
            }
            c.setStatus(ConsultationStatus.ENDED);
            c.setEndedAt(Instant.now());
            repository.save(c);
            return toResponse(c);
        }

        if (!canEnd(actor, c)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to end this consultation");
        }

        c.setStatus(ConsultationStatus.ENDED);
        c.setEndedAt(Instant.now());
        repository.save(c);
        return toResponse(c);
    }

    private TelemedicineConsultation createScheduledConsultation(
            String patientEmail,
            String doctorEmail,
            String detailsText,
            String externalAppointmentId,
            Instant scheduledStart,
            int durationMin,
            Long intakeRequestId
    ) {
        Instant scheduledEnd = scheduledStart.plus(durationMin, ChronoUnit.MINUTES);
        String roomId = "medistream-" + UUID.randomUUID().toString().replace("-", "");
        String roomUrl = "https://" + jitsiDomain + "/" + roomId;

        TelemedicineConsultation c = TelemedicineConsultation.builder()
                .publicRoomId(roomId)
                .status(ConsultationStatus.SCHEDULED)
                .patientEmail(patientEmail.trim().toLowerCase())
                .doctorEmail(doctorEmail.trim().toLowerCase())
                .invitedDoctorEmail(null)
                .symptoms(detailsText)
                .externalAppointmentId(trimToNull(externalAppointmentId))
                .videoProvider(videoProvider)
                .roomUrl(roomUrl)
                .scheduledStartAt(scheduledStart)
                .scheduledEndAt(scheduledEnd)
                .intakeRequestId(intakeRequestId)
                .build();

        return repository.saveAndFlush(c);
    }

    private void assignNewRoom(TelemedicineConsultation consultation) {
        String roomId = "medistream-" + UUID.randomUUID().toString().replace("-", "");
        consultation.setPublicRoomId(roomId);
        consultation.setRoomUrl("https://" + jitsiDomain + "/" + roomId);
        consultation.setVideoProvider(videoProvider);
    }

    private boolean canEnd(String actor, TelemedicineConsultation c) {
        boolean isPatient = actor.equalsIgnoreCase(c.getPatientEmail());
        boolean isDoctor = c.getDoctorEmail() != null && actor.equalsIgnoreCase(c.getDoctorEmail());
        boolean isInvited = c.getInvitedDoctorEmail() != null && actor.equalsIgnoreCase(c.getInvitedDoctorEmail());
        return isPatient || isDoctor || isInvited;
    }

    private TelemedicineConsultation loadConsultation(Long consultationId) {
        if (consultationId == null) {
            return null;
        }
        return repository.findById(consultationId).orElse(null);
    }

    private IntakeRequestViewDto toIntakeViewDto(TelemedicineIntakeRequest r, TelemedicineConsultation c) {
        VisitSummaryDto visit = c != null ? toVisitSummary(c) : null;
        return new IntakeRequestViewDto(
                r.getId(),
                r.getPatientEmail(),
                r.getDoctorEmail(),
                r.getSymptoms(),
                r.getAdditionalDetails(),
                r.getUrgency(),
                r.getSymptomDuration(),
                r.getCurrentMedications(),
                r.getKnownAllergies(),
                r.getStatus().name(),
                r.getCreatedAt(),
                visit
        );
    }

    private VisitSummaryDto toVisitSummary(TelemedicineConsultation c) {
        return new VisitSummaryDto(
                c.getId(),
                c.getPublicRoomId(),
                c.getRoomUrl(),
                c.getScheduledStartAt(),
                c.getScheduledEndAt(),
                c.getStatus().name()
        );
    }

    private PendingConsultationDto toInvitationDto(TelemedicineConsultation c) {
        return new PendingConsultationDto(
                c.getId(),
                c.getIntakeRequestId(),
                c.getPublicRoomId(),
                c.getRoomUrl(),
                c.getPatientEmail(),
                c.getDoctorEmail(),
                c.getSymptoms(),
                c.getStatus().name(),
                c.getCreatedAt(),
                c.getScheduledStartAt(),
                c.getScheduledEndAt()
        );
    }

    private DoctorPastMeetingDto toDoctorPastMeetingDto(TelemedicineConsultation c) {
        return new DoctorPastMeetingDto(
                c.getId(),
                c.getIntakeRequestId(),
                c.getPatientEmail(),
                c.getPublicRoomId(),
                c.getStatus().name(),
                c.getSymptoms(),
                c.getScheduledStartAt(),
                c.getScheduledEndAt(),
                c.getStartedAt(),
                c.getEndedAt()
        );
    }

    private SessionResponse toResponse(TelemedicineConsultation c) {
        String url = c.getRoomUrl();
        return new SessionResponse(
                c.getIntakeRequestId(),
                c.getPublicRoomId(),
                url,
                url,
                c.getStatus().name(),
                c.getSymptoms(),
                c.getPatientEmail(),
                c.getDoctorEmail(),
                c.getInvitedDoctorEmail(),
                c.getScheduledStartAt(),
                c.getScheduledEndAt()
        );
    }

    private static String buildSummaryFromIntake(TelemedicineIntakeRequest r) {
        StringBuilder sb = new StringBuilder();
        sb.append("Chief complaint / symptoms:\n").append(r.getSymptoms()).append("\n\n");
        if (r.getAdditionalDetails() != null && !r.getAdditionalDetails().isBlank()) {
            sb.append("Additional details:\n").append(r.getAdditionalDetails().trim()).append("\n\n");
        }
        sb.append("Urgency: ").append(r.getUrgency() != null ? r.getUrgency() : "ROUTINE").append("\n");
        if (r.getSymptomDuration() != null && !r.getSymptomDuration().isBlank()) {
            sb.append("Duration of symptoms: ").append(r.getSymptomDuration().trim()).append("\n");
        }
        if (r.getCurrentMedications() != null && !r.getCurrentMedications().isBlank()) {
            sb.append("Current medications:\n").append(r.getCurrentMedications().trim()).append("\n");
        }
        if (r.getKnownAllergies() != null && !r.getKnownAllergies().isBlank()) {
            sb.append("Known allergies:\n").append(r.getKnownAllergies().trim()).append("\n");
        }
        return sb.toString().trim();
    }

    private static String normalizeUrgency(String urgency) {
        String t = trimToNull(urgency);
        if (t == null) {
            return "ROUTINE";
        }
        String u = t.toUpperCase();
        if ("URGENT".equals(u) || "ROUTINE".equals(u)) {
            return u;
        }
        return "ROUTINE";
    }

    private static String normalizeEmail(String email) {
        String t = trimToNull(email);
        return t == null ? null : t.toLowerCase();
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static Instant parseFlexibleInstant(String raw) {
        String value = trimToNull(raw);
        if (value == null) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ignored) {
            // Fallback for LocalDateTime values from internal service payloads.
        }
        try {
            return LocalDateTime.parse(value).atZone(ZoneId.systemDefault()).toInstant();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
