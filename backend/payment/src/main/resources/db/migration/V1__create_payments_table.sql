-- Payment Service Database Setup
-- This script creates the necessary tables for the payment service

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,

    -- Foreign Keys
    appointment_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,

    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'LKR',

    -- Payment Status
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50) NOT NULL,

    -- Stripe Integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_client_secret VARCHAR(255),

    -- Transaction Details
    transaction_reference VARCHAR(255),
    payment_method_last_four VARCHAR(10),
    payment_method_type VARCHAR(50),

    -- Payment Info
    description TEXT,
    failure_reason VARCHAR(500),
    receipt_url TEXT,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    refunded_at TIMESTAMP,

    -- Notes
    notes VARCHAR(1000)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_doctor_id ON payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_reference);

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Stores payment transaction records for consultation appointments';
COMMENT ON COLUMN payments.appointment_id IS 'Reference to the appointment service';
COMMENT ON COLUMN payments.patient_id IS 'Reference to the patient service';
COMMENT ON COLUMN payments.doctor_id IS 'Reference to the doctor service';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for transaction tracking';
COMMENT ON COLUMN payments.payment_status IS 'Status: PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: STRIPE, PAYTHERE, DIALOG_GENIE, PAYPAL, BANK_TRANSFER';

