package com.healthcare.notification.repository;

import com.healthcare.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientEmail(String email);
    List<Notification> findByStatus(String status);
    List<Notification> findBySentAtBetween(LocalDateTime start, LocalDateTime end);
    long countByStatus(String status);
}