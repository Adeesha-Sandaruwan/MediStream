package com.healthcare.appointment.service;

import com.healthcare.appointment.dto.AppointmentCreateRequest;
import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.feign.DoctorServiceClient;
import com.healthcare.appointment.feign.PatientServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Mapper component for converting between Appointment entity and DTOs
 * Also enriches appointment data with patient and doctor information
 */
@Component
@RequiredArgsConstructor
public class AppointmentMapper {

    private final PatientServiceClient patientServiceClient;
    private final DoctorServiceClient doctorServiceClient;

    /**
     * Convert AppointmentCreateRequest to Appointment entity
     */
    public Appointment toEntity(AppointmentCreateRequest request) {
        return Appointment.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .appointmentDate(request.getAppointmentDate())
                .durationMinutes(request.getDurationMinutes())
                .reason(request.getReason())
                .notes(request.getNotes())
                .build();
    }

    /**
     * Convert Appointment entity to AppointmentResponse DTO
     * Fetches additional information about patient and doctor
     */
    public AppointmentResponse toResponse(Appointment appointment) {
        // Default null info
        AppointmentResponse.PatientInfo patientInfo = null;
        AppointmentResponse.DoctorInfo doctorInfo = null;

        try {
            // Fetch patient information
            PatientServiceClient.PatientDto patient = patientServiceClient.getPatient(appointment.getPatientId());
            if (patient != null) {
                patientInfo = AppointmentResponse.PatientInfo.builder()
                        .id(patient.id)           // Access field directly
                        .name(patient.name)
                        .email(patient.email)
                        .phoneNumber(patient.phoneNumber)
                        .build();
            }

            // Fetch doctor information
            DoctorServiceClient.DoctorDto doctor = doctorServiceClient.getDoctor(appointment.getDoctorId());
            if (doctor != null) {
                doctorInfo = AppointmentResponse.DoctorInfo.builder()
                        .id(doctor.id)           // Access field directly
                        .name(doctor.name)
                        .email(doctor.email)
                        .specialization(doctor.specialization)
                        .phoneNumber(doctor.phoneNumber)
                        .build();
            }

        } catch (Exception e) {
            // If Feign service fails, return appointment without details
        }

        // Build final response
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .patientId(appointment.getPatientId())
                .patientInfo(patientInfo)
                .doctorId(appointment.getDoctorId())
                .doctorInfo(doctorInfo)
                .appointmentDate(appointment.getAppointmentDate())
                .durationMinutes(appointment.getDurationMinutes())
                .reason(appointment.getReason())
                .notes(appointment.getNotes())
                .status(appointment.getStatus())
                .paymentStatus(appointment.getPaymentStatus())
                .createdAt(appointment.getCreatedAt())
                .updatedAt(appointment.getUpdatedAt())
                .cancelledAt(appointment.getCancelledAt())
                .cancelledReason(appointment.getCancelledReason())
                .build();
    }
}