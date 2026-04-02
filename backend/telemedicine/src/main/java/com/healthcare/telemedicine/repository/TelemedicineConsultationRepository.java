package com.healthcare.telemedicine.repository;

import com.healthcare.telemedicine.entity.ConsultationStatus;
import com.healthcare.telemedicine.entity.TelemedicineConsultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TelemedicineConsultationRepository extends JpaRepository<TelemedicineConsultation, Long> {

    Optional<TelemedicineConsultation> findByPublicRoomId(String publicRoomId);

    Optional<TelemedicineConsultation> findByIntakeRequestId(Long intakeRequestId);

    long countByInvitedDoctorEmailIgnoreCaseAndStatus(String invitedDoctorEmail, ConsultationStatus status);

    List<TelemedicineConsultation> findByInvitedDoctorEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
            String invitedDoctorEmail,
            ConsultationStatus status
    );

    long countByPatientEmailIgnoreCaseAndStatus(String patientEmail, ConsultationStatus status);

    List<TelemedicineConsultation> findByPatientEmailIgnoreCaseAndStatusOrderByScheduledStartAtAsc(
            String patientEmail,
            ConsultationStatus status
    );

    List<TelemedicineConsultation> findByDoctorEmailIgnoreCaseAndStatusInOrderByScheduledStartAtDesc(
            String doctorEmail,
            Collection<ConsultationStatus> statuses
    );

    List<TelemedicineConsultation> findByStatusAndScheduledEndAtBefore(ConsultationStatus status, Instant before);

    List<TelemedicineConsultation> findByStatusAndCreatedAtBefore(ConsultationStatus status, Instant before);

    List<TelemedicineConsultation> findByStatusAndEndedAtBefore(ConsultationStatus status, Instant before);
}
