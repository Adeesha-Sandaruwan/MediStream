package com.healthcare.payment.controller;

import com.healthcare.payment.dto.CreatePaymentRequest;
import com.healthcare.payment.dto.PaymentResponse;
import com.healthcare.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Payment Controller
 * Handles all payment-related HTTP requests
 */
@RestController
@RequestMapping("/api/v1/payments")
@Slf4j
@Tag(name = "Payment Management", description = "Payment processing and management APIs")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    /**
     * Initiate a payment for an appointment
     * This endpoint creates a Stripe Payment Intent and returns client secret for frontend
     *
     * @param request CreatePaymentRequest with appointment and payment details
     * @return PaymentResponse with Stripe client secret
     */
    @PostMapping("/initiate")
    @Operation(summary = "Initiate Payment",
              description = "Create a new payment and get Stripe Payment Intent client secret")
    public ResponseEntity<PaymentResponse> initiatePayment(@RequestBody CreatePaymentRequest request) {
        try {
            log.info("Payment initiation request received for appointment: {}", request.getAppointmentId());
            PaymentResponse response = paymentService.initiatePayment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error initiating payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initiate payment: " + e.getMessage());
        }
    }

    /**
     * Get payment by payment ID
     *
     * @param paymentId Payment ID
     * @return PaymentResponse
     */
    @GetMapping("/{paymentId}")
    @Operation(summary = "Get Payment", description = "Retrieve payment details by payment ID")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable Long paymentId) {
        try {
            log.info("Fetching payment details for payment ID: {}", paymentId);
            PaymentResponse response = paymentService.getPaymentById(paymentId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching payment: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get payment by appointment ID
     *
     * @param appointmentId Appointment ID
     * @return PaymentResponse
     */
    @GetMapping("/appointment/{appointmentId}")
    @Operation(summary = "Get Payment by Appointment",
              description = "Retrieve payment details by appointment ID")
    public ResponseEntity<PaymentResponse> getPaymentByAppointment(@PathVariable Long appointmentId) {
        try {
            log.info("Fetching payment for appointment ID: {}", appointmentId);
            PaymentResponse response = paymentService.getPaymentByAppointmentId(appointmentId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching payment for appointment: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all payments for a patient
     *
     * @param patientId Patient ID
     * @return List of PaymentResponse
     */
    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get Patient Payments",
              description = "Retrieve all payments for a specific patient")
    public ResponseEntity<List<PaymentResponse>> getPatientPayments(@PathVariable Long patientId) {
        try {
            log.info("Fetching all payments for patient ID: {}", patientId);
            List<PaymentResponse> payments = paymentService.getPaymentsByPatient(patientId);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            log.error("Error fetching patient payments: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Complete payment (called by Stripe webhook or frontend after success)
     *
     * @param stripePaymentIntentId Stripe Payment Intent ID
     * @param paymentMethodLastFour Last 4 digits of card
     * @param paymentMethodType Type of payment method
     * @return PaymentResponse with completed status
     */
    @PostMapping("/{stripePaymentIntentId}/complete")
    @Operation(summary = "Complete Payment",
              description = "Mark payment as completed and update appointment status")
    public ResponseEntity<PaymentResponse> completePayment(
            @PathVariable String stripePaymentIntentId,
            @RequestParam String paymentMethodLastFour,
            @RequestParam String paymentMethodType) {
        try {
            log.info("Completing payment for Stripe Intent: {}", stripePaymentIntentId);
            PaymentResponse response = paymentService.completePayment(
                    stripePaymentIntentId,
                    paymentMethodLastFour,
                    paymentMethodType
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error completing payment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    /**
     * Mark payment as failed
     *
     * @param stripePaymentIntentId Stripe Payment Intent ID
     * @param failureReason Reason for failure
     * @return PaymentResponse with failed status
     */
    @PostMapping("/{stripePaymentIntentId}/fail")
    @Operation(summary = "Fail Payment",
              description = "Mark payment as failed with reason")
    public ResponseEntity<PaymentResponse> failPayment(
            @PathVariable String stripePaymentIntentId,
            @RequestParam String failureReason) {
        try {
            log.info("Failing payment for Stripe Intent: {}", stripePaymentIntentId);
            PaymentResponse response = paymentService.failPayment(
                    stripePaymentIntentId,
                    failureReason
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error failing payment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Refund a payment
     *
     * @param paymentId Payment ID to refund
     * @return PaymentResponse with refunded status
     */
    @PostMapping("/{paymentId}/refund")
    @Operation(summary = "Refund Payment",
              description = "Refund a completed payment")
    public ResponseEntity<PaymentResponse> refundPayment(@PathVariable Long paymentId) {
        try {
            log.info("Refunding payment ID: {}", paymentId);
            PaymentResponse response = paymentService.refundPayment(paymentId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error refunding payment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Payment Service");
        return ResponseEntity.ok(response);
    }
}

