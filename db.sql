BEGIN;

CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (appointment_duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX patients_phone_idx ON patients (phone);
CREATE INDEX patients_email_idx ON patients (email);

CREATE TABLE if not exists doctor_weekly_availability (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
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
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id BIGINT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,

  appointment_start_at TIMESTAMPTZ NOT NULL,
  appointment_end_at TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('booked', 'cancelled', 'completed', 'no_show')
  ),

  notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (appointment_start_at < appointment_end_at)
);

CREATE UNIQUE INDEX patients_phone_unique_idx ON patients (phone);

CREATE INDEX appointments_patient_idx ON appointments (patient_id);
CREATE INDEX appointments_doctor_idx ON appointments (doctor_id);
CREATE INDEX appointments_status_idx ON appointments (status);
CREATE INDEX appointments_doctor_start_idx
  ON appointments (doctor_id, appointment_start_at);

COMMIT;
