package com.healthcare.payment.controller;

import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.healthcare.payment.service.PaymentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Stripe Webhook Controller
 * Handles real-time payment status updates from Stripe
 */
@RestController
@RequestMapping("/api/v1/payments/webhook")
@Slf4j
public class StripeWebhookController {

    @Autowired
    private PaymentService paymentService;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    /**
     * Handle Stripe webhook events
     * Stripe sends events to this endpoint for payment status changes
     *
     * @param payload Raw webhook payload
     * @param sigHeader Stripe signature header for verification
     * @return ResponseEntity with success status
     */
    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            log.info("Received Stripe webhook event");

            // Verify webhook signature
            Event event = Webhook.constructEvent(
                    payload,
                    sigHeader,
                    webhookSecret
            );

            log.info("Webhook event verified. Event type: {}", event.getType());

            // Deserialize the event
            EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
            StripeObject stripeObject = dataObjectDeserializer.getObject()
                    .orElseThrow(() -> new Exception("Failed to deserialize event data"));

            // Handle different event types
            switch (event.getType()) {
                case "payment_intent.succeeded":
                    handlePaymentIntentSucceeded((PaymentIntent) stripeObject);
                    break;
                case "payment_intent.payment_failed":
                    handlePaymentIntentFailed((PaymentIntent) stripeObject);
                    break;
                case "charge.refunded":
                    handleChargeRefunded((PaymentIntent) stripeObject);
                    break;
                default:
                    log.info("Unhandled event type: {}", event.getType());
            }

            return ResponseEntity.ok("{\"received\": true}");

        } catch (Exception e) {
            log.error("Webhook error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Webhook error: " + e.getMessage());
        }
    }

    /**
     * Handle payment_intent.succeeded event
     * Called when payment is successfully completed
     */
    private void handlePaymentIntentSucceeded(PaymentIntent paymentIntent) {
        try {
            log.info("Processing payment_intent.succeeded for intent: {}", paymentIntent.getId());

            String paymentMethodLastFour = "****";
            String paymentMethodType = "card";


            // Update payment status in database
            paymentService.completePayment(
                    paymentIntent.getId(),
                    paymentMethodLastFour,
                    paymentMethodType
            );

            log.info("Payment successfully completed for intent: {}", paymentIntent.getId());
        } catch (Exception e) {
            log.error("Error handling payment_intent.succeeded: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle payment_intent.payment_failed event
     * Called when payment fails
     */
    private void handlePaymentIntentFailed(PaymentIntent paymentIntent) {
        try {
            log.warn("Processing payment_intent.payment_failed for intent: {}", paymentIntent.getId());

            String failureReason = "Payment failed";
            if (paymentIntent.getLastPaymentError() != null) {
                failureReason = paymentIntent.getLastPaymentError().getMessage();
            }

            // Update payment status in database
            paymentService.failPayment(paymentIntent.getId(), failureReason);

            log.warn("Payment failed for intent: {} with reason: {}",
                    paymentIntent.getId(), failureReason);
        } catch (Exception e) {
            log.error("Error handling payment_intent.payment_failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle charge.refunded event
     * Called when a charge is refunded
     */
    private void handleChargeRefunded(PaymentIntent paymentIntent) {
        try {
            log.info("Processing charge.refunded for intent: {}", paymentIntent.getId());
            // Payment is already updated as REFUNDED when we process the refund request
            // This is just for logging/audit purposes
            log.info("Charge refunded for intent: {}", paymentIntent.getId());
        } catch (Exception e) {
            log.error("Error handling charge.refunded: {}", e.getMessage(), e);
        }
    }
}

