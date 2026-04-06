package com.healthcare.notification.controller;

import com.healthcare.notification.dto.NotificationDTO;
import com.healthcare.notification.model.NotificationRequest;
import com.healthcare.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {
    
    private final NotificationService notificationService;
    
    // Send a new notification
    @PostMapping("/send")
    public ResponseEntity<NotificationDTO> sendNotification(@Valid @RequestBody NotificationRequest request) {
        NotificationDTO response = notificationService.sendNotification(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
    
    // Get all notifications
    @GetMapping
    public ResponseEntity<List<NotificationDTO>> getAllNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }
    
    // Get notification by ID
    @GetMapping("/{id}")
    public ResponseEntity<NotificationDTO> getNotificationById(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.getNotificationById(id));
    }
    
    // Get notifications by email
    @GetMapping("/email/{email}")
    public ResponseEntity<List<NotificationDTO>> getNotificationsByEmail(@PathVariable String email) {
        return ResponseEntity.ok(notificationService.getNotificationsByEmail(email));
    }
    
    // Get notifications by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<NotificationDTO>> getNotificationsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(notificationService.getNotificationsByStatus(status));
    }
    
    // Retry failed notification
    @PostMapping("/{id}/retry")
    public ResponseEntity<Map<String, String>> retryNotification(@PathVariable Long id) {
        notificationService.retryFailedNotification(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Retry initiated for notification: " + id);
        return ResponseEntity.ok(response);
    }
    
    // Delete notification
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Notification deleted successfully");
        return ResponseEntity.ok(response);
    }
    
    // Get statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStatistics() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", notificationService.getNotificationCount());
        stats.put("failed", notificationService.getFailedCount());
        return ResponseEntity.ok(stats);
    }
    
    // Health check
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "notification-service");
        return ResponseEntity.ok(health);
    }
}