import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { login, logout } from "../controllers/auth.controller.js";

const router = Router()

router.post("/login", login)
router.post("/logout", requireAuth, logout)


export default router