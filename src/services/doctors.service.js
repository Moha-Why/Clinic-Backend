import { supabase } from "../lib/supabase.js";
import { ApiError } from "../utils/apiError.js";

export async function getDoctorDetails() {
    const {data: doctors, error} = await supabase.from("doctors").select("*")
    if (error || !doctors) {
        throw new ApiError(404, `Error fetching doctors ${error}`);
    }
    return doctors
}

export async function getDoctorDetailsById(id) {
    const {data: doctors, error} = await supabase.from("doctors").select("*").eq("id", id)
    if (error || !doctors) {
        throw new ApiError(404, `Error fetching doctors ${error}`);
    }
    return doctors
}

export async function createDoctorRow(data) {
    const { doctor, availability} = data
    const { data: doctorDetails, error} = await supabase.from("doctors").insert(doctor).select().single()
    if (error) {
        throw new ApiError(500, `Error adding doctor ${error}`);
    }
    const schedule = availability.map((slot) => ({ doctor_id: doctorDetails.id, ...slot }))
      const { error: availError } = await supabase.from('doctor_weekly_availability').insert(schedule)

    if (availError) {
        await supabase.from('doctors').delete().eq('id', doctor.id)
        throw new ApiError(500, `Error adding availability, doctor creation rolled back: ${availError.message}`)
    }

    return { doctor, availability }
}

export async function updateDoctorRow(data, id) {
  const { doctor, availability } = data

  // 1. Update doctor
  const { error: doctorError } = await supabase
    .from('doctors')
    .update(doctor)
    .eq('id', id)

  if (doctorError) {
    throw new ApiError(500, `Error updating doctor: ${doctorError.message}`)
  }

  if (availability) {
    // 2. Snapshot existing availability before touching anything
    const { data: existingAvailability, error: fetchError } = await supabase
      .from('doctor_weekly_availability')
      .select('*')
      .eq('doctor_id', id)

    if (fetchError) {
      throw new ApiError(500, `Error fetching existing availability: ${fetchError.message}`)
    }

    // 3. Delete old rows
    const { error: deleteError } = await supabase
      .from('doctor_weekly_availability')
      .delete()
      .eq('doctor_id', id)

    if (deleteError) {
      throw new ApiError(500, `Error clearing old availability: ${deleteError.message}`)
    }

    // 4. Insert new rows
    const rows = availability.map((slot) => ({ doctor_id: id, ...slot }))
    const { error: availError } = await supabase.from('doctor_weekly_availability').insert(rows)

    if (availError) {
      // Rollback — restore the old availability
      await supabase.from('availability').insert(
        existingAvailability.map(({ id: _, ...slot }) => slot) // strip the old row ids
      )
      throw new ApiError(500, `Error updating availability, changes rolled back: ${availError.message}`)
    }
  }

  return 'doctor updated successfully'
}

export async function deleteDoctorRow(id) {
    const { error } = await supabase.from("doctors").delete().eq("id", id)
    if (error) {
        throw new ApiError(500, `Error deleting doctor ${error}`);
    }
    return "doctor deleted succefuly"
}
