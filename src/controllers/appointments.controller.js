import {
  cancellAppointmentRow,
  completeAppointmentRow,
  createAppointmentRow,
  getAllAppointmentsRow,
  markNoShowRow,
} from '../services/appointments.service.js'

export async function getAllAppointments(req, res, next) {
  try {
    const appointments = await getAllAppointmentsRow()
    res.status(200).json({
      success: true,
      message: 'appointments fetched',
      data: { appointments },
    })
  } catch (err) {
    next(err)
  }
}

export async function createAppointment(req, res, next) {
  try {
    const appointment = await createAppointmentRow(req.body)
    res.status(201).json({
      success: true,
      message: 'appointment booked',
      data: { appointment },
    })
  } catch (err) {
    next(err)
  }
}

export async function cancelAppointment(req, res, next) {
  try {
    const appointment = await cancellAppointmentRow(
      req.params.id,
      req.body.cancellation_reason
    )
    res.status(200).json({
      success: true,
      message: 'appointment cancelled',
      data: { appointment },
    })
  } catch (err) {
    next(err)
  }
}

export async function completeAppointment(req, res, next) {
  try {
    const appointment = await completeAppointmentRow(req.params.id)
    res.status(200).json({
      success: true,
      message: 'appointment completed',
      data: { appointment },
    })
  } catch (err) {
    next(err)
  }
}

export async function markNoShow(req, res, next) {
  try {
    const appointment = await markNoShowRow(req.params.id)
    res.status(200).json({
      success: true,
      message: 'appointment marked no-show',
      data: { appointment },
    })
  } catch (err) {
    next(err)
  }
}
