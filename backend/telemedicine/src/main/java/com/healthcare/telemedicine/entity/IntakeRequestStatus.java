package com.healthcare.telemedicine.entity;

public enum IntakeRequestStatus {
    /** Patient submitted; doctor has not booked a video visit yet. */
    PENDING_REVIEW,
    /** Doctor created the video room and scheduled time for this intake. */
    VISIT_BOOKED,
    DECLINED,
    CANCELLED
}
