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

    // RestTemplate used for synchronous HTTP calls to other services (telemedicine, patient, notification).
    private final RestTemplate restTemplate = new RestTemplate();
    // Java 11 HttpClient used for PATCH requests because RestTemplate does not natively support PATCH.
    private final HttpClient httpClient = HttpClient.newHttpClient();

    // Base URLs for downstream microservices; configurable per environment via application.properties.
    @Value("${services.appointment.url:http://localhost:8086/api/v1}")
    private String appointmentServiceUrl;

    @Value("${services.telemedicine.url:http://localhost:8083}")
    private String telemedicineServiceUrl;

    @Value("${services.patient.url:http://localhost:8082}")
    private String patientServiceUrl;

    @Value("${services.notification.url:http://localhost:8085}")
    private String notificationServiceUrl;

    // Creates or updates a doctor-side appointment request from the authenticated doctor UI.
    // Uses an upsert pattern: if a record for this appointmentId already exists, it is updated;
    // otherwise a new one is created.
    public DoctorAppointmentRequest createPendingRequest(String doctorEmail, DoctorAppointmentRequestDto dto) {
        DoctorAppointmentRequest request = doctorAppointmentRequestRepository
                .findByAppointmentId(dto.getAppointmentId())
                .orElse(DoctorAppointmentRequest.builder()
                        .appointmentId(dto.getAppointmentId())
                        .doctorEmail(doctorEmail)
                        .build());

        request.setPatientEmail(dto.getPatientEmail());
        request.setScheduledAt(dto.getScheduledAt());
        request.setStatus("PENDING"); // Reset status to PENDING when revisiting a request.
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
        // (e.g., do not revert an ACCEPTED appointment back to PENDING on a duplicate notification).
        if (request.getStatus() == null || "PENDING".equals(request.getStatus())) {
            request.setPatientEmail(dto.getPatientEmail());
            request.setScheduledAt(dto.getScheduledAt());
            request.setStatus("PENDING");
            request.setUpdatedAt(LocalDateTime.now());
        }

        DoctorAppointmentRequest saved = doctorAppointmentRequestRepository.save(request);

        // Fire a notification to the doctor so they know a new request is waiting for their review.
        sendNotificationSafely(
            dto.getDoctorEmail(),
            "New Appointment Request",
            "A new paid appointment request is ready for your review. " +
                "Appointment ID: " + dto.getAppointmentId() + "."
        );

        return saved;
    }

    // Returns the doctor's appointment list, sorted with the most recently updated records first.
    // Triggers a background sync with the central appointment service before querying local storage
    // so that status changes made in other services are reflected immediately.
    public List<DoctorAppointmentRequest> getMyRequests(String doctorEmail) {
        syncFromAppointmentService(doctorEmail); // Pull latest statuses from the appointment service.

        return doctorAppointmentRequestRepository.findByDoctorEmailOrderByUpdatedAtDesc(doctorEmail)
            .stream()
            // Secondary sort handles cases where multiple rows share the same updatedAt timestamp.
            .sorted(Comparator.comparing(DoctorAppointmentRequest::getUpdatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    // Processes the doctor's ACCEPTED or REJECTED decision for an appointment request.
    // Steps:
    //   1. Ownership check — only the assigned doctor can decide.
    //   2. Status validation — only ACCEPTED or REJECTED are valid inputs.
    //   3. On ACCEPTED: approve in appointment service + sync telemedicine room.
    //   4. On REJECTED: notify the appointment service to mark the appointment rejected.
    //   5. Persist the decision locally and notify the patient.
    public DoctorAppointmentRequest decide(String doctorEmail, Long appointmentId, AppointmentDecisionDto dto) {
        DoctorAppointmentRequest request = doctorAppointmentRequestRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment request not found"));

        // Enforce that the decision comes from the doctor this appointment belongs to.
        if (!request.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to update this appointment request");
        }

        String status = dto.getStatus() == null ? "" : dto.getStatus().trim().toUpperCase();
        if (!"ACCEPTED".equals(status) && !"REJECTED".equals(status)) {
            throw new RuntimeException("Status must be ACCEPTED or REJECTED");
        }

        if ("ACCEPTED".equals(status)) {
            // Approve in the appointment service and create/update the telemedicine session.
            approveAppointmentAndSyncTelemedicine(request, dto);
        } else {
            // Notify the appointment service that the doctor declined.
            rejectAppointmentInAppointmentService(appointmentId);
        }

        request.setStatus(status);
        request.setDoctorNotes(dto.getDoctorNotes()); // Optional notes attached to the decision.
        request.setUpdatedAt(LocalDateTime.now());

        // Notify the patient about the outcome of their appointment request.
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

    // Combined operation triggered when a doctor accepts an appointment:
    //   1. PATCH the appointment service to set status = APPROVED (skipped if already approved).
    //   2. POST to the telemedicine service to create/update the video-call session and meeting link.
    // Throws if the telemedicine sync fails so the accept decision is not partially persisted.
    private void approveAppointmentAndSyncTelemedicine(DoctorAppointmentRequest request, AppointmentDecisionDto dto) {
        Long appointmentId = request.getAppointmentId();

        // Pre-check: avoid a duplicate PATCH if the appointment service already shows APPROVED.
        if (!isAppointmentAlreadyApproved(appointmentId)) {
            patchAppointmentService(appointmentId, "approve");
        } else {
            log.info("Skipping approve PATCH for appointmentId={} because status is already APPROVED", appointmentId);
        }

        // Use the scheduled time from the decision DTO if provided; fall back to the stored scheduled time.
        String scheduledStartAt = firstNonBlank(dto.getScheduledStartAt(), request.getScheduledAt());
        Integer durationMinutes = dto.getDurationMinutes() != null ? dto.getDurationMinutes() : 60; // Default 60-min session.
        boolean regenerateLink = Boolean.TRUE.equals(dto.getRegenerateLink()); // true = force a new meeting room URL.

        // Build the payload for the telemedicine sync endpoint.
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
            // Throw so the caller's transaction is not committed with a half-approved state.
            throw new RuntimeException("Appointment approved but telemedicine sync failed: " + e.getMessage(), e);
        }
    }

    // Thin wrapper that delegates to patchAppointmentService with the 'reject' action.
    private void rejectAppointmentInAppointmentService(Long appointmentId) {
        patchAppointmentService(appointmentId, "reject");
    }

    // Issues a PATCH request to the appointment service for 'approve' or 'reject'.
    // Implements a two-URL fallback strategy:
    //   Primary URL:  <base>/appointments/{id}/{action}
    //   Fallback URL: <base>/api/v1/appointments/{id}/{action}  (only tried when primary base has no /api/v1)
    // Idempotent for approve: if the appointment service returns 400/409 with a body indicating
    // the appointment is already approved, the method returns success silently.
    private void patchAppointmentService(Long appointmentId, String action) {
        String base = appointmentServiceUrl;
        String primaryUrl = base + "/appointments/" + appointmentId + "/" + action;
        try {
            PatchResult primary = executePatch(primaryUrl);
            if (primary.isSuccess()) {
                return; // Happy path: appointment service accepted the change.
            }
            // Check if the response indicates the appointment is already in the desired state.
            if (shouldTreatAsAlreadyApproved(action, primary.statusCode(), primary.body())) {
                log.warn("Appointment {} treated as already completed for appointmentId={}: {}",
                        action,
                        appointmentId,
                        primary.body());
                return;
            }
            // If the base URL already includes /api/v1, there is nowhere else to fall back.
            if (base.contains("/api/v1")) {
                throw new RuntimeException("Could not " + action + " appointment in appointment service: status="
                        + primary.statusCode() + " body=" + primary.body());
            }
            // Try the versioned path as a fallback when the primary path returns a non-success code.
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
            throw ex; // Re-throw RuntimeExceptions directly without wrapping.
        } catch (Exception ex) {
            throw new RuntimeException("Could not " + action + " appointment in appointment service: "
                    + ex.getMessage(), ex);
        }
    }

    // Executes an HTTP PATCH with an empty body to the given URL using Java's HttpClient.
    // Returns a PatchResult record containing the HTTP status code and response body.
    // Uses Java HttpClient instead of RestTemplate because RestTemplate requires an explicit
    // MessageConverter setup to handle PATCH without a body.
    private PatchResult executePatch(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .method("PATCH", HttpRequest.BodyPublishers.noBody()) // Empty body PATCH.
                    .header("Content-Type", "application/json")
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return new PatchResult(response.statusCode(), response.body() == null ? "" : response.body());
        } catch (Exception ex) {
            throw new RuntimeException("I/O error on PATCH request for \"" + url + "\": " + ex.getMessage(), ex);
        }
    }

    // Idempotency guard: returns true when an 'approve' PATCH fails because the appointment
    // service reports the appointment is already in APPROVED state.
    // Prevents failing the doctor's accept action when the status was already set by another path.
    private boolean shouldTreatAsAlreadyApproved(String action, int statusCode, String bodyRaw) {
        if (!"approve".equalsIgnoreCase(action)) {
            return false; // Only relevant for approval, not rejection.
        }
        if (statusCode != 400 && statusCode != 409) {
            return false; // Only intercept business-logic error codes, not network errors.
        }
        String body = bodyRaw == null ? "" : bodyRaw.toLowerCase();
        // Match known error messages returned by the appointment service for repeat approvals.
        return body.contains("only pending appointments can be approved")
                || body.contains("current status: approved")
                || body.contains("already approved");
    }

    // Lightweight value object holding the HTTP status code and body of a PATCH response.
    private record PatchResult(int statusCode, String body) {
        // Returns true for any 2xx HTTP response code.
        private boolean isSuccess() {
            return statusCode >= 200 && statusCode < 300;
        }
    }

    // Returns the first non-blank string from the two candidates.
    // Used to pick the scheduled time from the decision DTO, falling back to the stored value.
    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        throw new RuntimeException("A schedule time is required to create telemedicine visit");
    }

    // Pulls the latest appointment data for the given doctor from the appointment service
    // and upserts each appointment into the local doctor-appointment-requests table.
    // This keeps the doctor's queue in sync even when appointments are created or modified
    // by other services (e.g., the patient booking flow).
    // Errors are swallowed with a warning so that a temporary appointment-service outage
    // does not prevent the doctor from viewing previously synced appointments.
    @SuppressWarnings("unchecked")
    private void syncFromAppointmentService(String doctorEmail) {
        Optional<DoctorProfile> profileOpt = doctorProfileRepository.findByEmail(doctorEmail);
        // Cannot sync without a doctor ID to query the appointment service.
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
                // Support both 'appointmentId' and 'id' field names from different API versions.
                Long appointmentId = readLong(appt.get("appointmentId"));
                if (appointmentId == null) {
                    appointmentId = readLong(appt.get("id"));
                }
                if (appointmentId == null) {
                    continue; // Skip rows without a valid appointment ID.
                }

                // Upsert: find the existing local record or build a new one.
                DoctorAppointmentRequest request = doctorAppointmentRequestRepository
                        .findByAppointmentId(appointmentId)
                        .orElse(DoctorAppointmentRequest.builder()
                                .appointmentId(appointmentId)
                                .doctorEmail(doctorEmail)
                                .build());

                request.setDoctorEmail(doctorEmail);

                // Extract patient email; the appointment payload may nest it inside 'patientInfo'.
                String patientEmail = extractPatientEmail(appt);
                if (patientEmail != null && !patientEmail.isBlank()) {
                    request.setPatientEmail(patientEmail);
                }

                // Skip entirely if patient email is still unknown (required field).
                if (request.getPatientEmail() == null || request.getPatientEmail().isBlank()) {
                    log.warn("Skipping appointment sync for appointmentId={} because patient email is missing", appointmentId);
                    continue;
                }

                // Update the scheduled date/time from the appointment service if available.
                String scheduledAt = readString(appt.get("appointmentDate"));
                if (scheduledAt != null && !scheduledAt.isBlank()) {
                    request.setScheduledAt(scheduledAt);
                }

                // Map the appointment service's status to our local status vocabulary.
                // Only apply if the mapped status is non-null and doesn't overwrite a more authoritative local decision.
                String mappedStatus = mapAppointmentStatus(readString(appt.get("status")));
                if (mappedStatus != null && shouldApplySyncedStatus(request.getStatus(), mappedStatus)) {
                    request.setStatus(mappedStatus);
                }

                request.setUpdatedAt(LocalDateTime.now());
                doctorAppointmentRequestRepository.save(request);
            }
        } catch (Exception ex) {
            // Log and swallow so a temporary appointment-service outage doesn't break the doctor UI.
            log.warn("Could not sync appointments for doctor {} from appointment service: {}",
                    doctorEmail,
                    ex.getMessage());
        }
    }

    // Fetches all appointments for a doctor from the appointment service.
    // Tries the configured base URL first; falls back to the /api/v1-prefixed URL if needed.
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchDoctorAppointments(Long doctorId) {
        String primaryUrl = appointmentServiceUrl + "/appointments/doctor/" + doctorId;
        try {
            return restTemplate.getForObject(primaryUrl, List.class);
        } catch (Exception primaryEx) {
            // Only attempt fallback when the base URL doesn't already contain /api/v1.
            if (!appointmentServiceUrl.contains("/api/v1")) {
                String fallbackUrl = appointmentServiceUrl + "/api/v1/appointments/doctor/" + doctorId;
                return restTemplate.getForObject(fallbackUrl, List.class);
            }
            throw primaryEx;
        }
    }

    // Extracts the patient email from an appointment payload.
    // Handles two response shapes:
    //   1. Nested: { patientInfo: { email: "..." } }  (preferred, newer API)
    //   2. Flat:   { patientEmail: "..." }             (legacy / older API versions)
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

        // Fall back to the top-level 'patientEmail' field if the nested object is absent.
        return readString(appointmentPayload.get("patientEmail"));
    }

    // Maps the appointment service's status string to the set of statuses recognised by this service.
    // Returns null for unknown/unsupported status values so that the caller can skip the update.
    private String mapAppointmentStatus(String appointmentStatus) {
        if (appointmentStatus == null || appointmentStatus.isBlank()) {
            return null;
        }

        return switch (appointmentStatus.trim().toUpperCase()) {
            case "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED" ->
                    appointmentStatus.trim().toUpperCase();
            default -> null; // Unknown status — don't apply.
        };
    }

    // Decides whether the synced status from the appointment service should overwrite the local status.
    // Guard rule: if the local record already reflects a doctor decision (ACCEPTED, APPROVED, REJECTED,
    // COMPLETED) and the upstream service temporarily reverts to PENDING (e.g. due to eventual consistency),
    // the local decision is preserved to avoid confusing the doctor UI.
    private boolean shouldApplySyncedStatus(String currentStatusRaw, String syncedStatusRaw) {
        if (syncedStatusRaw == null || syncedStatusRaw.isBlank()) {
            return false;
        }
        if (currentStatusRaw == null || currentStatusRaw.isBlank()) {
            return true; // No local status yet — apply whatever the upstream says.
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

    // Safely casts or parses a raw JSON number/string value to Long.
    // Returns null instead of throwing if the value cannot be converted.
    private Long readLong(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        if (rawValue instanceof Number number) {
            return number.longValue(); // JSON numbers are deserialized as Integer or Double by Jackson.
        }
        try {
            return Long.parseLong(String.valueOf(rawValue));
        } catch (NumberFormatException ex) {
            return null; // Value is not numeric — return null gracefully.
        }
    }

    // Converts an Object to its string representation; returns null for null input.
    private String readString(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        return String.valueOf(rawValue);
    }

    // Queries the appointment service to check whether the appointment is already APPROVED.
    // Used to make approve operations idempotent and avoid duplicate PATCH calls.
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

    // Marks an accepted appointment as completed from the doctor's side.
    // Preconditions:
    //   - Appointment must exist in local doctor table.
    //   - Caller must be the owning doctor.
    //   - Status must already be ACCEPTED or APPROVED.
    // Also notifies the patient after the status transition.
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

    // Best-effort notification sender.
    // Intentionally swallows downstream failures so doctor-facing workflows (accept/reject/complete)
    // are not blocked when the notification service is temporarily unavailable.
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

    // Returns all uploaded medical reports for the patient linked to an appointment.
    // Security checks are strict:
    //   1. If local appointment exists, the requesting doctor must match local ownership.
    //   2. If local record is missing, ownership is validated against appointment-service payload.
    // Graceful degradation:
    //   - Returns an empty list when dependencies are temporarily unavailable,
    //     so the doctor UI still renders without hard failure.
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
            // Fallback #1: extract email from the fetched appointment payload.
            patientEmail = extractPatientEmail(appointmentPayload == null ? Map.of() : appointmentPayload);
        }
        if (patientEmail == null || patientEmail.isBlank()) {
            try {
                // Fallback #2: direct lookup from appointment service by appointment ID.
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

    // Fetches a single appointment payload by ID with URL-version fallback.
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

    // Confirms that an appointment payload belongs to the requesting doctor.
    // Two matching strategies are supported:
    //   1. Direct email match via appointment.doctorInfo.email
    //   2. doctorId match against the local doctor profile ID
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

    // Last-resort resolver for patient email when local cached data is incomplete.
    // Reads appointment payload directly and attempts both nested and flat email fields.
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
