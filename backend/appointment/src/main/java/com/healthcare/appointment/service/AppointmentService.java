package com.healthcare.appointment.service;

import com.healthcare.appointment.dto.AppointmentCreateRequest;
import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.dto.AppointmentUpdateRequest;
import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.exception.AppointmentNotFoundException;
import com.healthcare.appointment.exception.InvalidAppointmentException;
import com.healthcare.appointment.feign.DoctorServiceClient;
import com.healthcare.appointment.feign.PatientServiceClient;
import com.healthcare.appointment.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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

        // Check for scheduling conflicts
        validateNoConflictingAppointments(request.getDoctorId(), request.getAppointmentDate());

        // Create appointment
        Appointment appointment = appointmentMapper.toEntity(request);
        appointment = appointmentRepository.save(appointment);

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
            validateNoConflictingAppointments(appointment.getDoctorId(), request.getAppointmentDate());
            appointment.setAppointmentDate(request.getAppointmentDate());
        }

        if (request.getDurationMinutes() != null) {
            appointment.setDurationMinutes(request.getDurationMinutes());
        }

        if (request.getReason() != null) {
            appointment.setReason(request.getReason());
        }

        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes());
        }

        appointment = appointmentRepository.save(appointment);

        log.info("Appointment updated successfully");

        return appointmentMapper.toResponse(appointment);
    }

    /**
     * Approve an appointment (Doctor action)
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

        appointment.setStatus(AppointmentStatus.APPROVED);
        appointment = appointmentRepository.save(appointment);

        log.info("Appointment approved successfully");

        // Send notification to patient
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
        long conflicts = appointmentRepository.countConflictingAppointments(doctorId, appointmentDate);
        if (conflicts > 0) {
            throw new InvalidAppointmentException(
                    "Doctor is not available at the requested time. Please choose another time slot");
        }
    }
}