// src/controllers/auth.controller.js

import { loginUser } from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await loginUser({
      email: email.trim().toLowerCase(),
      password,
    });

  const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', result.token, {
      httpOnly: true,
      secure: isProduction, // true on HTTPS production
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  res.clearCookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: "/"
  });

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
}