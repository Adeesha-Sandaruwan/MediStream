-- MediStream telemedicine service — PostgreSQL schema reference.
-- Hibernate can create/update tables when spring.jpa.hibernate.ddl-auto=update.

CREATE SCHEMA IF NOT EXISTS telemedicine_schema;

-- Patient → doctor intake (before video is scheduled).
CREATE TABLE IF NOT EXISTS telemedicine_schema.telemedicine_intake_request (
    id                     BIGSERIAL PRIMARY KEY,
    patient_email          VARCHAR(255) NOT NULL,
    doctor_email           VARCHAR(255) NOT NULL,
    symptoms               TEXT NOT NULL,
    additional_details     TEXT,
    urgency                VARCHAR(32),
    symptom_duration       VARCHAR(255),
    current_medications    TEXT,
    known_allergies        TEXT,
    status                 VARCHAR(32)  NOT NULL,
    consultation_id        BIGINT,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemed_intake_doctor_status
    ON telemedicine_schema.telemedicine_intake_request (doctor_email, status);
CREATE INDEX IF NOT EXISTS idx_telemed_intake_patient
    ON telemedicine_schema.telemedicine_intake_request (patient_email);

-- Video visit (Jitsi room + time window). consultation_id on intake links here via application logic.
CREATE TABLE IF NOT EXISTS telemedicine_schema.telemedicine_consultation (
    id                      BIGSERIAL PRIMARY KEY,
    public_room_id         VARCHAR(128) NOT NULL UNIQUE,
    status                 VARCHAR(32)  NOT NULL CHECK (status IN ('CREATED','SCHEDULED','LIVE','ENDED','CANCELLED')),
    patient_email          VARCHAR(255) NOT NULL,
    invited_doctor_email   VARCHAR(255),
    doctor_email           VARCHAR(255),
    external_appointment_id VARCHAR(64),
    video_provider         VARCHAR(32)  NOT NULL DEFAULT 'JITSI',
    room_url               VARCHAR(512),
    symptoms               TEXT,
    scheduled_start_at     TIMESTAMPTZ,
    scheduled_end_at       TIMESTAMPTZ,
    intake_request_id      BIGINT,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    started_at             TIMESTAMPTZ,
    ended_at               TIMESTAMPTZ,
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemed_consult_status
    ON telemedicine_schema.telemedicine_consultation (status);
CREATE INDEX IF NOT EXISTS idx_telemed_consult_patient
    ON telemedicine_schema.telemedicine_consultation (patient_email);
CREATE INDEX IF NOT EXISTS idx_telemed_consult_intake
    ON telemedicine_schema.telemedicine_consultation (intake_request_id)
    WHERE intake_request_id IS NOT NULL;

-- Legacy ALTERs if tables pre-existed:
-- ALTER TABLE telemedicine_schema.telemedicine_consultation ADD COLUMN IF NOT EXISTS intake_request_id BIGINT;
