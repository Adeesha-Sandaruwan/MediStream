package com.healthcare.payment.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.healthcare.payment.entity.PaymentStatus;
import com.healthcare.payment.entity.PaymentMethod;

/**
 * Payment Response DTO
 * Returned when a payment is created or retrieved
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {
    private Long id;
    private Long appointmentId;
    private Long patientId;
    private Long doctorId;
    private BigDecimal amount;
    private String currency;
    private PaymentStatus paymentStatus;
    private PaymentMethod paymentMethod;
    private String stripePaymentIntentId;
    private String stripeClientSecret; // For Stripe.js frontend
    private String transactionReference;
    private String paymentMethodLastFour;
    private String paymentMethodType;
    private String description;
    private String failureReason;
    private String receiptUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
    private String notes;
}

