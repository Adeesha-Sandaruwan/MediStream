package com.healthcare.notification.service;

import com.healthcare.notification.dto.NotificationDTO;
import com.healthcare.notification.model.Notification;
import com.healthcare.notification.model.NotificationRequest;
import com.healthcare.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    
    @Transactional
    public NotificationDTO sendNotification(NotificationRequest request) {
        log.info("Sending notification to: {}", request.getRecipientEmail());
        
        // Create notification entity
        Notification notification = new Notification();
        notification.setRecipientEmail(request.getRecipientEmail());
        notification.setSubject(request.getSubject());
        notification.setContent(request.getContent());
        notification.setType(request.getType());
        
        // Save to database first
        Notification savedNotification = notificationRepository.save(notification);
        
        // Send email
        boolean emailSent = emailService.sendEmail(notification);
        
        // Update status
        if (emailSent) {
            savedNotification.setStatus("SENT");
            savedNotification.setSentAt(LocalDateTime.now());
        } else {
            savedNotification.setStatus("FAILED");
            savedNotification.setErrorMessage("Email delivery failed");
        }
        
        Notification updatedNotification = notificationRepository.save(savedNotification);
        
        return convertToDTO(updatedNotification);
    }
    
    public List<NotificationDTO> getAllNotifications() {
        return notificationRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public NotificationDTO getNotificationById(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));
        return convertToDTO(notification);
    }
    
    public List<NotificationDTO> getNotificationsByEmail(String email) {
        return notificationRepository.findByRecipientEmail(email)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<NotificationDTO> getNotificationsByStatus(String status) {
        return notificationRepository.findByStatus(status)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void retryFailedNotification(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if ("FAILED".equals(notification.getStatus())) {
            boolean emailSent = emailService.sendEmail(notification);
            
            if (emailSent) {
                notification.setStatus("SENT");
                notification.setSentAt(LocalDateTime.now());
                notification.setErrorMessage(null);
                notificationRepository.save(notification);
                log.info("Retry successful for notification: {}", id);
            } else {
                log.error("Retry failed for notification: {}", id);
            }
        }
    }
    
    @Transactional
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
        log.info("Deleted notification with id: {}", id);
    }
    
    public long getNotificationCount() {
        return notificationRepository.count();
    }
    
    public long getFailedCount() {
        return notificationRepository.countByStatus("FAILED");
    }
    
    private NotificationDTO convertToDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setRecipientEmail(notification.getRecipientEmail());
        dto.setSubject(notification.getSubject());
        dto.setContent(notification.getContent());
        dto.setType(notification.getType().toString());
        dto.setStatus(notification.getStatus());
        dto.setSentAt(notification.getSentAt());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }
}