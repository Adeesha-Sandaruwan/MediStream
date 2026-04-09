package com.healthcare.payment.dto;

import lombok.*;

/**
 * Stripe Webhook Event DTO
 * Handles Stripe webhook payloads for payment status updates
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StripeWebhookEvent {
    private String id;
    private String type;
    private String data;
}

