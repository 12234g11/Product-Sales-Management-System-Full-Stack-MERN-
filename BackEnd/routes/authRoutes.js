import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import auth from "../middleware/auth.js"
const router = express.Router();
// POST /api/auth/register
router.post("/register", register);
// POST /api/auth/login
router.post("/login", login);

router.post("/logout", auth, logout);
export default router;
