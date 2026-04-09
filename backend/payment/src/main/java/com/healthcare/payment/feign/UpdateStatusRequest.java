package com.healthcare.payment.feign;

import lombok.*;

/**
 * Request DTO for appointment payment-status sync.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStatusRequest {
    private String paymentStatus; // PENDING | COMPLETED | FAILED | REFUNDED
    private String notes;
}
