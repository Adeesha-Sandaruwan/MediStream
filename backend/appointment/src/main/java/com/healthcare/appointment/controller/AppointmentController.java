package com.healthcare.appointment.controller;

import com.healthcare.appointment.dto.AppointmentCreateRequest;
import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.dto.AppointmentUpdateRequest;
import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * REST Controller for appointment management endpoints
 * 
 * Provides endpoints for:
 * - Creating appointments
 * - Retrieving appointment information
 * - Updating appointments
 * - Cancelling appointments
 * - Changing appointment status
 * - Tracking appointment history
 */
@Slf4j
@RestController
@RequestMapping("/appointments")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
@Tag(name = "Appointments", description = "APIs for managing healthcare appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    /**
     * Get all appointments
     * 
     * @return List of all appointments
     */
    @GetMapping
    @Operation(summary = "Get all appointments",
               description = "Retrieves all appointments in the system")
    @ApiResponse(responseCode = "200", description = "Appointments retrieved successfully")
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments() {
        log.info("GET /appointments - Fetching all appointments");
        
        List<AppointmentResponse> appointments = appointmentService.getAllAppointments();
        
        return ResponseEntity.ok(appointments);
    }

    /**
     * Create a new appointment
     * 
     * @param request Appointment creation request
     * @return Created appointment response with 201 status
     */
    @PostMapping
    @Operation(summary = "Create a new appointment",
               description = "Creates a new appointment between a patient and doctor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Appointment created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid appointment data"),
        @ApiResponse(responseCode = "404", description = "Patient or doctor not found")
    })
    public ResponseEntity<AppointmentResponse> createAppointment(
            @Valid @RequestBody AppointmentCreateRequest request) {
        log.info("POST /appointments - Creating appointment");

        AppointmentResponse response = appointmentService.createAppointment(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get appointment by ID
     * 
     * @param appointmentId Appointment identifier
     * @return Appointment details
     */
    @GetMapping("/{appointmentId}")
    @Operation(summary = "Get appointment by ID",
               description = "Retrieves detailed information about a specific appointment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Appointment found"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<AppointmentResponse> getAppointment(
            @Parameter(description = "Appointment ID", required = true)
            @PathVariable Long appointmentId) {
        log.info("GET /{appointmentId} - Fetching appointment", appointmentId);

        AppointmentResponse response = appointmentService.getAppointmentById(appointmentId);

        return ResponseEntity.ok(response);
    }

    /**
     * Get all appointments for a patient
     * 
     * @param patientId Patient identifier
     * @return List of patient's appointments
     */
    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get appointments for a patient",
               description = "Retrieves all appointments for a specific patient")
    @ApiResponse(responseCode = "200", description = "Appointments retrieved successfully")
    public ResponseEntity<List<AppointmentResponse>> getPatientAppointments(
            @Parameter(description = "Patient ID", required = true)
            @PathVariable Long patientId) {
        log.info("GET /appointments/patient/{} - Fetching patient appointments", patientId);

        List<AppointmentResponse> appointments = appointmentService.getPatientAppointments(patientId);

        return ResponseEntity.ok(appointments);
    }

    /**
     * Get all appointments for a doctor
     * 
     * @param doctorId Doctor identifier
     * @return List of doctor's appointments
     */
    @GetMapping("/doctor/{doctorId}")
    @Operation(summary = "Get appointments for a doctor",
               description = "Retrieves all appointments for a specific doctor")
    @ApiResponse(responseCode = "200", description = "Appointments retrieved successfully")
    public ResponseEntity<List<AppointmentResponse>> getDoctorAppointments(
            @Parameter(description = "Doctor ID", required = true)
            @PathVariable Long doctorId) {
        log.info("GET /appointments/doctor/{} - Fetching doctor appointments", doctorId);

        List<AppointmentResponse> appointments = appointmentService.getDoctorAppointments(doctorId);

        return ResponseEntity.ok(appointments);
    }

    /**
     * Get pending appointments for a doctor
     * 
     * @param doctorId Doctor identifier
     * @return List of pending appointments
     */
    @GetMapping("/doctor/{doctorId}/pending")
    @Operation(summary = "Get pending appointments for a doctor",
               description = "Retrieves all pending appointments awaiting doctor approval")
    @ApiResponse(responseCode = "200", description = "Pending appointments retrieved successfully")
    public ResponseEntity<List<AppointmentResponse>> getPendingAppointments(
            @Parameter(description = "Doctor ID", required = true)
            @PathVariable Long doctorId) {
        log.info("GET /appointments/doctor/{}/pending - Fetching pending appointments", doctorId);

        List<AppointmentResponse> appointments = appointmentService.getPendingAppointments(doctorId);

        return ResponseEntity.ok(appointments);
    }

    /**
     * Update an appointment
     * 
     * @param appointmentId Appointment identifier
     * @param request Update request
     * @return Updated appointment
     */
    @PutMapping("/{appointmentId}")
    @Operation(summary = "Update an appointment",
               description = "Updates details of a pending appointment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Appointment updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid update data"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<AppointmentResponse> updateAppointment(
            @Parameter(description = "Appointment ID", required = true)
            @PathVariable Long appointmentId,
            @Valid @RequestBody AppointmentUpdateRequest request) {
        log.info("PUT /{appointmentId} - Updating appointment", appointmentId);

        AppointmentResponse response = appointmentService.updateAppointment(appointmentId, request);

        return ResponseEntity.ok(response);
    }

    /**
     * Approve an appointment (Doctor action)
     * 
     * @param appointmentId Appointment identifier
     * @return Updated appointment
     */
    @PatchMapping("/{appointmentId}/approve")
    @Operation(summary = "Approve an appointment",
               description = "Doctor approves a pending appointment request")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Appointment approved successfully"),
        @ApiResponse(responseCode = "400", description = "Cannot approve appointment in current status"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<AppointmentResponse> approveAppointment(
            @Parameter(description = "Appointment ID", required = true)
            @PathVariable Long appointmentId) {
        log.info("PATCH /appointments/{}/approve - Approving appointment", appointmentId);

        AppointmentResponse response = appointmentService.approveAppointment(appointmentId);

        return ResponseEntity.ok(response);
    }

    /**
     * Reject an appointment (Doctor action)
     * 
     * @param appointmentId Appointment identifier
     * @return Updated appointment
     */
    @PatchMapping("/{appointmentId}/reject")
    @Operation(summary = "Reject an appointment",
               description = "Doctor rejects a pending appointment request")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Appointment rejected successfully"),
        @ApiResponse(responseCode = "400", description = "Cannot reject appointment in current status"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<AppointmentResponse> rejectAppointment(
            @Parameter(description = "Appointment ID", required = true)
            @PathVariable Long appointmentId) {
        log.info("PATCH /appointments/{}/reject - Rejecting appointment", appointmentId);

        AppointmentResponse response = appointmentService.rejectAppointment(appointmentId);

        return ResponseEntity.ok(response);
    }

    /**
     * Cancel an appointment
     * 
     * @param appointmentId Appointment identifier
     * @param reason Cancellation reason
     * @return Updated appointment
     */
    @DeleteMapping("/{appointmentId}/cancel")
    @Operation(summary = "Cancel an appointment",
               description = "Cancels a pending or approved appointment with optional reason")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Appointment cancelled successfully"),
        @ApiResponse(responseCode = "400", description = "Cannot cancel appointment in current status"),
        @ApiResponse(responseCode = "404", description = "Appointment not found")
    })
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            @Parameter(description = "Appointment ID", required = true)
            @PathVariable Long appointmentId,
            @Parameter(description = "Reason for cancellation (optional)")
            @RequestParam(required = false) String reason) {
        log.info("DELETE /appointments/{}/cancel - Cancelling appointment", appointmentId);

        AppointmentResponse response = appointmentService.cancelAppointment(appointmentId, reason);

        return ResponseEntity.ok(response);
    }

    /**
     * Get appointments by status
     * 
     * @param status Appointment status filter
     * @return List of appointments with specified status
     */
    @GetMapping("/status/{status}")
    @Operation(summary = "Get appointments by status",
               description = "Retrieves all appointments with a specific status")
    @ApiResponse(responseCode = "200", description = "Appointments retrieved successfully")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByStatus(
            @Parameter(description = "Appointment status (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED)")
            @PathVariable AppointmentStatus status) {
        log.info("GET /appointments/status/{} - Fetching appointments by status", status);

        List<AppointmentResponse> appointments = appointmentService.getAppointmentsByStatus(status);

        return ResponseEntity.ok(appointments);
    }

    /**
     * Get appointments within a date range
     * 
     * @param startDate Start date and time
     * @param endDate End date and time
     * @return List of appointments in date range
     */
    @GetMapping("/date-range")
    @Operation(summary = "Get appointments by date range",
               description = "Retrieves all appointments within a specific date range")
    @ApiResponse(responseCode = "200", description = "Appointments retrieved successfully")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByDateRange(
            @Parameter(description = "Start date and time", example = "2024-01-01T08:00:00")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "End date and time", example = "2024-01-31T23:59:59")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        log.info("GET /appointments/date-range - Fetching appointments from {} to {}", 
                startDate, endDate);

        List<AppointmentResponse> appointments = appointmentService
                .getAppointmentsByDateRange(startDate, endDate);

        return ResponseEntity.ok(appointments);
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    @Operation(summary = "Health check",
               description = "Verifies if the appointment service is running")
    @ApiResponse(responseCode = "200", description = "Service is healthy")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Appointment Service is running");
    }
}