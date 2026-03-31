package com.healthcare.appointment.exception;

/**
 * Custom exception thrown when an invalid operation is attempted on an appointment
 * Examples: cancelling an already cancelled appointment, approving a rejected appointment
 */
public class InvalidAppointmentException extends RuntimeException {

    public InvalidAppointmentException(String message) {
        super(message);
    }

    public InvalidAppointmentException(String message, Throwable cause) {
        super(message, cause);
    }
}