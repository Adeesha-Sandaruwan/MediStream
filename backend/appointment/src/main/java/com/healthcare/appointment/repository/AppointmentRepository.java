package com.healthcare.appointment.repository;

import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * JPA Repository for Appointment entity
 * Provides database access and custom query methods for appointments
 */
@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    /**
     * Find all appointments for a specific patient
     */
    List<Appointment> findByPatientId(Long patientId);

    /**
     * Find all appointments for a specific doctor
     */
    List<Appointment> findByDoctorId(Long doctorId);

    /**
     * Find appointments by patient and doctor
     */
    List<Appointment> findByPatientIdAndDoctorId(Long patientId, Long doctorId);

    /**
     * Find appointments by status
     */
    List<Appointment> findByStatus(AppointmentStatus status);

    /**
     * Find appointments for a specific patient with given status
     */
    List<Appointment> findByPatientIdAndStatus(Long patientId, AppointmentStatus status);

    /**
     * Find appointments for a specific doctor with given status
     */
    List<Appointment> findByDoctorIdAndStatus(Long doctorId, AppointmentStatus status);

    /**
     * Find appointments within a date range
     */
    @Query("SELECT a FROM Appointment a WHERE a.appointmentDate BETWEEN :startDate AND :endDate")
    List<Appointment> findAppointmentsByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Find appointments for a doctor within a date range
     */
    @Query("SELECT a FROM Appointment a WHERE a.doctorId = :doctorId " +
           "AND a.appointmentDate BETWEEN :startDate AND :endDate")
    List<Appointment> findDoctorAppointmentsByDateRange(
            @Param("doctorId") Long doctorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Find appointments for a patient within a date range
     */
    @Query("SELECT a FROM Appointment a WHERE a.patientId = :patientId " +
           "AND a.appointmentDate BETWEEN :startDate AND :endDate")
    List<Appointment> findPatientAppointmentsByDateRange(
            @Param("patientId") Long patientId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Check if there's a conflict with existing appointments
     */
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctorId = :doctorId " +
           "AND a.appointmentDate = :appointmentDate AND a.status IN :blockingStatuses")
    long countConflictingAppointments(
            @Param("doctorId") Long doctorId,
            @Param("appointmentDate") LocalDateTime appointmentDate,
            @Param("blockingStatuses") Collection<AppointmentStatus> blockingStatuses);

    /**
     * Find pending appointments for a doctor
     */
    List<Appointment> findByDoctorIdAndStatusOrderByAppointmentDateAsc(
            Long doctorId, AppointmentStatus status);
}