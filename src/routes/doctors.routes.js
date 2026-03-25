import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import { createDoctor, deleteDoctor, getDoctorById, getDoctors, updateDoctor } from "../controllers/doctors.controller.js";
import { validateCreateDoctor } from "../validators/doctors.validator.js";

const router = Router()

router.get("/", getDoctors)
router.get("/:id", getDoctorById)

router.post("/", requireAuth, requireAdmin, validateCreateDoctor, createDoctor)
router.put("/:id", requireAuth, requireAdmin, updateDoctor)
router.delete("/:id", requireAuth, requireAdmin, deleteDoctor)

export default router
