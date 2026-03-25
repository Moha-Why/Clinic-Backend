import { supabase } from "../lib/supabase.js";
import { ApiError } from "../utils/apiError.js";

export async function getAllAppointmentsRow() {
    const {data: appointments, error} = await supabase.from("appointments").select("*")
    if (error || !appointments) {
        throw new ApiError(404, `Error fetching appointments ${error}`);
    }
    return appointments
}

export async function createAppointmentRow(data) {
    const { patient, appointment} = data
    const { data: patientDetials, error} = await supabase.from("patients").upsert(patient, { onConflict: 'phone', ignoreDuplicates: false }).select().single()
    if (error) {
        throw new ApiError(500, error);
    }
    const {error: appointError} = await supabase.from("appointments").insert({patient_id: patientDetials.id, status: "booked", ...appointment})
    if (appointError) {
        throw new ApiError(500, `Error adding appointment ${error}`);
    }
    return { patient, appointment }
}

export async function updateAppointmentRow(data, id) {
    const {data: appointment, error: appointError} = await supabase.from("appointments").update(data).eq("id", id).select().single()
    if (appointError) {
        throw new ApiError(500, appointError.message);
    }
    return { appointment }
}


export async function cancellAppointmentRow(id, cancellation_reason) {
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id)

    if (error) throw new ApiError(500, `Error cancelling appointment: ${error.message}`)

    return "Appointment cancelled"
}