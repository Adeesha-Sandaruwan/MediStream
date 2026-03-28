package com.healthcare.patient.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_reports")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MedicalReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String patientEmail;
    private String originalFileName;
    private String storedFileName;
    private String fileType;
    private String fileUrl;
    private LocalDateTime uploadDate;
}