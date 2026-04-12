package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.AppointmentDecisionDto;
import com.healthcare.doctor.dto.DoctorAppointmentRequestDto;
import com.healthcare.doctor.entity.DoctorAppointmentRequest;
import com.healthcare.doctor.entity.DoctorProfile;
import com.healthcare.doctor.repository.DoctorAppointmentRequestRepository;
import com.healthcare.doctor.repository.DoctorProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DoctorAppointmentService {

    private final DoctorAppointmentRequestRepository doctorAppointmentRequestRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${services.appointment.url:http://localhost:8086/api/v1}")
    private String appointmentServiceUrl;

    @Value("${services.telemedicine.url:http://localhost:8083}")
    private String telemedicineServiceUrl;

    @Value("${services.patient.url:http://localhost:8082}")
    private String patientServiceUrl;

    @Value("${services.notification.url:http://localhost:8085}")
    private String notificationServiceUrl;

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

    /**
     * Internal service-to-service method called by the appointment service after an
     * appointment is approved (payment completed).  The doctor email comes from the
     * request payload instead of the Spring Security context.
     */
    public DoctorAppointmentRequest createPendingRequestInternal(DoctorAppointmentRequestDto dto) {
        if (dto.getDoctorEmail() == null || dto.getDoctorEmail().isBlank()) {
            throw new RuntimeException("doctorEmail is required for internal appointment notification");
        }

        DoctorAppointmentRequest request = doctorAppointmentRequestRepository
                .findByAppointmentId(dto.getAppointmentId())
                .orElse(DoctorAppointmentRequest.builder()
                        .appointmentId(dto.getAppointmentId())
                        .doctorEmail(dto.getDoctorEmail())
                        .build());

        // Only update if it's still in a pending/new state so that doctor decisions are not overwritten
        if (request.getStatus() == null || "PENDING".equals(request.getStatus())) {
            request.setPatientEmail(dto.getPatientEmail());
            request.setScheduledAt(dto.getScheduledAt());
            request.setStatus("PENDING");
            request.setUpdatedAt(LocalDateTime.now());
        }

        DoctorAppointmentRequest saved = doctorAppointmentRequestRepository.save(request);

        sendNotificationSafely(
            dto.getDoctorEmail(),
            "New Appointment Request",
            "A new paid appointment request is ready for your review. " +
                "Appointment ID: " + dto.getAppointmentId() + "."
        );

        return saved;
    }

    public List<DoctorAppointmentRequest> getMyRequests(String doctorEmail) {
        syncFromAppointmentService(doctorEmail);

        return doctorAppointmentRequestRepository.findByDoctorEmailOrderByUpdatedAtDesc(doctorEmail)
            .stream()
            .sorted(Comparator.comparing(DoctorAppointmentRequest::getUpdatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
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

        if ("ACCEPTED".equals(status)) {
            approveAppointmentAndSyncTelemedicine(request, dto);
        } else {
            rejectAppointmentInAppointmentService(appointmentId);
        }

        request.setStatus(status);
        request.setDoctorNotes(dto.getDoctorNotes());
        request.setUpdatedAt(LocalDateTime.now());

        if ("ACCEPTED".equals(status)) {
            sendNotificationSafely(
                    request.getPatientEmail(),
                    "Appointment Accepted",
                    "Your appointment has been accepted by the doctor. " +
                            "Appointment ID: " + appointmentId + "."
            );
        } else {
            sendNotificationSafely(
                    request.getPatientEmail(),
                    "Appointment Rejected",
                    "Your appointment was rejected by the doctor. " +
                            "Appointment ID: " + appointmentId + "."
            );
        }

        return doctorAppointmentRequestRepository.save(request);
    }

    private void approveAppointmentAndSyncTelemedicine(DoctorAppointmentRequest request, AppointmentDecisionDto dto) {
        Long appointmentId = request.getAppointmentId();
        if (!isAppointmentAlreadyApproved(appointmentId)) {
            patchAppointmentService(appointmentId, "approve");
        } else {
            log.info("Skipping approve PATCH for appointmentId={} because status is already APPROVED", appointmentId);
        }

        String scheduledStartAt = firstNonBlank(dto.getScheduledStartAt(), request.getScheduledAt());
        Integer durationMinutes = dto.getDurationMinutes() != null ? dto.getDurationMinutes() : 60;
        boolean regenerateLink = Boolean.TRUE.equals(dto.getRegenerateLink());

        Map<String, Object> payload = new HashMap<>();
        payload.put("appointmentId", appointmentId);
        payload.put("patientEmail", request.getPatientEmail());
        payload.put("doctorEmail", request.getDoctorEmail());
        payload.put("scheduledStartAt", scheduledStartAt);
        payload.put("durationMinutes", durationMinutes);
        payload.put("doctorNotes", dto.getDoctorNotes());
        payload.put("regenerateLink", regenerateLink);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);
        String syncUrl = telemedicineServiceUrl + "/api/telemedicine/internal/appointments/sync";

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(syncUrl, requestEntity, String.class);
            log.info("Telemedicine sync completed for appointmentId={} status={}", appointmentId, response.getStatusCode());
        } catch (Exception e) {
            throw new RuntimeException("Appointment approved but telemedicine sync failed: " + e.getMessage(), e);
        }
    }

    private void rejectAppointmentInAppointmentService(Long appointmentId) {
        patchAppointmentService(appointmentId, "reject");
    }

    private void patchAppointmentService(Long appointmentId, String action) {
        String base = appointmentServiceUrl;
        String primaryUrl = base + "/appointments/" + appointmentId + "/" + action;
        try {
            PatchResult primary = executePatch(primaryUrl);
            if (primary.isSuccess()) {
                return;
            }
            if (shouldTreatAsAlreadyApproved(action, primary.statusCode(), primary.body())) {
                log.warn("Appointment {} treated as already completed for appointmentId={}: {}",
                        action,
                        appointmentId,
                        primary.body());
                return;
            }
            if (base.contains("/api/v1")) {
                throw new RuntimeException("Could not " + action + " appointment in appointment service: status="
                        + primary.statusCode() + " body=" + primary.body());
            }
            String fallbackUrl = base + "/api/v1/appointments/" + appointmentId + "/" + action;
            PatchResult fallback = executePatch(fallbackUrl);
            if (fallback.isSuccess()) {
                log.info("Appointment {} fallback endpoint succeeded for appointmentId={}", action, appointmentId);
                return;
            }
            if (shouldTreatAsAlreadyApproved(action, fallback.statusCode(), fallback.body())) {
                log.warn("Appointment {} fallback treated as already completed for appointmentId={}: {}",
                        action,
                        appointmentId,
                        fallback.body());
                return;
            }
            throw new RuntimeException("Could not " + action + " appointment in appointment service: status="
                    + fallback.statusCode() + " body=" + fallback.body());
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new RuntimeException("Could not " + action + " appointment in appointment service: "
                    + ex.getMessage(), ex);
        }
    }

    private PatchResult executePatch(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .method("PATCH", HttpRequest.BodyPublishers.noBody())
                    .header("Content-Type", "application/json")
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return new PatchResult(response.statusCode(), response.body() == null ? "" : response.body());
        } catch (Exception ex) {
            throw new RuntimeException("I/O error on PATCH request for \"" + url + "\": " + ex.getMessage(), ex);
        }
    }

    private boolean shouldTreatAsAlreadyApproved(String action, int statusCode, String bodyRaw) {
        if (!"approve".equalsIgnoreCase(action)) {
            return false;
        }
        if (statusCode != 400 && statusCode != 409) {
            return false;
        }
        String body = bodyRaw == null ? "" : bodyRaw.toLowerCase();
        return body.contains("only pending appointments can be approved")
                || body.contains("current status: approved")
                || body.contains("already approved");
    }

    private record PatchResult(int statusCode, String body) {
        private boolean isSuccess() {
            return statusCode >= 200 && statusCode < 300;
        }
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        throw new RuntimeException("A schedule time is required to create telemedicine visit");
    }

    @SuppressWarnings("unchecked")
    private void syncFromAppointmentService(String doctorEmail) {
        Optional<DoctorProfile> profileOpt = doctorProfileRepository.findByEmail(doctorEmail);
        if (profileOpt.isEmpty() || profileOpt.get().getId() == null) {
            return;
        }

        Long doctorId = profileOpt.get().getId();

        try {
            List<Map<String, Object>> appointments = fetchDoctorAppointments(doctorId);
            if (appointments == null || appointments.isEmpty()) {
                return;
            }

            for (Map<String, Object> appt : appointments) {
                Long appointmentId = readLong(appt.get("appointmentId"));
                if (appointmentId == null) {
                    appointmentId = readLong(appt.get("id"));
                }
                if (appointmentId == null) {
                    continue;
                }

                DoctorAppointmentRequest request = doctorAppointmentRequestRepository
                        .findByAppointmentId(appointmentId)
                        .orElse(DoctorAppointmentRequest.builder()
                                .appointmentId(appointmentId)
                                .doctorEmail(doctorEmail)
                                .build());

                request.setDoctorEmail(doctorEmail);

                String patientEmail = extractPatientEmail(appt);
                if (patientEmail != null && !patientEmail.isBlank()) {
                    request.setPatientEmail(patientEmail);
                }

                if (request.getPatientEmail() == null || request.getPatientEmail().isBlank()) {
                    log.warn("Skipping appointment sync for appointmentId={} because patient email is missing", appointmentId);
                    continue;
                }

                String scheduledAt = readString(appt.get("appointmentDate"));
                if (scheduledAt != null && !scheduledAt.isBlank()) {
                    request.setScheduledAt(scheduledAt);
                }

                String mappedStatus = mapAppointmentStatus(readString(appt.get("status")));
                if (mappedStatus != null && shouldApplySyncedStatus(request.getStatus(), mappedStatus)) {
                    request.setStatus(mappedStatus);
                }

                request.setUpdatedAt(LocalDateTime.now());
                doctorAppointmentRequestRepository.save(request);
            }
        } catch (Exception ex) {
            log.warn("Could not sync appointments for doctor {} from appointment service: {}",
                    doctorEmail,
                    ex.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchDoctorAppointments(Long doctorId) {
        String primaryUrl = appointmentServiceUrl + "/appointments/doctor/" + doctorId;
        try {
            return restTemplate.getForObject(primaryUrl, List.class);
        } catch (Exception primaryEx) {
            if (!appointmentServiceUrl.contains("/api/v1")) {
                String fallbackUrl = appointmentServiceUrl + "/api/v1/appointments/doctor/" + doctorId;
                return restTemplate.getForObject(fallbackUrl, List.class);
            }
            throw primaryEx;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractPatientEmail(Map<String, Object> appointmentPayload) {
        Object patientInfoRaw = appointmentPayload.get("patientInfo");
        if (patientInfoRaw instanceof Map<?, ?> patientInfoMap) {
            Object emailRaw = ((Map<String, Object>) patientInfoMap).get("email");
            String email = readString(emailRaw);
            if (email != null && !email.isBlank()) {
                return email;
            }
        }

        return readString(appointmentPayload.get("patientEmail"));
    }

    private String mapAppointmentStatus(String appointmentStatus) {
        if (appointmentStatus == null || appointmentStatus.isBlank()) {
            return null;
        }

        return switch (appointmentStatus.trim().toUpperCase()) {
            case "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED" ->
                    appointmentStatus.trim().toUpperCase();
            default -> null;
        };
    }

    private boolean shouldApplySyncedStatus(String currentStatusRaw, String syncedStatusRaw) {
        if (syncedStatusRaw == null || syncedStatusRaw.isBlank()) {
            return false;
        }
        if (currentStatusRaw == null || currentStatusRaw.isBlank()) {
            return true;
        }

        String currentStatus = currentStatusRaw.trim().toUpperCase();
        String syncedStatus = syncedStatusRaw.trim().toUpperCase();

        // Keep doctor-side decisions stable if upstream still temporarily reports PENDING.
        if ("PENDING".equals(syncedStatus)
                && ("ACCEPTED".equals(currentStatus)
                || "APPROVED".equals(currentStatus)
                || "REJECTED".equals(currentStatus)
                || "COMPLETED".equals(currentStatus))) {
            return false;
        }

        return true;
    }

    private Long readLong(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        if (rawValue instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(rawValue));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String readString(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        return String.valueOf(rawValue);
    }

    @SuppressWarnings("unchecked")
    private boolean isAppointmentAlreadyApproved(Long appointmentId) {
        String url = appointmentServiceUrl + "/appointments/" + appointmentId;
        try {
            Map<String, Object> payload = restTemplate.getForObject(url, Map.class);
            if (payload == null) {
                return false;
            }
            Object status = payload.get("status");
            return status != null && "APPROVED".equalsIgnoreCase(String.valueOf(status));
        } catch (Exception ex) {
            log.warn("Could not pre-check appointment status for appointmentId={}: {}", appointmentId, ex.getMessage());
            return false;
        }
    }

    public DoctorAppointmentRequest completeAppointment(String doctorEmail, Long appointmentId) {
        DoctorAppointmentRequest request = doctorAppointmentRequestRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment request not found"));

        if (!request.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to complete this appointment");
        }

        if (!"ACCEPTED".equals(request.getStatus()) && !"APPROVED".equals(request.getStatus())) {
            throw new RuntimeException("Only ACCEPTED appointments can be marked as completed");
        }

        request.setStatus("COMPLETED");
        request.setUpdatedAt(LocalDateTime.now());

        sendNotificationSafely(
                request.getPatientEmail(),
                "Appointment Completed",
                "Your appointment has been marked as completed by the doctor. " +
                        "Appointment ID: " + appointmentId + "."
        );

        return doctorAppointmentRequestRepository.save(request);
    }

    private void sendNotificationSafely(String recipientEmail, String subject, String content) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return;
        }

        String endpoint = notificationServiceUrl + "/api/notifications/send";
        Map<String, Object> payload = new HashMap<>();
        payload.put("recipientEmail", recipientEmail);
        payload.put("subject", subject);
        payload.put("content", content);
        payload.put("type", "APPOINTMENT_REMINDER");
        payload.put("sendNow", true);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            restTemplate.postForEntity(endpoint, requestEntity, Map.class);
        } catch (Exception ex) {
            log.warn("Notification service call failed for recipient={}: {}", recipientEmail, ex.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPatientReportsForAppointment(String doctorEmail, Long appointmentId) {
        DoctorAppointmentRequest request = doctorAppointmentRequestRepository.findByAppointmentId(appointmentId)
                .orElse(null);

        if (request != null && request.getDoctorEmail() != null
                && !request.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to view reports for this appointment");
        }

        Map<String, Object> appointmentPayload = null;
        try {
            appointmentPayload = fetchAppointmentById(appointmentId);
        } catch (Exception ex) {
            log.warn("Could not fetch appointment {} for report lookup: {}", appointmentId, ex.getMessage());
        }

        boolean hasLocalDoctorOwnership = request != null
            && request.getDoctorEmail() != null
            && request.getDoctorEmail().equalsIgnoreCase(doctorEmail);

        if (appointmentPayload != null && !hasLocalDoctorOwnership
            && !isAppointmentOwnedByDoctor(appointmentPayload, doctorEmail)) {
            throw new RuntimeException("You are not allowed to view reports for this appointment");
        }

        if (request == null && appointmentPayload == null) {
            // Avoid failing the UI when dependent service is temporarily unavailable.
            return List.of();
        }

        String patientEmail = request == null ? null : request.getPatientEmail();
        if (patientEmail == null || patientEmail.isBlank()) {
            patientEmail = extractPatientEmail(appointmentPayload == null ? Map.of() : appointmentPayload);
        }
        if (patientEmail == null || patientEmail.isBlank()) {
            try {
                patientEmail = resolvePatientEmailFromAppointmentService(appointmentId);
            } catch (Exception ex) {
                log.warn("Could not resolve patient email from appointment {}: {}", appointmentId, ex.getMessage());
            }
        }

        if (patientEmail == null || patientEmail.isBlank()) {
            return List.of();
        }

        if (request == null) {
            request = DoctorAppointmentRequest.builder()
                    .appointmentId(appointmentId)
                    .doctorEmail(doctorEmail)
                    .build();
        }

        request.setDoctorEmail(doctorEmail);
        request.setPatientEmail(patientEmail);
        if (appointmentPayload != null) {
            String mappedStatus = mapAppointmentStatus(readString(appointmentPayload.get("status")));
            if (mappedStatus != null) {
                request.setStatus(mappedStatus);
            }
        }
        request.setUpdatedAt(LocalDateTime.now());
        doctorAppointmentRequestRepository.save(request);

        String endpoint = UriComponentsBuilder
                .fromHttpUrl(patientServiceUrl + "/api/patients/reports/internal/by-email")
                .queryParam("patientEmail", patientEmail)
                .toUriString();

        try {
            ResponseEntity<List> response = restTemplate.getForEntity(endpoint, List.class);
            List<Map<String, Object>> rows = response.getBody();
            return rows == null ? List.of() : rows;
        } catch (Exception e) {
            log.warn("Failed to load patient reports from patient service for {}: {}", patientEmail, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchAppointmentById(Long appointmentId) {
        String primaryUrl = appointmentServiceUrl + "/appointments/" + appointmentId;
        try {
            return restTemplate.getForObject(primaryUrl, Map.class);
        } catch (Exception primaryEx) {
            if (!appointmentServiceUrl.contains("/api/v1")) {
                String fallbackUrl = appointmentServiceUrl + "/api/v1/appointments/" + appointmentId;
                return restTemplate.getForObject(fallbackUrl, Map.class);
            }
            throw primaryEx;
        }
    }

    @SuppressWarnings("unchecked")
    private boolean isAppointmentOwnedByDoctor(Map<String, Object> appointmentPayload, String doctorEmail) {
        if (appointmentPayload == null || doctorEmail == null || doctorEmail.isBlank()) {
            return false;
        }

        Object doctorInfoRaw = appointmentPayload.get("doctorInfo");
        if (doctorInfoRaw instanceof Map<?, ?> doctorInfoMap) {
            String doctorInfoEmail = readString(((Map<String, Object>) doctorInfoMap).get("email"));
            if (doctorInfoEmail != null && doctorInfoEmail.equalsIgnoreCase(doctorEmail)) {
                return true;
            }
        }

        Long appointmentDoctorId = readLong(appointmentPayload.get("doctorId"));
        if (appointmentDoctorId != null) {
            Optional<DoctorProfile> profileOpt = doctorProfileRepository.findByEmail(doctorEmail);
            if (profileOpt.isPresent() && profileOpt.get().getId() != null) {
                return appointmentDoctorId.equals(profileOpt.get().getId());
            }
        }

        return false;
    }

    @SuppressWarnings("unchecked")
    private String resolvePatientEmailFromAppointmentService(Long appointmentId) {
        String primaryUrl = appointmentServiceUrl + "/appointments/" + appointmentId;
        Map<String, Object> payload;

        try {
            payload = restTemplate.getForObject(primaryUrl, Map.class);
        } catch (Exception primaryEx) {
            if (!appointmentServiceUrl.contains("/api/v1")) {
                String fallbackUrl = appointmentServiceUrl + "/api/v1/appointments/" + appointmentId;
                payload = restTemplate.getForObject(fallbackUrl, Map.class);
            } else {
                throw primaryEx;
            }
        }

        if (payload == null) {
            return null;
        }

        Object patientInfoRaw = payload.get("patientInfo");
        if (patientInfoRaw instanceof Map<?, ?> patientInfoMap) {
            Object emailRaw = ((Map<String, Object>) patientInfoMap).get("email");
            String email = readString(emailRaw);
            if (email != null && !email.isBlank()) {
                return email;
            }
        }

        String direct = readString(payload.get("patientEmail"));
        if (direct != null && !direct.isBlank()) {
            return direct;
        }

        return null;
    }
}
