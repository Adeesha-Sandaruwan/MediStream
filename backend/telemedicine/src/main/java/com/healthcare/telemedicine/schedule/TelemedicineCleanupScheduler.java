package com.healthcare.telemedicine.schedule;

import com.healthcare.telemedicine.entity.ConsultationStatus;
import com.healthcare.telemedicine.entity.TelemedicineConsultation;
import com.healthcare.telemedicine.repository.TelemedicineConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class TelemedicineCleanupScheduler {

    private final TelemedicineConsultationRepository repository;

    @Value("${telemedicine.cleanup.createdTimeoutMinutes:60}")
    private long createdTimeoutMinutes;

    @Value("${telemedicine.cleanup.endedRetentionDays:30}")
    private long endedRetentionDays;

    @Scheduled(fixedDelayString = "${telemedicine.cleanup.fixedDelayMs:5000}")
    @Transactional
    public void runCleanup() {
        Instant createdCutoff = Instant.now().minus(createdTimeoutMinutes, ChronoUnit.MINUTES);
        List<TelemedicineConsultation> abandoned = repository.findByStatusAndCreatedAtBefore(
                ConsultationStatus.CREATED,
                createdCutoff
        );
        Instant now = Instant.now();
        for (TelemedicineConsultation c : abandoned) {
            c.setStatus(ConsultationStatus.CANCELLED);
            c.setEndedAt(now);
        }
        repository.saveAll(abandoned);

        List<TelemedicineConsultation> expiredScheduled = repository.findByStatusAndScheduledEndAtBefore(
                ConsultationStatus.SCHEDULED,
                now
        );
        for (TelemedicineConsultation c : expiredScheduled) {
            c.setStatus(ConsultationStatus.CANCELLED);
            c.setEndedAt(now);
        }
        repository.saveAll(expiredScheduled);

        Instant endedCutoff = Instant.now().minus(endedRetentionDays, ChronoUnit.DAYS);
        List<TelemedicineConsultation> oldEnded = repository.findByStatusAndEndedAtBefore(
                ConsultationStatus.ENDED,
                endedCutoff
        );
        repository.deleteAll(oldEnded);
    }
}
