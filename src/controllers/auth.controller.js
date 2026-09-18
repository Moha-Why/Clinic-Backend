import { loginUser } from '../services/auth.service.js'
import {
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
} from '../utils/cookie.util.js'

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const result = await loginUser({
      email: email.trim().toLowerCase(),
      password,
    })

    res.cookie('accessToken', result.token, accessTokenCookieOptions())

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: result.token,
        user: result.user,
      },
    })
  } catch (error) {
    next(error)
  }
}

export function logout(req, res) {
  res.clearCookie('accessToken', clearAccessTokenCookieOptions())

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  })
}

export function me(req, res) {
  const user = req.user

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        isActive: user.is_active,
      },
    },
  })
}
