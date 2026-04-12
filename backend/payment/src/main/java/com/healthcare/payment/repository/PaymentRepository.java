package com.healthcare.payment.repository;

import com.healthcare.payment.entity.Payment;
import com.healthcare.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Find payments by appointment ID (latest first)
    List<Payment> findByAppointmentIdOrderByCreatedAtDesc(Long appointmentId);

    // Find all payments by patient ID
    List<Payment> findByPatientId(Long patientId);

    // Find all payments by doctor ID
    List<Payment> findByDoctorId(Long doctorId);

    // Find payments by status
    List<Payment> findByPaymentStatus(PaymentStatus paymentStatus);

    // Find payments by patient and status
    List<Payment> findByPatientIdAndPaymentStatus(Long patientId, PaymentStatus paymentStatus);

    // Find payment by Stripe Payment Intent ID
    Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);

    // Find payment by transaction reference
    Optional<Payment> findByTransactionReference(String transactionReference);

    // Find payments created within a date range
    List<Payment> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find completed payments for a patient
    List<Payment> findByPatientIdAndPaymentStatusOrderByCompletedAtDesc(Long patientId, PaymentStatus paymentStatus);

    // Find completed payments for a doctor (ordered by completion date)
    List<Payment> findByDoctorIdAndPaymentStatusOrderByCompletedAtDesc(Long doctorId, PaymentStatus paymentStatus);

    // Find payments by status ordered by completion date (for admin dashboard)
    List<Payment> findByPaymentStatusOrderByCompletedAtDesc(PaymentStatus paymentStatus);
}

