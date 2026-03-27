package com.healthcare.patient.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patient_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The unique link back to the Auth Service
    @Column(unique = true, nullable = false)
    private String email;

    // Basic Demographics
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String dateOfBirth;
    private String gender;
    private String address;
    
    // Medical Overview
    private String bloodGroup;
    private String emergencyContact;
    
    // Using TEXT definition for longer medical descriptions
    @Column(columnDefinition = "TEXT")
    private String allergies;
    
    @Column(columnDefinition = "TEXT")
    private String currentMedications;
}