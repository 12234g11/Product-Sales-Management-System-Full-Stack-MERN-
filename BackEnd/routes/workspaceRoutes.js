import express from "express";
import { deleteMyWorkspace, updateMyWorkspaceName } from "../controllers/workspaceController.js";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

// PATCH /api/workspaces/name  (admin only)
router.patch("/name", auth, requireAdmin, updateMyWorkspaceName);

// DELETE /api/workspaces/deleteworkspace  (admin+owner only)
router.delete("/deleteworkspace", auth, requireAdmin, deleteMyWorkspace);

export default router;