package com.healthcare.telemedicine.repository;

import com.healthcare.telemedicine.entity.ConsultationStatus;
import com.healthcare.telemedicine.entity.TelemedicineConsultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            select (count(c) > 0)
            from TelemedicineConsultation c
            where lower(c.doctorEmail) = lower(:doctorEmail)
              and c.status in :statuses
              and c.scheduledStartAt is not null
              and c.scheduledEndAt is not null
              and c.scheduledStartAt < :candidateEnd
              and c.scheduledEndAt > :candidateStart
            """)
    boolean existsDoctorScheduleOverlap(
            @Param("doctorEmail") String doctorEmail,
            @Param("statuses") Collection<ConsultationStatus> statuses,
            @Param("candidateStart") Instant candidateStart,
            @Param("candidateEnd") Instant candidateEnd
    );

    @Query("""
            select (count(c) > 0)
            from TelemedicineConsultation c
            where lower(c.patientEmail) = lower(:patientEmail)
              and c.status in :statuses
              and c.scheduledStartAt is not null
              and c.scheduledEndAt is not null
              and c.scheduledStartAt < :candidateEnd
              and c.scheduledEndAt > :candidateStart
            """)
    boolean existsPatientScheduleOverlap(
            @Param("patientEmail") String patientEmail,
            @Param("statuses") Collection<ConsultationStatus> statuses,
            @Param("candidateStart") Instant candidateStart,
            @Param("candidateEnd") Instant candidateEnd
    );
}
