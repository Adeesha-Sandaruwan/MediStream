package com.healthcare.notification.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NotificationRequest {
    
    @NotBlank(message = "Recipient email is required")
    @Email(message = "Invalid email format")
    private String recipientEmail;
    
    @NotBlank(message = "Subject is required")
    private String subject;
    
    @NotBlank(message = "Content is required")
    private String content;
    
    private NotificationType type = NotificationType.EMAIL;
    
    private boolean sendNow = true;
}