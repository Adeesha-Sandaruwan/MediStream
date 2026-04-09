package com.healthcare.payment.entity;

/**
 * Payment Method Enum - Represents the payment gateway/method used
 */
public enum PaymentMethod {
    STRIPE,          // Stripe Payment Gateway
    PAYTHERE,        // PayHere (Sri Lankan)
    DIALOG_GENIE,    // Dialog Genie (Sri Lankan)
    PAYPAL,          // PayPal
    BANK_TRANSFER    // Direct bank transfer
}

