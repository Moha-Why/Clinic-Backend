// src/services/auth.service.js

import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabase.js';
import { signAccessToken } from '../utils/token.util.js';
import { ApiError } from '../utils/apiError.js';

export async function loginUser({ email, password }) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash, role, full_name, phone, is_active')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'User account is inactive');
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAccessToken({
    userId: user.id,
    role: user.role,
  });

  // optional: update last login
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      phone: user.phone,
    },
  };
}