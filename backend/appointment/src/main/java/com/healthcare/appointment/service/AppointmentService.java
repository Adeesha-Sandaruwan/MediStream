package com.healthcare.appointment.service;

import com.healthcare.appointment.dto.AppointmentCreateRequest;
import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.dto.AppointmentUpdateRequest;
import com.healthcare.appointment.dto.PaymentStatusUpdateRequest;
import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentPaymentStatus;
import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.exception.AppointmentNotFoundException;
import com.healthcare.appointment.exception.InvalidAppointmentException;
import com.healthcare.appointment.feign.DoctorServiceClient;
import com.healthcare.appointment.feign.PatientServiceClient;
import com.healthcare.appointment.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service layer for appointment management
 * 
 * Handles business logic for:
 * - Creating appointments
 * - Updating appointments
 * - Cancelling appointments
 * - Changing appointment status
 * - Tracking appointment history
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AppointmentService {

    private static final int SLOT_DURATION_MINUTES = 30;
    private static final Set<AppointmentStatus> BLOCKING_STATUSES = EnumSet.of(
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.COMPLETED
    );

    private final AppointmentRepository appointmentRepository;
    private final AppointmentMapper appointmentMapper;
    private final EmailNotificationService emailNotificationService;
    private final PatientServiceClient patientServiceClient;
    private final DoctorServiceClient doctorServiceClient;

    /**
     * Get all appointments
     * 
     * @return List of all appointment responses
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments() {
        log.info("Fetching all appointments");
        List<Appointment> appointments = appointmentRepository.findAll();
        return appointments.stream()
                .map(appointmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Create a new appointment
     * 
     * @param request Appointment creation request
     * @return Created appointment response
     * @throws InvalidAppointmentException if validation fails
     */
    public AppointmentResponse createAppointment(AppointmentCreateRequest request) {
        log.info("Creating appointment for patient: {} with doctor: {}", 
                request.getPatientId(), request.getDoctorId());

        // Validate patient exists
        validatePatientExists(request.getPatientId());

        // Validate doctor exists and is available
        validateDoctorExists(request.getDoctorId());
        validateDoctorAvailability(request.getDoctorId());

        // Validate appointment date is in future
        validateAppointmentDate(request.getAppointmentDate());

        validateThirtyMinuteSlot(request.getAppointmentDate(), request.getDurationMinutes());

        // Check for scheduling conflicts
        validateNoConflictingAppointments(request.getDoctorId(), request.getAppointmentDate());

        // Create appointment
        Appointment appointment = appointmentMapper.toEntity(request);
        try {
            appointment = appointmentRepository.save(appointment);
        } catch (DataIntegrityViolationException ex) {
            throw new InvalidAppointmentException(
                    "This 30-minute slot has just been booked by another patient. Please select a different time.");
        }

        log.info("Appointment created successfully with ID: {}", appointment.getId());

        // Convert to response and send emails
        AppointmentResponse response = appointmentMapper.toResponse(appointment);

        // Send notification emails asynchronously
        emailNotificationService.sendAppointmentCreationEmail(response);
        emailNotificationService.sendAppointmentCreationNotificationToDoctor(response);

        return response;
    }

    /**
     * Get appointment by ID
     * 
     * @param appointmentId Appointment identifier
     * @return Appointment response
     * @throws AppointmentNotFoundException if not found
     */
    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Long appointmentId) {
        log.info("Fetching appointment with ID: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        return appointmentMapper.toResponse(appointment);
    }

    /**
     * Get all appointments for a patient
     * 
     * @param patientId Patient identifier
     * @return List of appointment responses
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getPatientAppointments(Long patientId) {
        log.info("Fetching appointments for patient: {}", patientId);

        validatePatientExists(patientId);

        return appointmentRepository.findByPatientId(patientId)
                .stream()
                .map(appointmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all appointments for a doctor
     * 
     * @param doctorId Doctor identifier
     * @return List of appointment responses
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getDoctorAppointments(Long doctorId) {
        log.info("Fetching appointments for doctor: {}", doctorId);

        validateDoctorExists(doctorId);

        return appointmentRepository.findByDoctorId(doctorId)
                .stream()
                .map(appointmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get pending appointments for a doctor
     * 
     * @param doctorId Doctor identifier
     * @return List of pending appointment responses
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getPendingAppointments(Long doctorId) {
        log.info("Fetching pending appointments for doctor: {}", doctorId);

        validateDoctorExists(doctorId);

        return appointmentRepository
                .findByDoctorIdAndStatusOrderByAppointmentDateAsc(doctorId, AppointmentStatus.PENDING)
                .stream()
                .map(appointmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update an existing appointment
     * 
     * @param appointmentId Appointment identifier
     * @param request Update request
     * @return Updated appointment response
     * @throws AppointmentNotFoundException if not found
     * @throws InvalidAppointmentException if update is invalid
     */
    public AppointmentResponse updateAppointment(Long appointmentId, 
                                                  AppointmentUpdateRequest request) {
        log.info("Updating appointment with ID: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        // Can only update pending appointments
        if (!appointment.getStatus().equals(AppointmentStatus.PENDING)) {
            throw new InvalidAppointmentException(
                    "Can only update appointments with PENDING status. Current status: " + 
                    appointment.getStatus().getDisplayName());
        }

        // Update fields if provided
        if (request.getAppointmentDate() != null) {
            validateAppointmentDate(request.getAppointmentDate());
            validateThirtyMinuteSlot(request.getAppointmentDate(),
                    request.getDurationMinutes() != null ? request.getDurationMinutes() : appointment.getDurationMinutes());
            validateNoConflictingAppointments(appointment.getDoctorId(), request.getAppointmentDate());
            appointment.setAppointmentDate(request.getAppointmentDate());
        }

        if (request.getDurationMinutes() != null) {
            validateThirtyMinuteSlot(appointment.getAppointmentDate(), request.getDurationMinutes());
            appointment.setDurationMinutes(request.getDurationMinutes());
        }

        if (request.getReason() != null) {
            appointment.setReason(request.getReason());
        }

        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes());
        }

        try {
            appointment = appointmentRepository.save(appointment);
        } catch (DataIntegrityViolationException ex) {
            throw new InvalidAppointmentException(
                    "This 30-minute slot is no longer available. Please choose another time.");
        }

        log.info("Appointment updated successfully");

        return appointmentMapper.toResponse(appointment);
    }

    /**
     * Approve an appointment (Admin action after payment completion)
     *
     * @param appointmentId Appointment identifier
     * @return Updated appointment response
     * @throws AppointmentNotFoundException if not found
     * @throws InvalidAppointmentException if appointment cannot be approved
     */
    public AppointmentResponse approveAppointment(Long appointmentId) {
        log.info("Approving appointment with ID: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        if (!appointment.getStatus().equals(AppointmentStatus.PENDING)) {
            throw new InvalidAppointmentException(
                    "Only PENDING appointments can be approved. Current status: " + 
                    appointment.getStatus().getDisplayName());
        }

        if (appointment.getPaymentStatus() != AppointmentPaymentStatus.COMPLETED) {
            throw new InvalidAppointmentException(
                    "Appointment payment must be completed before admin approval. Current payment status: " +
                            appointment.getPaymentStatus());
        }

        appointment.setStatus(AppointmentStatus.APPROVED);
        appointment = appointmentRepository.save(appointment);

        log.info("Appointment approved successfully");

        // Build response (enriched with patient/doctor info from their services)
        AppointmentResponse response = appointmentMapper.toResponse(appointment);

        // Send notification email to patient
        emailNotificationService.sendAppointmentStatusUpdateEmail(response);

        notifyDoctorServiceForAction(appointment, response, "approved");

        return response;
    }

    /**
     * Sync payment status from the payment service.
     */
    public AppointmentResponse updatePaymentStatus(Long appointmentId, PaymentStatusUpdateRequest request) {
        log.info("Updating payment status for appointment ID: {} to {}", appointmentId, request.getPaymentStatus());

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        if (request.getPaymentStatus() == null) {
            throw new InvalidAppointmentException("Payment status is required");
        }

        appointment.setPaymentStatus(request.getPaymentStatus());

        if (request.getPaymentStatus() == AppointmentPaymentStatus.REFUNDED
                && appointment.getStatus() == AppointmentStatus.APPROVED) {
            appointment.setStatus(AppointmentStatus.CANCELLED);
            appointment.setCancelledAt(LocalDateTime.now());
            appointment.setCancelledReason("Appointment payment refunded");
        }

        appointment = appointmentRepository.save(appointment);
        AppointmentResponse response = appointmentMapper.toResponse(appointment);

        if (request.getPaymentStatus() == AppointmentPaymentStatus.COMPLETED
                && appointment.getStatus() == AppointmentStatus.PENDING) {
            // Create/refresh doctor-side request once payment is completed.
            notifyDoctorServiceForAction(appointment, response, "paid");
        }

        return response;
    }

    /**
     * Mark an appointment as completed
     *
     * @param appointmentId Appointment identifier
     * @return Updated appointment response
     * @throws AppointmentNotFoundException if not found
     * @throws InvalidAppointmentException if appointment cannot be completed
     */
    public AppointmentResponse completeAppointment(Long appointmentId) {
        log.info("Completing appointment with ID: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        if (!appointment.getStatus().equals(AppointmentStatus.APPROVED)) {
            throw new InvalidAppointmentException(
                    "Only APPROVED appointments can be marked as completed. Current status: " +
                    appointment.getStatus().getDisplayName());
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment = appointmentRepository.save(appointment);

        log.info("Appointment completed successfully");

        // Send completion notification to patient
        AppointmentResponse response = appointmentMapper.toResponse(appointment);
        emailNotificationService.sendAppointmentStatusUpdateEmail(response);

        return response;
    }

    /**
     * Reject an appointment (Doctor action)
     * 
     * @param appointmentId Appointment identifier
     * @return Updated appointment response
     * @throws AppointmentNotFoundException if not found
     * @throws InvalidAppointmentException if appointment cannot be rejected
     */
    public AppointmentResponse rejectAppointment(Long appointmentId) {
        log.info("Rejecting appointment with ID: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        if (!appointment.getStatus().equals(AppointmentStatus.PENDING)) {
            throw new InvalidAppointmentException(
                    "Only PENDING appointments can be rejected. Current status: " + 
                    appointment.getStatus().getDisplayName());
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        appointment = appointmentRepository.save(appointment);

        log.info("Appointment rejected successfully");

        // Send notification to patient
        AppointmentResponse response = appointmentMapper.toResponse(appointment);
        emailNotificationService.sendAppointmentStatusUpdateEmail(response);

        return response;
    }

    /**
     * Cancel an appointment
     * 
     * @param appointmentId Appointment identifier
     * @param reason Cancellation reason
     * @return Updated appointment response
     * @throws AppointmentNotFoundException if not found
     * @throws InvalidAppointmentException if appointment cannot be cancelled
     */
    public AppointmentResponse cancelAppointment(Long appointmentId, String reason) {
        log.info("Cancelling appointment with ID: {}", appointmentId);

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppointmentNotFoundException(appointmentId));

        if (appointment.getStatus().equals(AppointmentStatus.CANCELLED)) {
            throw new InvalidAppointmentException("Appointment is already cancelled");
        }

        if (appointment.getStatus().equals(AppointmentStatus.COMPLETED)) {
            throw new InvalidAppointmentException("Cannot cancel completed appointments");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancelledAt(LocalDateTime.now());
        appointment.setCancelledReason(reason);
        appointment = appointmentRepository.save(appointment);

        log.info("Appointment cancelled successfully");

        // Send notifications to both patient and doctor
        AppointmentResponse response = appointmentMapper.toResponse(appointment);
        emailNotificationService.sendAppointmentCancellationEmail(response);
        emailNotificationService.sendAppointmentCancellationNotificationToDoctor(response);

        return response;
    }

    /**
     * Get appointments by status
     * 
     * @param status Appointment status filter
     * @return List of appointment responses
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByStatus(AppointmentStatus status) {
        log.info("Fetching appointments with status: {}", status.getDisplayName());

        return appointmentRepository.findByStatus(status)
                .stream()
                .map(appointmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get appointments within a date range
     * 
     * @param startDate Start date
     * @param endDate End date
     * @return List of appointment responses
     */
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByDateRange(LocalDateTime startDate, 
                                                                  LocalDateTime endDate) {
        log.info("Fetching appointments between {} and {}", startDate, endDate);

        return appointmentRepository.findAppointmentsByDateRange(startDate, endDate)
                .stream()
                .map(appointmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ==================== Validation Methods ====================

    /**
     * Validate that patient exists
     */
    private void validatePatientExists(Long patientId) {
        try {
            if (!patientServiceClient.patientExists(patientId)) {
                throw new InvalidAppointmentException("Patient with ID " + patientId + " does not exist");
            }
        } catch (Exception e) {
            log.warn("Unable to validate patient existence: {}", e.getMessage());
            // Continue without validation if service is unavailable
        }
    }

    /**
     * Validate that doctor exists
     */
    private void validateDoctorExists(Long doctorId) {
        try {
            if (!doctorServiceClient.doctorExists(doctorId)) {
                throw new InvalidAppointmentException("Doctor with ID " + doctorId + " does not exist");
            }
        } catch (Exception e) {
            log.warn("Unable to validate doctor existence: {}", e.getMessage());
            // Continue without validation if service is unavailable
        }
    }

    /**
     * Validate that doctor is available
     */
    private void validateDoctorAvailability(Long doctorId) {
        try {
            if (!doctorServiceClient.isAvailable(doctorId)) {
                throw new InvalidAppointmentException("Doctor with ID " + doctorId + " is not available");
            }
        } catch (Exception e) {
            log.warn("Unable to validate doctor availability: {}", e.getMessage());
            // Continue without validation if service is unavailable
        }
    }

    /**
     * Validate appointment date is in the future
     */
    private void validateAppointmentDate(LocalDateTime appointmentDate) {
        if (appointmentDate.isBefore(LocalDateTime.now())) {
            throw new InvalidAppointmentException("Appointment date must be in the future");
        }
    }

    /**
     * Check for scheduling conflicts
     */
    private void validateNoConflictingAppointments(Long doctorId, LocalDateTime appointmentDate) {
        long conflicts = appointmentRepository.countConflictingAppointments(
                doctorId,
                appointmentDate,
                BLOCKING_STATUSES
        );
        if (conflicts > 0) {
            throw new InvalidAppointmentException(
                    "Doctor is not available at the requested time. Please choose another time slot");
        }
    }

    private void validateThirtyMinuteSlot(LocalDateTime appointmentDate, Integer durationMinutes) {
        if (durationMinutes == null || durationMinutes != SLOT_DURATION_MINUTES) {
            throw new InvalidAppointmentException("Appointments must be booked in 30-minute slots");
        }

        if (appointmentDate == null) {
            throw new InvalidAppointmentException("Appointment date is required");
        }

        int minute = appointmentDate.getMinute();
        if (minute != 0 && minute != 30) {
            throw new InvalidAppointmentException("Appointment time must start on the hour or half-hour");
        }

        if (appointmentDate.getSecond() != 0 || appointmentDate.getNano() != 0) {
            throw new InvalidAppointmentException("Appointment time must be selected as an exact 30-minute slot");
        }
    }

    private void notifyDoctorServiceForAction(Appointment appointment, AppointmentResponse response, String reason) {
        try {
            String doctorEmail = (response.getDoctorInfo() != null) ? response.getDoctorInfo().getEmail() : null;
            String patientEmail = (response.getPatientInfo() != null) ? response.getPatientInfo().getEmail() : null;

            if (doctorEmail == null) {
                try {
                    DoctorServiceClient.DoctorDto doc = doctorServiceClient.getDoctor(appointment.getDoctorId());
                    if (doc != null) {
                        doctorEmail = doc.email;
                    }
                } catch (Exception fetchEx) {
                    log.warn("Fallback doctor-email fetch failed: {}", fetchEx.getMessage());
                }
            }
            if (patientEmail == null) {
                try {
                    PatientServiceClient.PatientDto pat = patientServiceClient.getPatient(appointment.getPatientId());
                    if (pat != null) {
                        patientEmail = pat.email;
                    }
                } catch (Exception fetchEx) {
                    log.warn("Fallback patient-email fetch failed: {}", fetchEx.getMessage());
                }
            }

            if (doctorEmail == null || patientEmail == null) {
                log.warn("Could not notify doctor service (reason: {}) for appointment {}: missing doctor/patient email",
                        reason,
                        appointment.getId());
                return;
            }

            String scheduledAt = appointment.getAppointmentDate() != null
                    ? appointment.getAppointmentDate().toString()
                    : null;

            DoctorServiceClient.DoctorAppointmentNotifyRequest notifyRequest =
                    new DoctorServiceClient.DoctorAppointmentNotifyRequest(
                            appointment.getId(),
                            doctorEmail,
                            patientEmail,
                            scheduledAt);

            doctorServiceClient.notifyAppointmentApproved(notifyRequest);
            log.info("Doctor service notified (reason: {}) for appointment ID: {}", reason, appointment.getId());
        } catch (Exception e) {
            log.warn("Could not notify doctor service (reason: {}) for appointment {}: {}",
                    reason,
                    appointment.getId(),
                    e.getMessage());
        }
    }
}