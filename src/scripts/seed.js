import bcrypt from 'bcrypt'
import { supabase } from '../lib/supabase.js'

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@clinic.com')
  .trim()
  .toLowerCase()
const password = process.env.SEED_ADMIN_PASSWORD || 'ClinicAdmin-2026'
const doctorName = process.env.SEED_DOCTOR_NAME || 'Dr. Sarah Ahmed'
const doctorSpecialty = process.env.SEED_DOCTOR_SPECIALTY || 'Internal Medicine'

async function findUserByEmail(value) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role')
    .ilike('email', value)
    .maybeSingle()

  if (error) throw error
  return data
}

async function seed() {
  const passwordHash = await bcrypt.hash(password, 10)

  let user = await findUserByEmail(email)
  if (!user) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        role: 'admin',
        full_name: 'Clinic Admin',
        is_active: true,
      })
      .select('id, email, role')
      .single()
    if (error) throw error
    user = data
    console.log(`Created admin user ${email}`)
  } else {
    console.log(`Admin user already exists: ${email}`)
  }

  const { data: existingDoctor, error: doctorLookupError } = await supabase
    .from('doctors')
    .select('id, full_name')
    .eq('full_name', doctorName)
    .maybeSingle()
  if (doctorLookupError) throw doctorLookupError

  let doctor = existingDoctor
  if (!doctor) {
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        user_id: null,
        full_name: doctorName,
        specialty: doctorSpecialty,
        phone: '01000000000',
        appointment_duration_minutes: 30,
        is_active: true,
      })
      .select('id, full_name')
      .single()
    if (error) throw error
    doctor = data
    console.log(`Created doctor ${doctor.full_name}`)
  } else {
    console.log(`Doctor already exists: ${doctor.full_name}`)
  }

  const { data: hours, error: hoursError } = await supabase
    .from('doctor_weekly_availability')
    .select('id')
    .eq('doctor_id', doctor.id)
  if (hoursError) throw hoursError

  if (!hours?.length) {
    const availability = [1, 2, 3, 4].map((day_of_week) => ({
      doctor_id: doctor.id,
      day_of_week,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))
    const { error } = await supabase
      .from('doctor_weekly_availability')
      .insert(availability)
    if (error) throw error
    console.log('Added Mon–Thu 09:00–17:00 hours')
  } else {
    console.log('Doctor already has weekly hours')
  }

  console.log('Seed complete.')
  console.log(`  login: ${email}`)
  console.log('  password: (SEED_ADMIN_PASSWORD or default ClinicAdmin-2026)')
}

seed().catch((error) => {
  console.error('Seed failed:', error.message || error)
  process.exit(1)
})
