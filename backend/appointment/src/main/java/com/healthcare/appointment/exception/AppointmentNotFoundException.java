package com.healthcare.appointment.exception;

/**
 * Custom exception thrown when an appointment cannot be found in the database
 */
public class AppointmentNotFoundException extends RuntimeException {

    public AppointmentNotFoundException(Long appointmentId) {
        super("Appointment with ID " + appointmentId + " not found");
    }

    public AppointmentNotFoundException(String message) {
        super(message);
    }

    public AppointmentNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}