import { cancellAppointmentRow, createAppointmentRow, getAllAppointmentsRow, updateAppointmentRow } from "../services/appointments.service.js";

export async function getAllAppointments(req, res, next) {
    try {
        const appointments = await getAllAppointmentsRow()
        res.status(200).json({
            success: true,
            message: "appointments fetched",
            data: {
                appointments
            }
        })
    } catch(err) {
        next(err);
    }
}


export async function createAppointment(req, res, next) {
    try {
        const data = req.body
        const row = await createAppointmentRow(data)
        res.status(200).json({
            success: true,
            message: row,
        })
    } catch(err) {
        next(err);
    }
}

export async function updateAppointment(req, res, next) {
    try {
        const data = req.body
        const id = req.params.id
        const doctor = await updateAppointmentRow(data, id)
        res.status(200).json({
            success: true,
            message: doctor,
        })
    } catch(err) {
        next(err);
    }
}

// controller
export async function cancelAppointment(req, res) {
    try {
    const { id } = req.params
    const { cancellation_reason } = req.body
    const message = await cancellAppointmentRow(id, cancellation_reason)
    res.json({ success: true, message })

    } catch(err) {
        next(err);
    }
}