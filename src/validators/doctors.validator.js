import { TIME_RE } from '../utils/clinic-time.js'

function validateDoctorFields(doctor, errors, requiredName) {
  if (!doctor || typeof doctor !== 'object') {
    if (requiredName) errors.push('doctor is required and must be an object')
    return
  }

  const { full_name, specialty, phone, appointment_duration_minutes, is_active } =
    doctor

  if (requiredName) {
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      errors.push('doctor.full_name is required')
    } else if (full_name.trim().length < 2) {
      errors.push('doctor.full_name must be at least 2 characters')
    }
  } else if (full_name !== undefined) {
    if (typeof full_name !== 'string' || full_name.trim().length < 2) {
      errors.push('doctor.full_name must be at least 2 characters')
    }
  }

  if (specialty !== undefined && specialty !== null && typeof specialty !== 'string') {
    errors.push('doctor.specialty must be a string')
  }

  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    errors.push('doctor.phone must be a string')
  }

  if (
    appointment_duration_minutes !== undefined &&
    (!Number.isInteger(appointment_duration_minutes) ||
      appointment_duration_minutes <= 0)
  ) {
    errors.push('doctor.appointment_duration_minutes must be a positive integer')
  }

  if (is_active !== undefined && typeof is_active !== 'boolean') {
    errors.push('doctor.is_active must be a boolean')
  }
}

function validateAvailability(availability, errors, required) {
  if (availability === undefined) {
    if (required) errors.push('availability is required and must be an array')
    return
  }

  if (!Array.isArray(availability)) {
    errors.push('availability must be an array')
    return
  }

  if (availability.length === 0) {
    errors.push('availability must include at least one working-day window')
    return
  }

  availability.forEach((slot, i) => {
    const { day_of_week, start_time, end_time, is_active } = slot || {}

    if (
      day_of_week === undefined ||
      !Number.isInteger(day_of_week) ||
      day_of_week < 1 ||
      day_of_week > 7
    ) {
      errors.push(
        `availability[${i}].day_of_week must be an integer between 1 and 7`
      )
    }

    if (!start_time || !TIME_RE.test(start_time)) {
      errors.push(`availability[${i}].start_time must be a valid time (HH:MM)`)
    }
    if (!end_time || !TIME_RE.test(end_time)) {
      errors.push(`availability[${i}].end_time must be a valid time (HH:MM)`)
    }
    if (
      start_time &&
      end_time &&
      TIME_RE.test(start_time) &&
      TIME_RE.test(end_time) &&
      start_time.slice(0, 5) >= end_time.slice(0, 5)
    ) {
      errors.push(`availability[${i}].start_time must be before end_time`)
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      errors.push(`availability[${i}].is_active must be a boolean`)
    }
  })
}

function sanitizeDoctor(doctor, { defaults = false } = {}) {
  const next = { ...doctor }
  if (next.full_name) next.full_name = next.full_name.trim()
  if (next.specialty) next.specialty = next.specialty.trim()
  if (next.phone) next.phone = next.phone.trim()
  if (defaults) {
    if (next.appointment_duration_minutes === undefined) {
      next.appointment_duration_minutes = 30
    }
    if (next.is_active === undefined) next.is_active = true
  }
  return next
}

function sanitizeAvailability(availability) {
  return availability.map((slot) => ({
    day_of_week: slot.day_of_week,
    start_time: String(slot.start_time).slice(0, 5),
    end_time: String(slot.end_time).slice(0, 5),
    notes: slot.notes ?? null,
    is_active: slot.is_active ?? true,
  }))
}

export function validateCreateDoctor(req, res, next) {
  const { doctor, availability } = req.body
  const errors = []

  validateDoctorFields(doctor, errors, true)
  validateAvailability(availability, errors, true)

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  req.body.doctor = sanitizeDoctor(doctor, { defaults: true })
  req.body.availability = sanitizeAvailability(availability)
  next()
}

export function validateUpdateDoctor(req, res, next) {
  const { doctor, availability } = req.body
  const errors = []

  if (doctor !== undefined) validateDoctorFields(doctor, errors, false)
  if (availability !== undefined) validateAvailability(availability, errors, false)

  if (!doctor && !availability) {
    errors.push('doctor or availability is required')
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  if (doctor) req.body.doctor = sanitizeDoctor(doctor, { defaults: false })
  if (availability) req.body.availability = sanitizeAvailability(availability)
  next()
}
