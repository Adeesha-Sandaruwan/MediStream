package com.healthcare.telemedicine.entity;

public enum ConsultationStatus {
    /** Legacy: patient-initiated, doctor had to start first. */
    CREATED,
    /** Doctor scheduled; meeting link exists; start only inside [scheduledStart, scheduledEnd]. */
    SCHEDULED,
    LIVE,
    ENDED,
    CANCELLED
}
