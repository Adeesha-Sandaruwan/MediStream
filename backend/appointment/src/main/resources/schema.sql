-- Ensure payment_status exists for legacy databases before Hibernate insert/update.
ALTER TABLE IF EXISTS appointment.appointments
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30);

UPDATE appointment.appointments
SET payment_status = 'PENDING'
WHERE payment_status IS NULL;

ALTER TABLE IF EXISTS appointment.appointments
  ALTER COLUMN payment_status SET DEFAULT 'PENDING';

ALTER TABLE IF EXISTS appointment.appointments
  ALTER COLUMN payment_status SET NOT NULL;

