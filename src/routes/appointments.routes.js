import { Router } from 'express'
import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
  getAllAppointments,
  markNoShow,
} from '../controllers/appointments.controller.js'
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js'
import {
  validateCancelAppointment,
  validateCreateAppointment,
} from '../validators/appointments.validator.js'

const router = Router()

router.post('/', validateCreateAppointment, createAppointment)

router.get('/', requireAuth, requireAdmin, getAllAppointments)
router.put(
  '/:id/cancel',
  requireAuth,
  requireAdmin,
  validateCancelAppointment,
  cancelAppointment
)
router.put('/:id/complete', requireAuth, requireAdmin, completeAppointment)
router.put('/:id/no-show', requireAuth, requireAdmin, markNoShow)

export default router
