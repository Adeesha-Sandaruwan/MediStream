package com.healthcare.patient.repository;

import com.healthcare.patient.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<PatientProfile, Long> {
    Optional<PatientProfile> findByEmail(String email);
}