import { Router } from 'express'
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js'
import {
  createDoctor,
  deleteDoctor,
  getDoctorById,
  getDoctors,
  getSlots,
  updateDoctor,
} from '../controllers/doctors.controller.js'
import {
  validateCreateDoctor,
  validateUpdateDoctor,
} from '../validators/doctors.validator.js'

const router = Router()

router.get('/', getDoctors)
router.get('/:id/slots', getSlots)
router.get('/:id', getDoctorById)

router.post('/', requireAuth, requireAdmin, validateCreateDoctor, createDoctor)
router.put('/:id', requireAuth, requireAdmin, validateUpdateDoctor, updateDoctor)
router.delete('/:id', requireAuth, requireAdmin, deleteDoctor)

export default router
