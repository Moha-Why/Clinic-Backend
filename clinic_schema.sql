BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- day_of_week: ISO-8601. 1 = Monday … 7 = Sunday.
-- Do not use JavaScript Date#getDay() (0–6, Sunday = 0).

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
  full_name TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique_idx
  ON users (lower(email));

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (appointment_duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guest booking: no users row required (user_id stays NULL).
-- Identity key is normalized phone (normalize in Express before insert).

CREATE TABLE doctor_weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  UNIQUE (doctor_id, day_of_week, start_time, end_time)
);

CREATE INDEX doctor_weekly_availability_doctor_day_idx
  ON doctor_weekly_availability (doctor_id, day_of_week);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,

  appointment_start_at TIMESTAMPTZ NOT NULL,
  appointment_end_at TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('booked', 'cancelled', 'completed', 'no_show', 'expired')
  ),

  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (appointment_start_at < appointment_end_at),
  CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (
      status <> 'cancelled'
      AND cancelled_at IS NULL
      AND cancellation_reason IS NULL
    )
  )
);

CREATE INDEX appointments_patient_idx ON appointments (patient_id);
CREATE INDEX appointments_doctor_idx ON appointments (doctor_id);
CREATE INDEX appointments_status_idx ON appointments (status);
CREATE INDEX appointments_doctor_start_idx
  ON appointments (doctor_id, appointment_start_at);

CREATE UNIQUE INDEX appointments_doctor_slot_booked_idx
  ON appointments (doctor_id, appointment_start_at)
  WHERE status = 'booked';

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(appointment_start_at, appointment_end_at, '[)') WITH &&
  )
  WHERE (status = 'booked');

COMMIT;
