package com.healthcare.doctor.repository;

import com.healthcare.doctor.entity.DoctorAppointmentRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorAppointmentRequestRepository extends JpaRepository<DoctorAppointmentRequest, Long> {
    List<DoctorAppointmentRequest> findByDoctorEmailOrderByUpdatedAtDesc(String doctorEmail);
    Optional<DoctorAppointmentRequest> findByAppointmentId(Long appointmentId);
}
