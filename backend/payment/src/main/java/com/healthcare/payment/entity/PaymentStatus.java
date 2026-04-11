package com.healthcare.payment.entity;

/**
 * Payment Status Enum - Represents the status of a payment
 */
public enum PaymentStatus {
    PENDING,      // Payment initiated but not yet processed
    COMPLETED,    // Payment successfully completed
    FAILED,       // Payment failed
    REFUNDED,     // Payment refunded to customer
    CANCELLED     // Payment cancelled by user/admin
}

