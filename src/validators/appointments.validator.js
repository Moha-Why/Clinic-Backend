export function validateCreateAppointment(req, res, next) {
  const { patient, appointment } = req.body

  const errors = []

  // patient
  if (!patient || typeof patient !== 'object') {
    errors.push('patient is required and must be an object')
  } else {
    const { full_name, phone, email } = patient

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
  }

  // appointment
  if (!appointment || typeof appointment !== 'object') {
    errors.push('appointment is required and must be an object')
  } else {
    const { doctor_id, appointment_start_at, appointment_end_at, status, notes, cancellation_reason } = appointment

    // doctor_id
    if (!doctor_id || !Number.isInteger(doctor_id) || doctor_id <= 0) {
      errors.push('appointment.doctor_id is required and must be a positive integer')
    }

    // appointment_start_at
    if (!appointment_start_at) {
      errors.push('appointment.appointment_start_at is required')
    } else if (isNaN(Date.parse(appointment_start_at))) {
      errors.push('appointment.appointment_start_at must be a valid ISO date')
    }

    // appointment_end_at
    if (!appointment_end_at) {
      errors.push('appointment.appointment_end_at is required')
    } else if (isNaN(Date.parse(appointment_end_at))) {
      errors.push('appointment.appointment_end_at must be a valid ISO date')
    }

    // start must be before end
    if (
      appointment_start_at &&
      appointment_end_at &&
      !isNaN(Date.parse(appointment_start_at)) &&
      !isNaN(Date.parse(appointment_end_at))
    ) {
      if (new Date(appointment_start_at) >= new Date(appointment_end_at)) {
        errors.push('appointment.appointment_start_at must be before appointment_end_at')
      }
    }

    // notes
    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      errors.push('appointment.notes must be a string')
    }

    // cancellation_reason — only relevant if status is cancelled
    if (status === 'cancelled' && !cancellation_reason) {
      errors.push('appointment.cancellation_reason is required when status is cancelled')
    }
    if (cancellation_reason !== undefined && cancellation_reason !== null && typeof cancellation_reason !== 'string') {
      errors.push('appointment.cancellation_reason must be a string')
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors })
  }

  // sanitize
  req.body.patient.full_name = patient.full_name.trim()
  req.body.patient.phone = patient.phone.trim()
  if (patient.email) req.body.patient.email = patient.email.trim()

  if (appointment.status === undefined) req.body.appointment.status = 'booked'

  next()
}