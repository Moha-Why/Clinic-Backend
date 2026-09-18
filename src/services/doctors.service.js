import { supabase } from '../lib/supabase.js'
import { ApiError } from '../utils/apiError.js'
import { isForeignKeyViolation } from '../utils/postgres.js'
import { expireStaleBookings } from './expire-bookings.js'
import {
  addDaysIso,
  clinicWallToUtc,
  eachIsoDateInclusive,
  getClinicTimeZone,
  minutesToHHmm,
  parseTimeToMinutes,
  utcToClinicParts,
} from '../utils/clinic-time.js'

const DOCTOR_SELECT = `
  *,
  availability:doctor_weekly_availability (
    id,
    day_of_week,
    start_time,
    end_time,
    notes,
    is_active
  )
`

function isActiveWindow(slot) {
  return slot.is_active !== false
}

export async function getDoctorDetails() {
  const { data: doctors, error } = await supabase
    .from('doctors')
    .select(DOCTOR_SELECT)
    .order('full_name', { ascending: true })

  if (error) {
    throw new ApiError(500, `Error fetching doctors: ${error.message}`)
  }

  return doctors ?? []
}

export async function getDoctorDetailsById(id) {
  const { data: doctor, error } = await supabase
    .from('doctors')
    .select(DOCTOR_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, `Error fetching doctor: ${error.message}`)
  }
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found')
  }

  return doctor
}

export async function getDoctorSlots(id, from, to) {
  await expireStaleBookings()
  const doctor = await getDoctorDetailsById(id)
  const timeZone = getClinicTimeZone()
  const duration = doctor.appointment_duration_minutes || 30
  const windows = (doctor.availability || []).filter(isActiveWindow)

  const rangeStart = clinicWallToUtc(from, '00:00', timeZone)
  const rangeEnd = clinicWallToUtc(addDaysIso(to, 1), '00:00', timeZone)

  const { data: booked, error } = await supabase
    .from('appointments')
    .select('appointment_start_at, appointment_end_at')
    .eq('doctor_id', id)
    .eq('status', 'booked')
    .lt('appointment_start_at', rangeEnd.toISOString())
    .gt('appointment_end_at', rangeStart.toISOString())

  if (error) {
    throw new ApiError(500, `Error fetching booked slots: ${error.message}`)
  }

  const bookedRanges = (booked ?? []).map((row) => ({
    start: new Date(row.appointment_start_at).getTime(),
    end: new Date(row.appointment_end_at).getTime(),
  }))

  const now = Date.now()
  const slots = []

  for (const isoDate of eachIsoDateInclusive(from, to)) {
    const weekday = utcToClinicParts(
      clinicWallToUtc(isoDate, '12:00', timeZone),
      timeZone
    ).isoWeekday

    for (const window of windows) {
      if (window.day_of_week !== weekday) continue

      const windowStart = parseTimeToMinutes(window.start_time)
      const windowEnd = parseTimeToMinutes(window.end_time)

      for (
        let slotStart = windowStart;
        slotStart + duration <= windowEnd;
        slotStart += duration
      ) {
        const start = clinicWallToUtc(isoDate, minutesToHHmm(slotStart), timeZone)
        const end = clinicWallToUtc(
          isoDate,
          minutesToHHmm(slotStart + duration),
          timeZone
        )
        const startMs = start.getTime()
        const endMs = end.getTime()

        if (startMs <= now) continue

        const overlaps = bookedRanges.some(
          (bookedSlot) => startMs < bookedSlot.end && endMs > bookedSlot.start
        )
        if (overlaps) continue

        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
        })
      }
    }
  }

  return { timeZone, slots }
}

export async function createDoctorRow(data) {
  const { doctor, availability } = data
  const { data: doctorDetails, error } = await supabase
    .from('doctors')
    .insert(doctor)
    .select()
    .single()

  if (error) {
    throw new ApiError(500, `Error adding doctor: ${error.message}`)
  }

  const schedule = availability.map((slot) => ({
    doctor_id: doctorDetails.id,
    ...slot,
  }))
  const { error: availError } = await supabase
    .from('doctor_weekly_availability')
    .insert(schedule)

  if (availError) {
    await supabase.from('doctors').delete().eq('id', doctorDetails.id)
    throw new ApiError(
      500,
      `Error adding availability, doctor creation rolled back: ${availError.message}`
    )
  }

  return getDoctorDetailsById(doctorDetails.id)
}

export async function updateDoctorRow(data, id) {
  await getDoctorDetailsById(id)

  const { doctor, availability } = data

  if (doctor && Object.keys(doctor).length > 0) {
    const { error: doctorError } = await supabase
      .from('doctors')
      .update(doctor)
      .eq('id', id)

    if (doctorError) {
      throw new ApiError(500, `Error updating doctor: ${doctorError.message}`)
    }
  }

  if (availability) {
    const { data: existingAvailability, error: fetchError } = await supabase
      .from('doctor_weekly_availability')
      .select('*')
      .eq('doctor_id', id)

    if (fetchError) {
      throw new ApiError(
        500,
        `Error fetching existing availability: ${fetchError.message}`
      )
    }

    const { error: deleteError } = await supabase
      .from('doctor_weekly_availability')
      .delete()
      .eq('doctor_id', id)

    if (deleteError) {
      throw new ApiError(
        500,
        `Error clearing old availability: ${deleteError.message}`
      )
    }

    const rows = availability.map((slot) => ({ doctor_id: id, ...slot }))
    const { error: availError } = await supabase
      .from('doctor_weekly_availability')
      .insert(rows)

    if (availError) {
      if (existingAvailability?.length) {
        await supabase.from('doctor_weekly_availability').insert(
          existingAvailability.map(({ id: _id, ...slot }) => slot)
        )
      }
      throw new ApiError(
        500,
        `Error updating availability, changes rolled back: ${availError.message}`
      )
    }
  }

  return getDoctorDetailsById(id)
}

export async function deleteDoctorRow(id) {
  await getDoctorDetailsById(id)

  const { error } = await supabase.from('doctors').delete().eq('id', id)
  if (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        409,
        'Doctor has existing appointments and cannot be deleted'
      )
    }
    throw new ApiError(500, `Error deleting doctor: ${error.message}`)
  }

  return { id }
}
