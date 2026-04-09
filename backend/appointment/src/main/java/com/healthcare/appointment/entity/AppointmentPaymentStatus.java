package com.healthcare.appointment.entity;

/**
 * Payment status for an appointment.
 * Keeps payment progress separate from clinical appointment workflow status.
 */
public enum AppointmentPaymentStatus {
    PENDING,
    COMPLETED,
    FAILED,
    REFUNDED
}

