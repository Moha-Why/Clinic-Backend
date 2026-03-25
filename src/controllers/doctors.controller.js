import { createDoctorRow, deleteDoctorRow, getDoctorDetails, getDoctorDetailsById, updateDoctorRow } from "../services/doctors.service.js";

export async function getDoctors(req, res, next) {
    try {
        const doctors = await getDoctorDetails()
        res.status(200).json({
            success: true,
            message: "doctors fetched",
            data: {
                doctors
            }
        })
    } catch(err) {
        next(err);
    }
}

export async function getDoctorById(req, res, next) {
    try {
        const id = req.params.id
        const doctor = await getDoctorDetailsById(id)
        res.status(200).json({
            success: true,
            message: "doctor fetched",
            data: {
                doctor
            }
        })
    } catch(err) {
        next(err);
    }
}

export async function createDoctor(req, res, next) {
    try {
        const data = req.body
        const doctor = await createDoctorRow(data)
        res.status(200).json({
            success: true,
            message: doctor,
        })
    } catch(err) {
        next(err);
    }
}

export async function updateDoctor(req, res, next) {
    try {
        const data = req.body
        const id = req.params.id
        const doctor = await updateDoctorRow(data, id)
        res.status(200).json({
            success: true,
            message: doctor,
        })
    } catch(err) {
        next(err);
    }
}

export async function deleteDoctor(req, res, next) {
    try {
        const id = req.params.id
        const doctor = await deleteDoctorRow(id)
        res.status(200).json({
            success: true,
            message: doctor,
        })
    } catch(err) {
        next(err);
    }
}