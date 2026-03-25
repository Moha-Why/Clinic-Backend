import { Router } from 'express';
import {
  createAppointment,
  getAllAppointments,
} from '../controllers/appointments.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { validateCreateAppointment } from '../validators/appointments.validator.js';
import { updateAppointment } from '../controllers/appointments.controller.js';
import { cancelAppointment } from '../controllers/appointments.controller.js';

const router = Router();

router.post('/', validateCreateAppointment, createAppointment);

// admin
router.get('/', requireAuth, requireAdmin, getAllAppointments);
router.put('/:id/cancel', requireAuth, requireAdmin, cancelAppointment);
router.put('/:id', requireAuth, requireAdmin, updateAppointment);

export default router;