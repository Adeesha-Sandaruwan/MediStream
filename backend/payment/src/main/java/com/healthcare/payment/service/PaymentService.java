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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PaymentService {

    private static final ConcurrentMap<Long, Object> APPOINTMENT_PAYMENT_LOCKS = new ConcurrentHashMap<>();

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private StripePaymentService stripePaymentService;

    @Autowired(required = false)
    private AppointmentServiceClient appointmentServiceClient;

    @Transactional
    public PaymentResponse initiatePayment(CreatePaymentRequest request) {
        try {
            log.info("Initiating payment for appointment ID: {} with amount: {}", request.getAppointmentId(), request.getAmount());

            synchronized (getAppointmentPaymentLock(request.getAppointmentId())) {
                if (appointmentServiceClient != null) {
                    try {
                        appointmentServiceClient.getAppointmentById(request.getAppointmentId());
                    } catch (Exception e) {
                        log.warn("Could not verify appointment with service: {}", e.getMessage());
                    }
                }

                List<Payment> existingPayments = paymentRepository.findByAppointmentIdOrderByCreatedAtDesc(request.getAppointmentId());
                if (!existingPayments.isEmpty()) {
                    if (existingPayments.size() > 1) {
                        log.warn("Found {} payment rows for appointment ID: {}. Reusing the safest record.", existingPayments.size(), request.getAppointmentId());
                    }

                    Payment completedPayment = existingPayments.stream()
                            .filter(payment -> payment.getPaymentStatus() == PaymentStatus.COMPLETED)
                            .max(Comparator.comparing(Payment::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                            .orElse(null);
                    if (completedPayment != null) {
                        throw new RuntimeException("Payment already completed for this appointment");
                    }

                    Payment reusablePayment = existingPayments.stream()
                            .filter(payment -> payment.getPaymentStatus() == PaymentStatus.PENDING || payment.getPaymentStatus() == PaymentStatus.FAILED)
                            .findFirst()
                            .orElse(null);

                    if (reusablePayment != null) {
                        log.info("Reusing existing payment for appointment ID: {} (paymentId: {}, status: {})", request.getAppointmentId(), reusablePayment.getId(), reusablePayment.getPaymentStatus());
                        return mapToResponse(reusablePayment);
                    }
                }

                long stripeAmount = stripePaymentService.convertToStripeAmount(request.getAmount());

                Map<String, String> metadata = new HashMap<>();
                metadata.put("appointmentId", String.valueOf(request.getAppointmentId()));
                metadata.put("patientId", String.valueOf(request.getPatientId()));
                metadata.put("doctorId", String.valueOf(request.getDoctorId()));

                PaymentIntent paymentIntent = stripePaymentService.createPaymentIntent(
                        stripeAmount,
                        request.getCurrency().toLowerCase(),
                        request.getDescription(),
                        metadata
                );

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
                log.info("Payment record created with ID: {}, Stripe Intent: {}", payment.getId(), paymentIntent.getId());

                return mapToResponse(payment);
            }
        } catch (Exception e) {
            log.error("Failed to initiate payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initiate payment: " + e.getMessage());
        }
    }

    public PaymentResponse getPaymentById(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));
        return mapToResponse(payment);
    }

    public PaymentResponse getPaymentByAppointmentId(Long appointmentId) {
        List<Payment> payments = paymentRepository.findByAppointmentIdOrderByCreatedAtDesc(appointmentId);
        Payment payment = payments.stream()
                .filter(item -> item.getPaymentStatus() == PaymentStatus.COMPLETED)
                .max(Comparator.comparing(Payment::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElseGet(() -> payments.stream().findFirst().orElse(null));
        if (payment == null) {
            throw new RuntimeException("Payment not found for appointment ID: " + appointmentId);
        }
        return mapToResponse(payment);
    }

    public List<PaymentResponse> getPaymentsByPatient(Long patientId) {
        return paymentRepository.findByPatientId(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentResponse completePayment(String stripePaymentIntentId, String paymentMethodLastFour, String paymentMethodType) {
        try {
            log.info("Completing payment for Stripe Intent: {}", stripePaymentIntentId);

            Payment payment = paymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found for Stripe Intent: " + stripePaymentIntentId));

            if (payment.getPaymentStatus() == PaymentStatus.COMPLETED) {
                log.info("Payment already marked as COMPLETED for Stripe Intent: {}", stripePaymentIntentId);
                return mapToResponse(payment);
            }

            PaymentIntent paymentIntent = stripePaymentService.retrievePaymentIntent(stripePaymentIntentId);

            if (!paymentIntent.getStatus().equals("succeeded")) {
                throw new RuntimeException("Payment intent status is not 'succeeded': " + paymentIntent.getStatus());
            }

            calculatePaymentFees(payment);

            payment.setPaymentStatus(PaymentStatus.COMPLETED);
            payment.setCompletedAt(LocalDateTime.now());
            payment.setDoctorPayoutStatus("COMPLETED");
            payment.setDoctorPayoutDate(LocalDateTime.now());
            payment.setPaymentMethodLastFour(paymentMethodLastFour);
            payment.setPaymentMethodType(paymentMethodType);
            payment.setTransactionReference(paymentIntent.getId());
            payment.setReceiptUrl(null);
            payment.setNotes("Payment completed successfully via Stripe. Split applied: Doctor 85%, Platform 15%. Platform fee: " + payment.getPlatformFee() + ", Doctor earnings: " + payment.getDoctorEarnings());

            payment = paymentRepository.save(payment);
            log.info("Payment status updated to COMPLETED for ID: {}. Platform fee: {}, Doctor earnings: {}", payment.getId(), payment.getPlatformFee(), payment.getDoctorEarnings());

            if (appointmentServiceClient != null) {
                try {
                    UpdateStatusRequest statusRequest = UpdateStatusRequest.builder()
                            .paymentStatus(PaymentStatus.COMPLETED.name())
                            .notes("Payment completed successfully")
                            .build();
                    appointmentServiceClient.updateAppointmentPaymentStatus(payment.getAppointmentId(), statusRequest);
                } catch (Exception e) {
                    log.warn("Could not sync appointment payment status: {}", e.getMessage());
                }
            }

            return mapToResponse(payment);
        } catch (Exception e) {
            log.error("Failed to complete payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to complete payment: " + e.getMessage());
        }
    }

    @Transactional
    public PaymentResponse failPayment(String stripePaymentIntentId, String failureReason) {
        try {
            log.warn("Marking payment as FAILED for Stripe Intent: {}, Reason: {}", stripePaymentIntentId, failureReason);

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

    @Transactional
    public PaymentResponse refundPayment(Long paymentId) {
        try {
            log.info("Processing refund for payment ID: {}", paymentId);

            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));

            if (!payment.getPaymentStatus().equals(PaymentStatus.COMPLETED)) {
                throw new RuntimeException("Only completed payments can be refunded");
            }

            long refundAmount = stripePaymentService.convertToStripeAmount(payment.getAmount());
            stripePaymentService.refundPayment(payment.getStripePaymentIntentId(), refundAmount);

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
                .platformFeeRate(payment.getPlatformFeeRate())
                .platformFee(payment.getPlatformFee())
                .doctorEarnings(payment.getDoctorEarnings())
                .doctorPayoutStatus(payment.getDoctorPayoutStatus())
                .doctorPayoutDate(payment.getDoctorPayoutDate())
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

    private Object getAppointmentPaymentLock(Long appointmentId) {
        return APPOINTMENT_PAYMENT_LOCKS.computeIfAbsent(appointmentId, ignored -> new Object());
    }

    private void calculatePaymentFees(Payment payment) {
        if (payment.getAmount() == null || payment.getPlatformFeeRate() == null) {
            throw new RuntimeException("Payment amount and fee rate are required for fee calculation");
        }

        BigDecimal feeRate = payment.getPlatformFeeRate().divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal platformFee = payment.getAmount().multiply(feeRate).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal doctorEarnings = payment.getAmount().subtract(platformFee).setScale(2, java.math.RoundingMode.HALF_UP);

        payment.setPlatformFee(platformFee);
        payment.setDoctorEarnings(doctorEarnings);
        
        log.info("Calculated fees for payment ID: {}. Amount: {}, Platform Fee ({}%): {}, Doctor Earnings: {}",
                payment.getId(), payment.getAmount(), payment.getPlatformFeeRate(), platformFee, doctorEarnings);
    }

    public List<PaymentResponse> getAllCompletedPayments() {
        return paymentRepository.findByPaymentStatusOrderByCompletedAtDesc(PaymentStatus.COMPLETED)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<PaymentResponse> getGlobalTransactionLedger() {
        return paymentRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<PaymentResponse> getPendingPayouts() {
        List<Payment> payments = paymentRepository.findAll();
        return payments.stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.COMPLETED && 
                           "PENDING".equals(p.getDoctorPayoutStatus()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<PaymentResponse> getPaymentsByDoctor(Long doctorId) {
        return paymentRepository.findByDoctorIdAndPaymentStatusOrderByCompletedAtDesc(doctorId, PaymentStatus.COMPLETED)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BigDecimal calculatePlatformRevenue() {
        List<Payment> completedPayments = paymentRepository.findByPaymentStatus(PaymentStatus.COMPLETED);
        return completedPayments.stream()
                .map(Payment::getPlatformFee)
                .filter(fee -> fee != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal calculatePendingDoctorPayouts() {
        List<Payment> payments = paymentRepository.findByPaymentStatus(PaymentStatus.COMPLETED);
        return payments.stream()
                .filter(p -> "PENDING".equals(p.getDoctorPayoutStatus()))
                .map(Payment::getDoctorEarnings)
                .filter(earnings -> earnings != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public PaymentResponse markDoctorPayoutCompleted(Long paymentId) {
        try {
            log.info("Marking doctor payout as COMPLETED for payment ID: {}", paymentId);

            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));

            if (!payment.getPaymentStatus().equals(PaymentStatus.COMPLETED)) {
                throw new RuntimeException("Only completed payments can be marked for doctor payout");
            }

            payment.setDoctorPayoutStatus("COMPLETED");
            payment.setDoctorPayoutDate(LocalDateTime.now());
            payment.setNotes("Doctor payout completed at " + LocalDateTime.now());

            payment = paymentRepository.save(payment);
            log.info("Doctor payout marked COMPLETED for payment ID: {}, Amount: {}", 
                    payment.getId(), payment.getDoctorEarnings());

            return mapToResponse(payment);
        } catch (Exception e) {
            log.error("Failed to mark doctor payout as completed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to mark doctor payout: " + e.getMessage());
        }
    }

    @Transactional
    public List<PaymentResponse> markBatchDoctorPayoutsCompleted(List<Long> paymentIds) {
        try {
            log.info("Marking batch doctor payouts as COMPLETED for {} payments", paymentIds.size());

            return paymentIds.stream()
                    .map(this::markDoctorPayoutCompleted)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to mark batch doctor payouts: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to mark batch payouts: " + e.getMessage());
        }
    }

    public Map<String, Object> getTransactionMetrics() {
        List<Payment> allPayments = paymentRepository.findAll();
        List<Payment> completedPayments = paymentRepository.findByPaymentStatus(PaymentStatus.COMPLETED);
        
        BigDecimal totalRevenue = calculatePlatformRevenue();
        BigDecimal pendingPayouts = calculatePendingDoctorPayouts();
        BigDecimal totalGrossAmount = completedPayments.stream()
                .map(Payment::getAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalTransactions", allPayments.size());
        metrics.put("completedTransactions", completedPayments.size());
        metrics.put("totalGrossRevenue", totalGrossAmount);
        metrics.put("platformRevenue", totalRevenue);
        metrics.put("pendingDoctorPayouts", pendingPayouts);
        metrics.put("averageTransactionAmount", completedPayments.isEmpty() ? 
                BigDecimal.ZERO : 
                totalGrossAmount.divide(new BigDecimal(completedPayments.size()), 2, java.math.RoundingMode.HALF_UP));
        
        return metrics;
    }
}