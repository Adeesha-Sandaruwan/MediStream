package com.healthcare.payment.entity;

public enum WalletTransactionType {
    PAYMENT_CREDIT,
    DOCTOR_PAYOUT_RESERVE,
    DOCTOR_PAYOUT_RELEASE,
    WITHDRAWAL_REQUEST,
    WITHDRAWAL_COMPLETED,
    ADJUSTMENT,
    REFUND_REVERSAL
}