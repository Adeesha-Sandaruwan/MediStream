package com.healthcare.doctor.repository;

import com.healthcare.doctor.entity.DoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByEmail(String email);
    List<DoctorProfile> findBySpecialtyIgnoreCase(String specialty);
}
