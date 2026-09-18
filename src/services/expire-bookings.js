import { supabase } from '../lib/supabase.js'
import { ApiError } from '../utils/apiError.js'

export async function expireStaleBookings() {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'expired' })
    .eq('status', 'booked')
    .lt('appointment_end_at', new Date().toISOString())

  if (error) {
    throw new ApiError(500, `Error expiring appointments: ${error.message}`)
  }
}
