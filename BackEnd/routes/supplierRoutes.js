import express from "express";
import auth from "../middleware/auth.js";
import {
  createSupplier,
  listSuppliers,
  getSupplierById,
  updateSupplier,
  archiveSupplier,
  autoCompleteSuppliers,
  restoreSupplier,
} from "../controllers/supplierController.js";

const router = express.Router();
router.use(auth);

router.get("/auto-complete", autoCompleteSuppliers);

router.get("/", listSuppliers);
router.post("/", createSupplier);

router.get("/:id", getSupplierById);
router.patch("/:id", updateSupplier);
router.delete("/:id", archiveSupplier);
router.patch("/:id/restore",restoreSupplier)
export default router;