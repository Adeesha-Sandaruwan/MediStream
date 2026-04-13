package com.healthcare.doctor.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

// Centralized exception handler for all controllers in the doctor service.
// @RestControllerAdvice applies to all @RestController classes, intercepting unhandled exceptions
// and turning them into structured JSON error responses instead of Spring's default HTML error page.
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Catches any RuntimeException propagated out of a controller method.
    // Business-logic failures (e.g., "Appointment not found", ownership checks) throw RuntimeException
    // deliberately, so they are all returned as HTTP 400 Bad Request with the error message.
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        // Use the exception message if present; fall back to a descriptive default so the
        // client always receives a human-readable error body and not a null/empty response.
        String message = ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : "Unexpected error while processing doctor appointment decision";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", message));
    }
}

