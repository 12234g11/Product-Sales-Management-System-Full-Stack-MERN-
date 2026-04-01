import express from "express";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  createUser,
  getUsers,
  updateUserStatus,
  updateUserDiscountLimits,
  deleteUserPermanently,
} from "../controllers/userController.js";

const router = express.Router();

// Admin only
router.use(auth);
router.use(requireAdmin);

router.post("/", createUser);
router.get("/", getUsers);

// Enable / Disable
router.patch("/:id/status", updateUserStatus);

// Update discount limits
router.patch("/:id/discount-limits", updateUserDiscountLimits);

// Hard Delete (remove user permanently)
router.delete("/:id", deleteUserPermanently);

export default router;