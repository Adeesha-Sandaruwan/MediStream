package com.healthcare.payment.service;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Stripe Payment Gateway Service
 * Handles all Stripe payment operations
 */
@Service
@Slf4j
public class StripePaymentService {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    /**
     * Initialize Stripe with API key
     */
    @PostConstruct
    public void init() {
        if (stripeApiKey == null || stripeApiKey.isBlank() || stripeApiKey.contains("your_stripe_test_key_here")) {
            throw new IllegalStateException("STRIPE_API_KEY is missing or invalid. Set a real Stripe secret key (sk_test_...) before starting the payment service.");
        }
        Stripe.apiKey = stripeApiKey;
        log.info("Stripe API initialized");
    }

    /**
     * Create a Stripe Payment Intent
     * This initiates the payment process
     *
     * @param amount Amount in smallest currency unit (cents for USD, cents for LKR equivalent)
     * @param currency Currency code (usd, lkr)
     * @param description Payment description
     * @param metadata Additional metadata
     * @return PaymentIntent object
     */
    public PaymentIntent createPaymentIntent(long amount, String currency, String description,
                                           java.util.Map<String, String> metadata) {
        try {
            PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                    .setAmount(amount)
                    .setCurrency(currency.toLowerCase())
                    .setDescription(description)
                    .addPaymentMethodType("card");

            if (metadata != null && !metadata.isEmpty()) {
                paramsBuilder.putAllMetadata(metadata);
            }

            PaymentIntentCreateParams params = paramsBuilder.build();
            PaymentIntent paymentIntent = PaymentIntent.create(params);

            log.info("Payment Intent created: {}", paymentIntent.getId());
            return paymentIntent;
        } catch (Exception e) {
            log.error("Failed to create Payment Intent: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create payment intent: " + e.getMessage());
        }
    }

    /**
     * Retrieve a Payment Intent by ID
     *
     * @param paymentIntentId Stripe Payment Intent ID
     * @return PaymentIntent object
     */
    public PaymentIntent retrievePaymentIntent(String paymentIntentId) {
        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
            log.info("Payment Intent retrieved: {}, Status: {}", paymentIntentId, paymentIntent.getStatus());
            return paymentIntent;
        } catch (Exception e) {
            log.error("Failed to retrieve Payment Intent: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve payment intent: " + e.getMessage());
        }
    }

    /**
     * Confirm a Payment Intent
     * Used to process the payment with payment method details
     *
     * @param paymentIntentId Stripe Payment Intent ID
     * @param paymentMethodId Stripe Payment Method ID
     * @return Confirmed PaymentIntent
     */
    public PaymentIntent confirmPaymentIntent(String paymentIntentId, String paymentMethodId) {
        try {
            PaymentIntentConfirmParams params = PaymentIntentConfirmParams.builder()
                    .setPaymentMethod(paymentMethodId)
                    .setReturnUrl("https://yourdomain.com/payment-confirmation")
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId)
                    .confirm(params);

            log.info("Payment Intent confirmed: {}, Status: {}", paymentIntentId, paymentIntent.getStatus());
            return paymentIntent;
        } catch (Exception e) {
            log.error("Failed to confirm Payment Intent: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to confirm payment: " + e.getMessage());
        }
    }

    /**
     * Refund a payment
     *
     * @param paymentIntentId Stripe Payment Intent ID
     * @param amount Amount to refund (optional, null for full refund)
     * @return Refund object
     */
    public Refund refundPayment(String paymentIntentId, Long amount) {
        try {
            RefundCreateParams.Builder paramsBuilder = RefundCreateParams.builder()
                    .setPaymentIntent(paymentIntentId);

            if (amount != null) {
                paramsBuilder.setAmount(amount);
            }

            Refund refund = Refund.create(paramsBuilder.build());
            log.info("Refund created for Payment Intent: {}, Refund ID: {}", paymentIntentId, refund.getId());
            return refund;
        } catch (Exception e) {
            log.error("Failed to refund payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to refund payment: " + e.getMessage());
        }
    }

    /**
     * Convert amount to Stripe's smallest currency unit
     * For USD: cents (multiply by 100)
     * For LKR: units (multiply by 100 as well, or use direct amount depending on Stripe support)
     *
     * @param amount Amount in standard currency
     * @return Amount in smallest unit
     */
    public long convertToStripeAmount(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100)).longValue();
    }

    /**
     * Convert Stripe amount back to standard currency
     *
     * @param stripeAmount Amount from Stripe
     * @return Amount in standard currency
     */
    public BigDecimal convertFromStripeAmount(long stripeAmount) {
        return BigDecimal.valueOf(stripeAmount).divide(BigDecimal.valueOf(100));
    }
}

