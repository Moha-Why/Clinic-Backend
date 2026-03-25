export function validateCreateDoctor(req, res, next) {
  const { doctor, availability } = req.body;

  const errors = [];
  
  // doctor object
  if (!doctor || typeof doctor !== 'object') {
    errors.push('doctor is required and must be an object');
  } else {
    const { full_name, specialty, phone, appointment_duration_minutes, is_active } = doctor;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      errors.push('doctor.full_name is required');
    } else if (full_name.trim().length < 2) {
      errors.push('doctor.full_name must be at least 2 characters');
    }

    if (specialty !== undefined && specialty !== null && typeof specialty !== 'string') {
      errors.push('doctor.specialty must be a string');
    }

    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      errors.push('doctor.phone must be a string');
    }

    if (
      appointment_duration_minutes !== undefined &&
      (!Number.isInteger(appointment_duration_minutes) || appointment_duration_minutes <= 0)
    ) {
      errors.push('doctor.appointment_duration_minutes must be a positive integer');
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      errors.push('doctor.is_active must be a boolean');
    }
  }

  // availability
  if (!availability || !Array.isArray(availability)) {
    errors.push('availability is required and must be an array');
  } else if (availability.length !== 7) {
    errors.push('availability must have exactly 7 records (one per day)');
  } else {
    const seenDays = new Set();

    availability.forEach((slot, i) => {
      const { day_of_week, start_time, end_time, is_active } = slot;

      if (day_of_week === undefined || !Number.isInteger(day_of_week) || day_of_week < 1 || day_of_week > 7) {
        errors.push(`availability[${i}].day_of_week must be an integer between 1 and 7`);
      } else if (seenDays.has(day_of_week)) {
        errors.push(`availability[${i}].day_of_week ${day_of_week} is duplicated`);
      } else {
        seenDays.add(day_of_week);
      }

      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!start_time || !timeRegex.test(start_time)) {
        errors.push(`availability[${i}].start_time must be a valid time (HH:MM)`);
      }
      if (!end_time || !timeRegex.test(end_time)) {
        errors.push(`availability[${i}].end_time must be a valid time (HH:MM)`);
      }
      if (start_time && end_time && timeRegex.test(start_time) && timeRegex.test(end_time)) {
        if (start_time >= end_time) {
          errors.push(`availability[${i}].start_time must be before end_time`);
        }
      }

      if (is_active !== undefined && typeof is_active !== 'boolean') {
        errors.push(`availability[${i}].is_active must be a boolean`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  // sanitize
  req.body.doctor.full_name = doctor.full_name.trim();
  if (doctor.specialty) req.body.doctor.specialty = doctor.specialty.trim();
  if (doctor.phone) req.body.doctor.phone = doctor.phone.trim();
  if (doctor.appointment_duration_minutes === undefined) req.body.doctor.appointment_duration_minutes = 30;
  if (doctor.is_active === undefined) req.body.doctor.is_active = true;

  req.body.availability = availability.map((slot) => ({
    ...slot,
    is_active: slot.is_active ?? true,
  }));

  next();
}