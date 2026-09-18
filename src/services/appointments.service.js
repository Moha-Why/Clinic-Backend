import { supabase } from '../lib/supabase.js'
import { ApiError } from '../utils/apiError.js'
import {
  clinicWallToUtc,
  getClinicTimeZone,
  parseTimeToMinutes,
  utcToClinicParts,
} from '../utils/clinic-time.js'
import { isOverlapConflict } from '../utils/postgres.js'
import { getDoctorDetailsById } from './doctors.service.js'
import { expireStaleBookings } from './expire-bookings.js'

const APPOINTMENT_SELECT = `
  *,
  patient:patients (
    id,
    full_name,
    phone,
    email
  ),
  doctor:doctors (
    id,
    full_name,
    specialty,
    phone
  )
`

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '')
}

function slotFitsWindow(startMinutes, endMinutes, window) {
  const windowStart = parseTimeToMinutes(window.start_time)
  const windowEnd = parseTimeToMinutes(window.end_time)
  return startMinutes >= windowStart && endMinutes <= windowEnd
}

async function getAppointmentById(id) {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, `Error fetching appointment: ${error.message}`)
  }
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found')
  }
  return appointment
}

export async function getAllAppointmentsRow() {
  await expireStaleBookings()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .order('appointment_start_at', { ascending: false })

  if (error) {
    throw new ApiError(500, `Error fetching appointments: ${error.message}`)
  }

  return appointments ?? []
}

export async function createAppointmentRow(data) {
  const { patient, appointment } = data
  const timeZone = getClinicTimeZone()
  const doctor = await getDoctorDetailsById(appointment.doctor_id)

  if (!doctor.is_active) {
    throw new ApiError(400, 'Doctor is not available for booking')
  }

  const duration = doctor.appointment_duration_minutes || 30
  const start = new Date(appointment.appointment_start_at)
  if (Number.isNaN(start.getTime())) {
    throw new ApiError(400, 'appointment.appointment_start_at must be a valid ISO date')
  }
  if (start.getTime() <= Date.now()) {
    throw new ApiError(400, 'Appointment must be in the future')
  }

  const end = new Date(start.getTime() + duration * 60 * 1000)
  const startParts = utcToClinicParts(start, timeZone)
  const endParts = utcToClinicParts(end, timeZone)

  if (startParts.isoDate !== endParts.isoDate) {
    throw new ApiError(400, 'Appointment must start and end on the same clinic day')
  }

  const windows = (doctor.availability || []).filter(
    (slot) => slot.is_active !== false && slot.day_of_week === startParts.isoWeekday
  )

  const fits = windows.some((window) =>
    slotFitsWindow(startParts.minutes, endParts.minutes, window)
  )
  if (!fits) {
    throw new ApiError(400, 'Appointment is outside the doctor\'s weekly hours')
  }

  const expectedStart = clinicWallToUtc(
    startParts.isoDate,
    `${String(Math.floor(startParts.minutes / 60)).padStart(2, '0')}:${String(
      startParts.minutes % 60
    ).padStart(2, '0')}`,
    timeZone
  )
  if (Math.abs(expectedStart.getTime() - start.getTime()) > 1000) {
    throw new ApiError(400, 'Appointment time is not aligned to the clinic timezone')
  }

  const phone = normalizePhone(patient.phone)
  const { data: patientRow, error: patientError } = await supabase
    .from('patients')
    .upsert(
      {
        full_name: patient.full_name,
        phone,
        email: patient.email || null,
        date_of_birth: patient.date_of_birth || null,
      },
      { onConflict: 'phone' }
    )
    .select()
    .single()

  if (patientError) {
    throw new ApiError(500, `Error saving patient: ${patientError.message}`)
  }

  const { data: created, error: appointError } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientRow.id,
      doctor_id: doctor.id,
      appointment_start_at: start.toISOString(),
      appointment_end_at: end.toISOString(),
      status: 'booked',
      notes: appointment.notes || null,
    })
    .select(APPOINTMENT_SELECT)
    .single()

  if (appointError) {
    if (isOverlapConflict(appointError)) {
      throw new ApiError(409, 'That time slot is no longer available')
    }
    throw new ApiError(500, `Error adding appointment: ${appointError.message}`)
  }

  return created
}

export async function cancellAppointmentRow(id, cancellation_reason) {
  await expireStaleBookings()
  const existing = await getAppointmentById(id)

  if (existing.status !== 'booked') {
    throw new ApiError(409, 'Only upcoming booked appointments can be cancelled')
  }
  if (new Date(existing.appointment_start_at).getTime() <= Date.now()) {
    throw new ApiError(409, 'Too late to cancel this appointment')
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'booked')
    .select(APPOINTMENT_SELECT)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, `Error cancelling appointment: ${error.message}`)
  }
  if (!appointment) {
    throw new ApiError(409, 'Only upcoming booked appointments can be cancelled')
  }

  return appointment
}

async function setOutcomeStatus(id, status) {
  await expireStaleBookings()
  const existing = await getAppointmentById(id)

  if (existing.status !== 'booked' && existing.status !== 'expired') {
    throw new ApiError(
      409,
      `Cannot mark ${status.replace('_', '-')} from status ${existing.status}`
    )
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .in('status', ['booked', 'expired'])
    .select(APPOINTMENT_SELECT)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, `Error updating appointment: ${error.message}`)
  }
  if (!appointment) {
    throw new ApiError(409, 'Appointment can no longer be updated')
  }

  return appointment
}

export async function completeAppointmentRow(id) {
  return setOutcomeStatus(id, 'completed')
}

export async function markNoShowRow(id) {
  return setOutcomeStatus(id, 'no_show')
}
