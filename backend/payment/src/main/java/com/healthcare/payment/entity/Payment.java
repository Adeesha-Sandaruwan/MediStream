package com.healthcare.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payment Entity - Represents a payment transaction in the healthcare system
 * 
 * This entity stores all payment-related information including:
 * - Appointment and Patient links
 * - Payment amount and currency
 * - Payment gateway transaction details
 * - Payment status and timestamps
 */
@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false)
    private String currency; // LKR or USD

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatus paymentStatus; // PENDING, COMPLETED, FAILED, REFUNDED

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod; // STRIPE, PAYTHERE, DIALOG_GENIE, PAYPAL

    @Column(name = "stripe_payment_intent_id")
    private String stripePaymentIntentId; // Stripe Payment Intent ID for reference

    @Column(name = "stripe_client_secret")
    private String stripeClientSecret; // Used for frontend Stripe integration

    @Column(name = "transaction_reference")
    private String transactionReference; // External payment gateway transaction reference

    @Column(name = "payment_method_last_four")
    private String paymentMethodLastFour; // Last 4 digits of card/account

    @Column(name = "payment_method_type")
    private String paymentMethodType; // card, bank_account, wallet, etc.

    @Column(name = "description")
    private String description; // Payment description for records

    @Column(name = "failure_reason", length = 500)
    private String failureReason; // Reason for payment failure

    @Column(name = "receipt_url")
    private String receiptUrl; // Payment receipt URL

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt; // When payment was successfully completed

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt; // When payment was refunded

    @Column(name = "notes", length = 1000)
    private String notes; // Internal notes about the payment

    /**
     * Lifecycle method to set created_at before persistence
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.paymentStatus == null) {
            this.paymentStatus = PaymentStatus.PENDING;
        }
        if (this.currency == null) {
            this.currency = "LKR"; // Default to LKR for Sri Lanka
        }
    }

    /**
     * Lifecycle method to update updated_at before update
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

