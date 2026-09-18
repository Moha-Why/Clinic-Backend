import { ISO_DATE_RE, UUID_RE, addDaysIso, utcToClinicParts } from '../utils/clinic-time.js'
import { ApiError } from '../utils/apiError.js'
import {
  createDoctorRow,
  deleteDoctorRow,
  getDoctorDetails,
  getDoctorDetailsById,
  getDoctorSlots,
  updateDoctorRow,
} from '../services/doctors.service.js'

export async function getDoctors(req, res, next) {
  try {
    const doctors = await getDoctorDetails()
    res.status(200).json({
      success: true,
      message: 'doctors fetched',
      data: { doctors },
    })
  } catch (err) {
    next(err)
  }
}

export async function getDoctorById(req, res, next) {
  try {
    const doctor = await getDoctorDetailsById(req.params.id)
    res.status(200).json({
      success: true,
      message: 'doctor fetched',
      data: { doctor },
    })
  } catch (err) {
    next(err)
  }
}

export async function getSlots(req, res, next) {
  try {
    const { id } = req.params
    if (!UUID_RE.test(id)) {
      throw new ApiError(400, 'Doctor id must be a UUID')
    }

    const today = utcToClinicParts(new Date()).isoDate
    const from = req.query.from || today
    const to = req.query.to || addDaysIso(today, 13)

    if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to)) {
      throw new ApiError(400, 'from and to must be YYYY-MM-DD')
    }
    if (from > to) {
      throw new ApiError(400, 'from must be on or before to')
    }

    const days =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86400000 +
      1
    if (days > 31) {
      throw new ApiError(400, 'Slot range cannot exceed 31 days')
    }

    const { timeZone, slots } = await getDoctorSlots(id, from, to)
    res.status(200).json({
      success: true,
      message: 'slots fetched',
      data: { timeZone, slots },
    })
  } catch (err) {
    next(err)
  }
}

export async function createDoctor(req, res, next) {
  try {
    const doctor = await createDoctorRow(req.body)
    res.status(201).json({
      success: true,
      message: 'doctor created',
      data: { doctor },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateDoctor(req, res, next) {
  try {
    const doctor = await updateDoctorRow(req.body, req.params.id)
    res.status(200).json({
      success: true,
      message: 'doctor updated',
      data: { doctor },
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteDoctor(req, res, next) {
  try {
    const result = await deleteDoctorRow(req.params.id)
    res.status(200).json({
      success: true,
      message: 'doctor deleted',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}
