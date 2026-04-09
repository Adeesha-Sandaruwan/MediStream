package com.healthcare.payment.service;

import com.healthcare.payment.dto.CreatePaymentRequest;
import com.healthcare.payment.dto.PaymentResponse;
import com.healthcare.payment.entity.Payment;
import com.healthcare.payment.entity.PaymentMethod;
import com.healthcare.payment.entity.PaymentStatus;
import com.healthcare.payment.feign.AppointmentServiceClient;
import com.healthcare.payment.feign.UpdateStatusRequest;
import com.healthcare.payment.repository.PaymentRepository;
import com.stripe.model.PaymentIntent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Payment Service
 * Handles all payment-related business logic
 */
@Service
@Slf4j
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private StripePaymentService stripePaymentService;

    @Autowired(required = false)
    private AppointmentServiceClient appointmentServiceClient;

    /**
     * Initiate a payment for an appointment
     * Creates a Stripe Payment Intent and saves payment record
     *
     * @param request CreatePaymentRequest containing appointment and payment details
     * @return PaymentResponse with Stripe client secret for frontend
     */
    @Transactional
    public PaymentResponse initiatePayment(CreatePaymentRequest request) {
        try {
            log.info("Initiating payment for appointment ID: {} with amount: {}",
                    request.getAppointmentId(), request.getAmount());

            // Verify appointment exists (call appointment service)
            if (appointmentServiceClient != null) {
                try {
                    appointmentServiceClient.getAppointmentById(request.getAppointmentId());
                } catch (Exception e) {
                    log.warn("Could not verify appointment with service: {}", e.getMessage());
                }
            }

            // Reuse existing pending/failed payment so Pay Now can be retried safely.
            List<Payment> existingPayments = paymentRepository
                    .findByAppointmentIdOrderByCreatedAtDesc(request.getAppointmentId());
            if (!existingPayments.isEmpty()) {
                if (existingPayments.size() > 1) {
                    log.warn("Found {} payment rows for appointment ID: {}. Using latest valid record.",
                            existingPayments.size(), request.getAppointmentId());
                }

                boolean hasCompletedPayment = existingPayments.stream()
                        .anyMatch(payment -> payment.getPaymentStatus() == PaymentStatus.COMPLETED);
                if (hasCompletedPayment) {
                    throw new RuntimeException("Payment already completed for this appointment");
                }

                Payment reusablePayment = existingPayments.stream()
                        .filter(payment -> payment.getPaymentStatus() == PaymentStatus.PENDING
                                || payment.getPaymentStatus() == PaymentStatus.FAILED)
                        .findFirst()
                        .orElse(null);

                if (reusablePayment != null) {
                    log.info("Reusing existing payment for appointment ID: {} (paymentId: {}, status: {})",
                            request.getAppointmentId(), reusablePayment.getId(), reusablePayment.getPaymentStatus());
                    return mapToResponse(reusablePayment);
                }
            }

            // Convert amount to Stripe format (cents)
            long stripeAmount = stripePaymentService.convertToStripeAmount(request.getAmount());

            // Create metadata for Stripe
            Map<String, String> metadata = new HashMap<>();
            metadata.put("appointmentId", String.valueOf(request.getAppointmentId()));
            metadata.put("patientId", String.valueOf(request.getPatientId()));
            metadata.put("doctorId", String.valueOf(request.getDoctorId()));

            // Create Stripe Payment Intent
            PaymentIntent paymentIntent = stripePaymentService.createPaymentIntent(
                    stripeAmount,
                    request.getCurrency().toLowerCase(),
                    request.getDescription(),
                    metadata
            );

            // Save payment record to database
            Payment payment = Payment.builder()
                    .appointmentId(request.getAppointmentId())
                    .patientId(request.getPatientId())
                    .doctorId(request.getDoctorId())
                    .amount(request.getAmount())
                    .currency(request.getCurrency())
                    .paymentStatus(PaymentStatus.PENDING)
                    .paymentMethod(PaymentMethod.STRIPE)
                    .stripePaymentIntentId(paymentIntent.getId())
                    .stripeClientSecret(paymentIntent.getClientSecret())
                    .description(request.getDescription())
                    .notes("Payment initiated via Stripe")
                    .build();

            payment = paymentRepository.save(payment);
            log.info("Payment record created with ID: {}, Stripe Intent: {}",
                    payment.getId(), paymentIntent.getId());

            return mapToResponse(payment);
        } catch (Exception e) {
            log.error("Failed to initiate payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initiate payment: " + e.getMessage());
        }
    }

    /**
     * Get payment by ID
     *
     * @param paymentId Payment ID
     * @return PaymentResponse
     */
    public PaymentResponse getPaymentById(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));
        return mapToResponse(payment);
    }

    /**
     * Get payment by appointment ID
     *
     * @param appointmentId Appointment ID
     * @return PaymentResponse
     */
    public PaymentResponse getPaymentByAppointmentId(Long appointmentId) {
        List<Payment> payments = paymentRepository.findByAppointmentIdOrderByCreatedAtDesc(appointmentId);
        Payment payment = payments.stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Payment not found for appointment ID: " + appointmentId));
        return mapToResponse(payment);
    }

    /**
     * Get all payments for a patient
     *
     * @param patientId Patient ID
     * @return List of PaymentResponse
     */
    public List<PaymentResponse> getPaymentsByPatient(Long patientId) {
        return paymentRepository.findByPatientId(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Handle successful payment completion
     * Updates payment status and appointment status
     *
     * @param stripePaymentIntentId Stripe Payment Intent ID
     * @param paymentMethodLastFour Last 4 digits of card used
     * @param paymentMethodType Type of payment method (card, etc.)
     * @return PaymentResponse with updated status
     */
    @Transactional
    public PaymentResponse completePayment(String stripePaymentIntentId,
                                          String paymentMethodLastFour,
                                          String paymentMethodType) {
        try {
            log.info("Completing payment for Stripe Intent: {}", stripePaymentIntentId);

            // Retrieve payment from database
            Payment payment = paymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found for Stripe Intent: " + stripePaymentIntentId));

            // Verify payment with Stripe
            PaymentIntent paymentIntent = stripePaymentService.retrievePaymentIntent(stripePaymentIntentId);

            if (!paymentIntent.getStatus().equals("succeeded")) {
                throw new RuntimeException("Payment intent status is not 'succeeded': " + paymentIntent.getStatus());
            }

            // Update payment record
            payment.setPaymentStatus(PaymentStatus.COMPLETED);
            payment.setCompletedAt(LocalDateTime.now());
            payment.setPaymentMethodLastFour(paymentMethodLastFour);
            payment.setPaymentMethodType(paymentMethodType);
            payment.setTransactionReference(paymentIntent.getId());
            payment.setReceiptUrl(null);
            payment.setNotes("Payment completed successfully via Stripe");

            payment = paymentRepository.save(payment);
            log.info("Payment status updated to COMPLETED for ID: {}", payment.getId());

            // Sync appointment payment state, then attempt approval.
            if (appointmentServiceClient != null) {
                try {
                    UpdateStatusRequest statusRequest = UpdateStatusRequest.builder()
                            .paymentStatus(PaymentStatus.COMPLETED.name())
                            .notes("Payment completed successfully")
                            .build();
                    appointmentServiceClient.updateAppointmentPaymentStatus(payment.getAppointmentId(), statusRequest);

                    try {
                        appointmentServiceClient.approveAppointment(payment.getAppointmentId());
                        log.info("Appointment approved for appointment ID: {}", payment.getAppointmentId());
                    } catch (Exception approvalException) {
                        log.warn("Could not auto-approve appointment after payment completion: {}", approvalException.getMessage());
                    }
                } catch (Exception e) {
                    log.warn("Could not sync appointment payment status: {}", e.getMessage());
                    // Don't throw exception, payment is already completed
                }
            }

            return mapToResponse(payment);
        } catch (Exception e) {
            log.error("Failed to complete payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to complete payment: " + e.getMessage());
        }
    }

    /**
     * Handle failed payment
     *
     * @param stripePaymentIntentId Stripe Payment Intent ID
     * @param failureReason Reason for failure
     * @return PaymentResponse with failed status
     */
    @Transactional
    public PaymentResponse failPayment(String stripePaymentIntentId, String failureReason) {
        try {
            log.warn("Marking payment as FAILED for Stripe Intent: {}, Reason: {}",
                    stripePaymentIntentId, failureReason);

            Payment payment = paymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found for Stripe Intent: " + stripePaymentIntentId));

            payment.setPaymentStatus(PaymentStatus.FAILED);
            payment.setFailureReason(failureReason);
            payment.setNotes("Payment failed: " + failureReason);

            payment = paymentRepository.save(payment);
            log.info("Payment status updated to FAILED for ID: {}", payment.getId());

            return mapToResponse(payment);
        } catch (Exception e) {
            log.error("Failed to mark payment as failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to mark payment as failed: " + e.getMessage());
        }
    }

    /**
     * Refund a completed payment
     *
     * @param paymentId Payment ID to refund
     * @return PaymentResponse with refunded status
     */
    @Transactional
    public PaymentResponse refundPayment(Long paymentId) {
        try {
            log.info("Processing refund for payment ID: {}", paymentId);

            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));

            if (!payment.getPaymentStatus().equals(PaymentStatus.COMPLETED)) {
                throw new RuntimeException("Only completed payments can be refunded");
            }

            // Process refund with Stripe
            long refundAmount = stripePaymentService.convertToStripeAmount(payment.getAmount());
            stripePaymentService.refundPayment(payment.getStripePaymentIntentId(), refundAmount);

            // Update payment record
            payment.setPaymentStatus(PaymentStatus.REFUNDED);
            payment.setRefundedAt(LocalDateTime.now());
            payment.setNotes("Payment refunded successfully");

            payment = paymentRepository.save(payment);
            log.info("Payment refunded successfully for ID: {}", payment.getId());

            if (appointmentServiceClient != null) {
                try {
                    UpdateStatusRequest statusRequest = UpdateStatusRequest.builder()
                            .paymentStatus(PaymentStatus.REFUNDED.name())
                            .notes("Payment refunded successfully")
                            .build();
                    appointmentServiceClient.updateAppointmentPaymentStatus(payment.getAppointmentId(), statusRequest);
                } catch (Exception e) {
                    log.warn("Could not sync REFUNDED payment status to appointment service: {}", e.getMessage());
                }
            }

            return mapToResponse(payment);
        } catch (Exception e) {
            log.error("Failed to refund payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to refund payment: " + e.getMessage());
        }
    }

    /**
     * Map Payment entity to PaymentResponse DTO
     *
     * @param payment Payment entity
     * @return PaymentResponse
     */
    private PaymentResponse mapToResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .appointmentId(payment.getAppointmentId())
                .patientId(payment.getPatientId())
                .doctorId(payment.getDoctorId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .paymentStatus(payment.getPaymentStatus())
                .paymentMethod(payment.getPaymentMethod())
                .stripePaymentIntentId(payment.getStripePaymentIntentId())
                .stripeClientSecret(payment.getStripeClientSecret())
                .transactionReference(payment.getTransactionReference())
                .paymentMethodLastFour(payment.getPaymentMethodLastFour())
                .paymentMethodType(payment.getPaymentMethodType())
                .description(payment.getDescription())
                .failureReason(payment.getFailureReason())
                .receiptUrl(payment.getReceiptUrl())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .completedAt(payment.getCompletedAt())
                .notes(payment.getNotes())
                .build();
    }
}

