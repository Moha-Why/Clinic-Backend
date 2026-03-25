// src/middlewares/auth.middleware.js

import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  try {

    const token = req.cookies.accessToken

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required',
      });
    }

    

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const userId = decoded.userId 
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, phone, is_active, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access this resource',
      });
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');