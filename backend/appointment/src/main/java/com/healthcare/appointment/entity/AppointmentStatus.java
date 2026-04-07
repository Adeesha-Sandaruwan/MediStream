package com.healthcare.appointment.entity;

/**
 * Enumeration representing the possible states of an appointment
 * 
 * States:
 * - PENDING: Initial state when appointment is created, awaiting confirmation
 * - APPROVED: Appointment has been confirmed by the doctor
 * - REJECTED: Appointment has been rejected by the doctor
 * - COMPLETED: Appointment has been completed
 * - CANCELLED: Appointment has been cancelled by patient or doctor
 */
public enum AppointmentStatus {
    PENDING("Pending"),
    APPROVED("Approved"),
    REJECTED("Rejected"),
    COMPLETED("Completed"),
    CANCELLED("Cancelled");

    private final String displayName;

    AppointmentStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}