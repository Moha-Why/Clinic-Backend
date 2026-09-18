import { UUID_RE } from '../utils/clinic-time.js'

export function validateCreateAppointment(req, res, next) {
  const { patient, appointment } = req.body
  const errors = []

  if (!patient || typeof patient !== 'object') {
    errors.push('patient is required and must be an object')
  } else {
    const { full_name, phone, email, date_of_birth } = patient

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      errors.push('patient.full_name is required')
    } else if (full_name.trim().length < 2) {
      errors.push('patient.full_name must be at least 2 characters')
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      errors.push('patient.phone is required')
    }

    if (email !== undefined && email !== null && typeof email !== 'string') {
      errors.push('patient.email must be a string')
    }

    if (
      date_of_birth !== undefined &&
      date_of_birth !== null &&
      typeof date_of_birth !== 'string'
    ) {
      errors.push('patient.date_of_birth must be a string')
    }
  }

  if (!appointment || typeof appointment !== 'object') {
    errors.push('appointment is required and must be an object')
  } else {
    const { doctor_id, appointment_start_at, notes } = appointment

    if (!doctor_id || typeof doctor_id !== 'string' || !UUID_RE.test(doctor_id)) {
      errors.push('appointment.doctor_id is required and must be a UUID')
    }

    if (!appointment_start_at) {
      errors.push('appointment.appointment_start_at is required')
    } else if (Number.isNaN(Date.parse(appointment_start_at))) {
      errors.push('appointment.appointment_start_at must be a valid ISO date')
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      errors.push('appointment.notes must be a string')
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  req.body.patient.full_name = patient.full_name.trim()
  req.body.patient.phone = patient.phone.trim()
  if (patient.email) req.body.patient.email = patient.email.trim()

  next()
}

export function validateCancelAppointment(req, res, next) {
  const { cancellation_reason } = req.body || {}

  if (
    !cancellation_reason ||
    typeof cancellation_reason !== 'string' ||
    !cancellation_reason.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['cancellation_reason is required'],
    })
  }

  req.body.cancellation_reason = cancellation_reason.trim()
  next()
}
