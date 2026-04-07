package com.healthcare.notification.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NotificationDTO {
    private Long id;
    private String recipientEmail;
    private String subject;
    private String content;
    private String type;
    private String status;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
}