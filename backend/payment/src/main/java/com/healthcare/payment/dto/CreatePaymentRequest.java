package com.healthcare.payment.dto;

import lombok.*;
import java.math.BigDecimal;

/**
 * Create Payment Request DTO
 * Used when initiating a payment for an appointment
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {
    private Long appointmentId;
    private Long patientId;
    private Long doctorId;
    private BigDecimal amount;
    private String currency; // LKR or USD
    private String description; // Payment description
    private String returnUrl; // Redirect URL after payment
}

